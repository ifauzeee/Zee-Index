export async function sendWebhookNotification(event: string, details: any) {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `**Event:** ${event}\n**Details:** ${JSON.stringify(details, null, 2)}`,
        username: "Zee-Index Bot",
      }),
    });
  } catch (error) {
    console.error(error);
  }
}
