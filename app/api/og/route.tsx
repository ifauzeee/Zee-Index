import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title") || "Zee Index";
    const appName = process.env.NEXT_PUBLIC_APP_NAME || "Zee Index";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#09090b",
            backgroundImage:
              "radial-gradient(circle at 50% 50%, #18181b 0%, #09090b 100%)",
            color: "white",
            padding: "80px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100px",
              height: "100px",
              borderRadius: "24px",
              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              marginBottom: "40px",
              boxShadow: "0 20px 50px rgba(59, 130, 246, 0.3)",
            }}
          >
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div
            style={{
              fontSize: "64px",
              fontWeight: "900",
              textAlign: "center",
              lineHeight: "1.1",
              marginBottom: "20px",
              maxWidth: "1000px",
              letterSpacing: "-0.05em",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: "500",
              color: "#a1a1aa",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {appName}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "40px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#52525b",
              fontSize: "18px",
            }}
          >
            <span>High-Performance File Explorer</span>
            <div
              style={{
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                backgroundColor: "#3f3f46",
              }}
            />
            <span>Secure Cloud Access</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
