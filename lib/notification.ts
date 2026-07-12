import { logger } from "@/lib/logger";
import type { IncidentRecord } from "@/lib/incident-monitor";

function getDiscordWebhook(): string | undefined {
  const url = process.env.NOTIFY_DISCORD_WEBHOOK?.trim();
  return url || undefined;
}

function getTelegramConfig(): { token: string; chats: string[] } | undefined {
  const token = process.env.NOTIFY_TELEGRAM_BOT_TOKEN?.trim();
  const rawChats = process.env.NOTIFY_TELEGRAM_CHAT_ID?.trim();
  if (!token || !rawChats) return undefined;

  const chats = rawChats
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (chats.length === 0) return undefined;

  return { token, chats };
}

export function isDiscordNotificationEnabled(): boolean {
  return !!getDiscordWebhook();
}

export function isTelegramNotificationEnabled(): boolean {
  return !!getTelegramConfig();
}

export function getNotificationChannelStatus(): {
  discord: boolean;
  telegram: boolean;
} {
  return {
    discord: isDiscordNotificationEnabled(),
    telegram: isTelegramNotificationEnabled(),
  };
}

export async function sendDiscordNotification(content: string): Promise<void> {
  const webhook = getDiscordWebhook();
  if (!webhook) return;

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      logger.error(
        { status: res.status },
        "[Notify] Discord webhook returned non-OK response",
      );
    }
  } catch (err) {
    logger.error({ err }, "[Notify] Failed to send Discord notification");
  }
}

export async function sendTelegramNotification(text: string): Promise<void> {
  const cfg = getTelegramConfig();
  if (!cfg) return;

  const url = `https://api.telegram.org/bot${cfg.token}/sendMessage`;
  await Promise.allSettled(
    cfg.chats.map(async (chatId) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "Markdown",
          }),
        });
        if (!res.ok) {
          logger.error(
            { status: res.status, chatId },
            "[Notify] Telegram send returned non-OK response",
          );
        }
      } catch (err) {
        logger.error(
          { err, chatId },
          "[Notify] Failed to send Telegram notification",
        );
      }
    }),
  );
}

export function formatIncidentNotification(incident: IncidentRecord): string {
  const triggered = new Date(incident.lastTriggeredAt).toISOString();
  return [
    "🚨 *Zee-Index Alert*",
    `*Severity:* ${incident.severity.toUpperCase()}`,
    `*Incident:* ${incident.title}`,
    incident.description,
    `*Rule:* ${incident.ruleId}`,
    `*Status:* ${incident.status}`,
    `*Triggered:* ${triggered}`,
    `*Count:* ${incident.triggerCount}`,
  ].join("\n");
}

export async function notifyIncidentChannels(
  incident: IncidentRecord,
): Promise<void> {
  if (!isDiscordNotificationEnabled() && !isTelegramNotificationEnabled()) {
    return;
  }

  const message = formatIncidentNotification(incident);
  await Promise.allSettled([
    sendDiscordNotification(message),
    sendTelegramNotification(message),
  ]);
}
