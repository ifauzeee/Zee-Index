import { getAccessToken, invalidateAccessToken } from "./auth";

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 5,
  delay = 1000,
): Promise<Response> {
  const originalHeaders = new Headers(options.headers);

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      if (response.status === 404) {
        return response;
      }

      if (response.status === 401) {
        await invalidateAccessToken();
        const newToken = await getAccessToken();
        originalHeaders.set("Authorization", `Bearer ${newToken}`);
        options.headers = originalHeaders;
        continue;
      }

      if (response.status === 429 || response.status >= 500) {
        await new Promise((res) => setTimeout(res, delay * Math.pow(2, i)));
        continue;
      }

      return response;
    } catch (error: unknown) {
      if (i === retries - 1) throw error;
      await new Promise((res) => setTimeout(res, delay * Math.pow(2, i)));
    }
  }
  throw new Error("Gagal melakukan fetch setelah beberapa kali percobaan.");
}
