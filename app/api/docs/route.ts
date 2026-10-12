import { NextResponse } from "next/server";
import { SWAGGER_UI_CDN } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // The middleware generates a per-request nonce for the CSP it emits and
  // forwards it here so the scripts below can carry the matching attribute.
  const nonce = request.headers.get("x-nonce");
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Zee-Index API — Swagger UI</title>
  <link rel="stylesheet" href="${SWAGGER_UI_CDN}/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; }
    *, *::before, *::after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_UI_CDN}/swagger-ui-bundle.js" crossorigin${nonceAttr}></script>
  <script src="${SWAGGER_UI_CDN}/swagger-ui-standalone-preset.js" crossorigin${nonceAttr}></script>
  <script${nonceAttr}>
    SwaggerUIBundle({
      url: '/api/docs/openapi',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset,
      ],
      plugins: [
        SwaggerUIBundle.plugins.DownloadUrl,
      ],
      layout: "StandaloneLayout",
    });
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
