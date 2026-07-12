import { z } from "zod";
import { kv } from "@/lib/kv";
import { logger } from "@/lib/logger";
import { sendMail } from "@/lib/mailer";
import { notifyIncidentChannels } from "@/lib/notification";
import { REDIS_KEYS } from "@/lib/constants";
import {
  EVENT_PIPELINE_KEYS,
  type EventStreamRecord,
} from "@/lib/events/pipeline";

export const incidentStatusSchema = z.enum([
  "open",
  "acknowledged",
  "resolved",
]);
export const incidentSeveritySchema = z.enum(["warning", "error", "critical"]);

export type IncidentStatus = z.infer<typeof incidentStatusSchema>;
export type IncidentSeverity = z.infer<typeof incidentSeveritySchema>;

export const incidentRecordSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  fingerprint: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: incidentSeveritySchema,
  status: incidentStatusSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
  lastTriggeredAt: z.number(),
  triggerCount: z.number().int().nonnegative(),
  sourceEventIds: z.array(z.string().min(1)).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  acknowledgedAt: z.number().optional(),
  acknowledgedBy: z.string().optional(),
  resolvedAt: z.number().optional(),
  resolvedBy: z.string().optional(),
  cooldownSeconds: z.number().int().positive(),
});

export type IncidentRecord = z.infer<typeof incidentRecordSchema>;

export interface ListIncidentsOptions {
  limit?: number;
  offset?: number;
  status?: IncidentStatus | "all";
}

export interface EvaluateIncidentResult {
  since: number;
  until: number;
  processedEvents: number;
  createdIncidents: number;
  updatedIncidents: number;
  skippedCooldown: number;
}

const INCIDENT_KEYS = {
  data: "zee-index:incidents:data",
  timeline: "zee-index:incidents:timeline",
  openIndex: "zee-index:incidents:open-index",
  cursor: "zee-index:incidents:last-evaluated-at",
  notifyCooldownPrefix: "zee-index:incidents:notify-cooldown:",
  createCooldownPrefix: "zee-index:incidents:create-cooldown:",
} as const;

const ALERT_AUTH_FAILURE_THRESHOLD = Number(
  process.env.ALERT_AUTH_FAILURE_THRESHOLD || 5,
);
const ALERT_AUTH_FAILURE_WINDOW_MS = Number(
  process.env.ALERT_AUTH_FAILURE_WINDOW_MS || 10 * 60 * 1000,
);
const ALERT_DOWNLOAD_SPIKE_THRESHOLD = Number(
  process.env.ALERT_DOWNLOAD_SPIKE_THRESHOLD || 40,
);
const ALERT_DOWNLOAD_SPIKE_WINDOW_MS = Number(
  process.env.ALERT_DOWNLOAD_SPIKE_WINDOW_MS || 5 * 60 * 1000,
);

const DEFAULT_COOLDOWN_SECONDS = 15 * 60;
const SECURITY_COOLDOWN_SECONDS = 10 * 60;
const DOWNLOAD_COOLDOWN_SECONDS = 5 * 60;

interface IncidentCandidate {
  ruleId: string;
  fingerprint: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  sourceEventIds: string[];
  metadata?: Record<string, unknown>;
  cooldownSeconds?: number;
}

function parseIncident(input: unknown): IncidentRecord | null {
  const parsed = incidentRecordSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

function normalizeUnknownRecord(
  input: unknown,
): Record<string, unknown> | null {
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  return null;
}

function parseEventRecord(input: unknown): EventStreamRecord | null {
  const object = normalizeUnknownRecord(input);
  if (!object) return null;

  const id = typeof object.id === "string" ? object.id : null;
  const type = typeof object.type === "string" ? object.type : null;
  const message = typeof object.message === "string" ? object.message : null;
  const severity =
    object.severity === "info" ||
    object.severity === "warning" ||
    object.severity === "error" ||
    object.severity === "success"
      ? object.severity
      : null;
  const timestamp =
    typeof object.timestamp === "number" && Number.isFinite(object.timestamp)
      ? object.timestamp
      : null;

  if (!id || !type || !message || !severity || timestamp === null) {
    return null;
  }

  return {
    ...object,
    id,
    type: type as EventStreamRecord["type"],
    message,
    severity,
    timestamp,
    source:
      object.source === "activity-log" ||
      object.source === "analytics" ||
      object.source === "system"
        ? object.source
        : "system",
    category:
      object.category === "file" ||
      object.category === "share" ||
      object.category === "folder" ||
      object.category === "auth" ||
      object.category === "security" ||
      object.category === "system" ||
      object.category === "analytics"
        ? object.category
        : "system",
  } as EventStreamRecord;
}

function getPayloadObject(
  event: EventStreamRecord,
): Record<string, unknown> | undefined {
  const payload = (event as { payload?: unknown }).payload;
  if (
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload)
  ) {
    return payload as Record<string, unknown>;
  }
  return undefined;
}

function getEventSubject(event: EventStreamRecord): string {
  const payload = getPayloadObject(event);
  const identifier =
    (typeof payload?.identifier === "string" && payload.identifier) ||
    (typeof payload?.ip === "string" && payload.ip) ||
    event.userEmail ||
    event.userId;
  return identifier || "unknown";
}

async function readIncidentById(id: string): Promise<IncidentRecord | null> {
  const raw = await kv.hget<unknown>(INCIDENT_KEYS.data, id);
  return parseIncident(raw);
}

async function saveIncident(incident: IncidentRecord): Promise<void> {
  await kv.hset(INCIDENT_KEYS.data, { [incident.id]: incident });
}

function getIndexField(ruleId: string, fingerprint: string): string {
  return `${ruleId}:${fingerprint}`;
}

async function collectAdminEmails(): Promise<string[]> {
  const fromEnv = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  let fromRedis: string[] = [];
  try {
    fromRedis = await kv.smembers(REDIS_KEYS.ADMIN_USERS);
  } catch (err) {
    logger.warn(
      { err },
      "[IncidentMonitor] Failed to fetch admin emails from KV",
    );
  }

  return Array.from(
    new Set([...fromEnv, ...fromRedis.map((e) => e.toLowerCase())]),
  );
}

async function notifyIncident(incident: IncidentRecord): Promise<void> {
  const recipients = await collectAdminEmails();
  if (recipients.length === 0) return;

  const cooldownKey = `${INCIDENT_KEYS.notifyCooldownPrefix}${incident.ruleId}:${incident.fingerprint}`;
  const existingCooldown = await kv.get<number>(cooldownKey);
  if (existingCooldown) return;

  const subject = `[Zee-Index Alert] ${incident.severity.toUpperCase()} - ${incident.title}`;
  const html = `
    <h2>${incident.title}</h2>
    <p>${incident.description}</p>
    <ul>
      <li><strong>Severity:</strong> ${incident.severity}</li>
      <li><strong>Status:</strong> ${incident.status}</li>
      <li><strong>Rule:</strong> ${incident.ruleId}</li>
      <li><strong>Triggered:</strong> ${new Date(incident.lastTriggeredAt).toLocaleString("id-ID")}</li>
      <li><strong>Count:</strong> ${incident.triggerCount}</li>
    </ul>
    <p>Open Admin > Security tab untuk acknowledge/resolve incident ini.</p>
  `;

  await sendMail({
    to: recipients,
    subject,
    html,
  });

  await notifyIncidentChannels(incident);

  await kv.set(cooldownKey, Date.now(), {
    ex: incident.cooldownSeconds,
  });
}

async function createOrUpdateIncident(
  candidate: IncidentCandidate,
  now: number,
): Promise<"created" | "updated" | "skipped"> {
  const indexField = getIndexField(candidate.ruleId, candidate.fingerprint);
  const existingOpenId = await kv.hget<string>(
    INCIDENT_KEYS.openIndex,
    indexField,
  );

  if (existingOpenId) {
    const existing = await readIncidentById(existingOpenId);
    if (!existing) {
      await kv.hdel(INCIDENT_KEYS.openIndex, indexField);
    } else {
      const mergedEventIds = Array.from(
        new Set([...existing.sourceEventIds, ...candidate.sourceEventIds]),
      ).slice(-50);

      const updated: IncidentRecord = {
        ...existing,
        title: candidate.title,
        description: candidate.description,
        severity: candidate.severity,
        updatedAt: now,
        lastTriggeredAt: now,
        triggerCount: existing.triggerCount + 1,
        sourceEventIds: mergedEventIds,
        metadata: {
          ...(existing.metadata || {}),
          ...(candidate.metadata || {}),
        },
      };

      await saveIncident(updated);
      return "updated";
    }
  }

  const createCooldownKey = `${INCIDENT_KEYS.createCooldownPrefix}${candidate.ruleId}:${candidate.fingerprint}`;
  const createCooldown = await kv.get<number>(createCooldownKey);
  if (createCooldown) {
    return "skipped";
  }

  const incident: IncidentRecord = {
    id: crypto.randomUUID(),
    ruleId: candidate.ruleId,
    fingerprint: candidate.fingerprint,
    title: candidate.title,
    description: candidate.description,
    severity: candidate.severity,
    status: "open",
    createdAt: now,
    updatedAt: now,
    lastTriggeredAt: now,
    triggerCount: 1,
    sourceEventIds: candidate.sourceEventIds,
    metadata: candidate.metadata,
    cooldownSeconds: candidate.cooldownSeconds || DEFAULT_COOLDOWN_SECONDS,
  };

  await Promise.all([
    saveIncident(incident),
    kv.hset(INCIDENT_KEYS.openIndex, {
      [indexField]: incident.id,
    }),
    kv.zadd(INCIDENT_KEYS.timeline, {
      score: incident.createdAt,
      member: incident.id,
    }),
    kv.set(createCooldownKey, Date.now(), {
      ex: incident.cooldownSeconds,
    }),
  ]);

  await notifyIncident(incident);
  return "created";
}

function makeImmediateCandidates(
  events: EventStreamRecord[],
): IncidentCandidate[] {
  const candidates: IncidentCandidate[] = [];

  for (const event of events) {
    if (event.type === "security:alert") {
      const payload = getPayloadObject(event);
      const reason =
        (typeof payload?.reason === "string" && payload.reason) ||
        event.message;
      candidates.push({
        ruleId: "security_alert_immediate",
        fingerprint: `security:${reason}`,
        title: "Security alert detected",
        description: event.message,
        severity: "critical",
        sourceEventIds: [event.id],
        metadata: {
          reason,
          userEmail: event.userEmail,
        },
        cooldownSeconds: SECURITY_COOLDOWN_SECONDS,
      });
    }

    if (event.type === "storage:warning") {
      candidates.push({
        ruleId: "storage_warning",
        fingerprint: "storage:warning",
        title: "Storage nearing capacity",
        description: event.message,
        severity: "warning",
        sourceEventIds: [event.id],
        metadata: {
          payload: getPayloadObject(event),
        },
        cooldownSeconds: 12 * 60 * 60,
      });
    }

    if (event.type === "system:alert" && event.severity === "error") {
      candidates.push({
        ruleId: "system_alert_error",
        fingerprint: `system:${event.message}`,
        title: "Critical system alert",
        description: event.message,
        severity: "error",
        sourceEventIds: [event.id],
        metadata: {
          userEmail: event.userEmail,
        },
      });
    }
  }

  return candidates;
}

function makeAuthFailureCandidates(
  recentEvents: EventStreamRecord[],
  since: number,
): IncidentCandidate[] {
  const failures = recentEvents.filter(
    (event) => event.type === "auth:failure",
  );
  if (failures.length === 0) return [];

  const grouped = new Map<
    string,
    { count: number; lastTs: number; eventIds: string[]; recentReason?: string }
  >();

  for (const event of failures) {
    const subject = getEventSubject(event);
    const payload = getPayloadObject(event);
    const reason =
      typeof payload?.reason === "string" ? payload.reason : undefined;

    const current = grouped.get(subject) || {
      count: 0,
      lastTs: 0,
      eventIds: [],
      recentReason: undefined,
    };
    current.count += 1;
    current.lastTs = Math.max(current.lastTs, event.timestamp);
    current.eventIds.push(event.id);
    current.recentReason = reason || current.recentReason;
    grouped.set(subject, current);
  }

  const candidates: IncidentCandidate[] = [];
  grouped.forEach((value, subject) => {
    if (value.count < ALERT_AUTH_FAILURE_THRESHOLD) return;
    if (value.lastTs < since) return;

    candidates.push({
      ruleId: "auth_failure_burst",
      fingerprint: `auth-failure:${subject}`,
      title: "Auth failure burst",
      description: `${value.count} auth failures detected in the last ${Math.round(ALERT_AUTH_FAILURE_WINDOW_MS / 60000)} minutes for ${subject}.`,
      severity: "error",
      sourceEventIds: value.eventIds.slice(-25),
      metadata: {
        subject,
        count: value.count,
        reason: value.recentReason,
      },
      cooldownSeconds: SECURITY_COOLDOWN_SECONDS,
    });
  });

  return candidates;
}

function makeDownloadSpikeCandidate(
  recentEvents: EventStreamRecord[],
  since: number,
): IncidentCandidate[] {
  const downloads = recentEvents.filter(
    (event) => event.type === "file:download",
  );
  if (downloads.length < ALERT_DOWNLOAD_SPIKE_THRESHOLD) return [];

  const hasNewDownload = downloads.some((event) => event.timestamp >= since);
  if (!hasNewDownload) return [];

  const latestTs = downloads.reduce(
    (maxTs, event) => Math.max(maxTs, event.timestamp),
    0,
  );

  return [
    {
      ruleId: "download_spike_global",
      fingerprint: "download-spike:global",
      title: "Download spike detected",
      description: `${downloads.length} downloads detected in the last ${Math.round(ALERT_DOWNLOAD_SPIKE_WINDOW_MS / 60000)} minutes.`,
      severity: "warning",
      sourceEventIds: downloads.slice(-50).map((event) => event.id),
      metadata: {
        count: downloads.length,
        latestTs,
      },
      cooldownSeconds: DOWNLOAD_COOLDOWN_SECONDS,
    },
  ];
}

export async function evaluateIncidentRules(): Promise<EvaluateIncidentResult> {
  const now = Date.now();
  const previousCursorRaw = await kv.get<number>(INCIDENT_KEYS.cursor);
  const previousCursor =
    typeof previousCursorRaw === "number" && Number.isFinite(previousCursorRaw)
      ? previousCursorRaw
      : now - 5 * 60 * 1000;
  const since = previousCursor + 1;

  const [rawNewEvents, rawRecentAuthEvents, rawRecentDownloadEvents] =
    await Promise.all([
      kv.zrange<unknown>(EVENT_PIPELINE_KEYS.eventStream, since, now, {
        byScore: true,
      }),
      kv.zrange<unknown>(
        EVENT_PIPELINE_KEYS.eventStream,
        now - ALERT_AUTH_FAILURE_WINDOW_MS,
        now,
        { byScore: true },
      ),
      kv.zrange<unknown>(
        EVENT_PIPELINE_KEYS.eventStream,
        now - ALERT_DOWNLOAD_SPIKE_WINDOW_MS,
        now,
        { byScore: true },
      ),
    ]);

  const newEvents = rawNewEvents
    .map(parseEventRecord)
    .filter((e): e is EventStreamRecord => e !== null);
  const recentAuthEvents = rawRecentAuthEvents
    .map(parseEventRecord)
    .filter((e): e is EventStreamRecord => e !== null);
  const recentDownloadEvents = rawRecentDownloadEvents
    .map(parseEventRecord)
    .filter((e): e is EventStreamRecord => e !== null);

  const candidates: IncidentCandidate[] = [
    ...makeImmediateCandidates(newEvents),
    ...makeAuthFailureCandidates(recentAuthEvents, since),
    ...makeDownloadSpikeCandidate(recentDownloadEvents, since),
  ];

  let createdIncidents = 0;
  let updatedIncidents = 0;
  let skippedCooldown = 0;

  for (const candidate of candidates) {
    try {
      const result = await createOrUpdateIncident(candidate, now);
      if (result === "created") createdIncidents += 1;
      else if (result === "updated") updatedIncidents += 1;
      else skippedCooldown += 1;
    } catch (err) {
      logger.error(
        { err, ruleId: candidate.ruleId },
        "[IncidentMonitor] Failed to process incident candidate",
      );
    }
  }

  await kv.set(INCIDENT_KEYS.cursor, now);

  return {
    since,
    until: now,
    processedEvents: newEvents.length,
    createdIncidents,
    updatedIncidents,
    skippedCooldown,
  };
}

export async function listIncidents(
  options: ListIncidentsOptions = {},
): Promise<{ incidents: IncidentRecord[]; total: number; openCount: number }> {
  const limit = Math.max(1, Math.min(options.limit || 50, 200));
  const offset = Math.max(0, options.offset || 0);
  const statusFilter = options.status || "all";

  const ids = await kv.zrange<string>(
    INCIDENT_KEYS.timeline,
    offset,
    offset + limit - 1,
    { rev: true },
  );

  const incidents: IncidentRecord[] = [];
  for (const id of ids) {
    const incident = await readIncidentById(id);
    if (!incident) continue;
    if (statusFilter !== "all" && incident.status !== statusFilter) {
      continue;
    }
    incidents.push(incident);
  }

  const [total, openCount] = await Promise.all([
    kv.zcard(INCIDENT_KEYS.timeline),
    kv
      .hgetall<Record<string, string>>(INCIDENT_KEYS.openIndex)
      .then((data) => (data ? Object.keys(data).length : 0)),
  ]);

  return { incidents, total, openCount };
}

export async function updateIncidentStatus(params: {
  id: string;
  status: IncidentStatus;
  actor?: string;
}): Promise<IncidentRecord | null> {
  const incident = await readIncidentById(params.id);
  if (!incident) {
    return null;
  }

  const now = Date.now();
  const updated: IncidentRecord = {
    ...incident,
    status: params.status,
    updatedAt: now,
  };

  if (params.status === "acknowledged") {
    updated.acknowledgedAt = now;
    updated.acknowledgedBy = params.actor;
  }

  const indexField = getIndexField(incident.ruleId, incident.fingerprint);
  if (params.status === "resolved") {
    updated.resolvedAt = now;
    updated.resolvedBy = params.actor;
    await kv.hdel(INCIDENT_KEYS.openIndex, indexField);
  } else {
    await kv.hset(INCIDENT_KEYS.openIndex, {
      [indexField]: incident.id,
    });
  }

  await saveIncident(updated);
  return updated;
}
