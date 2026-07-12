import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatIncidentNotification,
  getNotificationChannelStatus,
  isDiscordNotificationEnabled,
  isTelegramNotificationEnabled,
  notifyIncidentChannels,
  sendDiscordNotification,
  sendTelegramNotification,
} from "@/lib/notification";
import type { IncidentRecord } from "@/lib/incident-monitor";

const makeIncident = (): IncidentRecord => ({
  id: "inc-1",
  ruleId: "auth_failure_burst",
  fingerprint: "auth-failure:1.2.3.4",
  title: "Auth failure burst",
  description: "5 auth failures detected.",
  severity: "error",
  status: "open",
  createdAt: 1000,
  updatedAt: 1000,
  lastTriggeredAt: 1000,
  triggerCount: 5,
  sourceEventIds: ["e1"],
  cooldownSeconds: 600,
});

describe("lib/notification", () => {
  const originalEnv = { ...process.env };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    delete process.env.NOTIFY_DISCORD_WEBHOOK;
    delete process.env.NOTIFY_TELEGRAM_BOT_TOKEN;
    delete process.env.NOTIFY_TELEGRAM_CHAT_ID;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reports no channels enabled when env unset", () => {
    expect(isDiscordNotificationEnabled()).toBe(false);
    expect(isTelegramNotificationEnabled()).toBe(false);
    expect(getNotificationChannelStatus()).toEqual({
      discord: false,
      telegram: false,
    });
  });

  it("formats incident notification with severity and metadata", () => {
    const text = formatIncidentNotification(makeIncident());
    expect(text).toContain("*Severity:* ERROR");
    expect(text).toContain("*Incident:* Auth failure burst");
    expect(text).toContain("*Rule:* auth_failure_burst");
    expect(text).toContain("*Count:* 5");
  });

  it("does not call fetch when no channels configured", async () => {
    await notifyIncidentChannels(makeIncident());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends Discord notification when webhook set", async () => {
    process.env.NOTIFY_DISCORD_WEBHOOK = "https://discord.example/webhook";
    await sendDiscordNotification("hello");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://discord.example/webhook");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body).content).toBe("hello");
  });

  it("sends Telegram notification to each chat id", async () => {
    process.env.NOTIFY_TELEGRAM_BOT_TOKEN = "secret-token";
    process.env.NOTIFY_TELEGRAM_CHAT_ID = "chat1, chat2";
    await sendTelegramNotification("hi");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [url, init] of fetchMock.mock.calls) {
      expect(url).toBe("https://api.telegram.org/botsecret-token/sendMessage");
      expect(init.method).toBe("POST");
      const body = JSON.parse(init.body);
      expect(body.text).toBe("hi");
      expect(body.parse_mode).toBe("Markdown");
      expect(["chat1", "chat2"]).toContain(body.chat_id);
    }
  });

  it("notifies all configured channels via notifyIncidentChannels", async () => {
    process.env.NOTIFY_DISCORD_WEBHOOK = "https://discord.example/webhook";
    process.env.NOTIFY_TELEGRAM_BOT_TOKEN = "secret-token";
    process.env.NOTIFY_TELEGRAM_CHAT_ID = "chat1";
    await notifyIncidentChannels(makeIncident());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("logs and swallows errors without throwing", async () => {
    process.env.NOTIFY_DISCORD_WEBHOOK = "https://discord.example/webhook";
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(sendDiscordNotification("x")).resolves.toBeUndefined();
  });
});
