
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import type { ShareLink } from '@/lib/store';
import { jwtVerify } from 'jose';

const SHARE_LINKS_KEY = 'zee-index:share-links';

export async function POST(req: NextRequest) {
  try {
    const { shareToken } = await req.json();
    if (!shareToken) return new Response(null, { status: 204 });

    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(shareToken, secret);
    const jti = payload.jti;

    if (!jti) return new Response(null, { status: 204 });

    const existingLinks: ShareLink[] = await kv.get(SHARE_LINKS_KEY) || [];
    let linkFound = false;

    const updatedLinks = existingLinks.map(link => {
      if (link.jti === jti) {
        linkFound = true;
        return { ...link, viewCount: (link.viewCount || 0) + 1 };
      }
      return link;
    });

    if (linkFound) {
      await kv.set(SHARE_LINKS_KEY, updatedLinks);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    
    console.error('Share link tracking error:', error);
    return new Response(null, { status: 204 });
  }
}