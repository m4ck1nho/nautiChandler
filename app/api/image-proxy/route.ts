import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

// HTTPS agent to handle SSL
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Browser-like headers for image requests
const imageHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://nautichandler.com/',
  'Connection': 'keep-alive',
};

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Only allow nautichandler.com images
  if (!imageUrl.includes('nautichandler.com')) {
    return NextResponse.json({ error: 'Invalid image source' }, { status: 403 });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: imageHeaders,
      // @ts-ignore - Next.js specific option
      agent: httpsAgent,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    
    // Return a placeholder SVG on error
    const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect fill="#f1f5f9" width="100" height="100"/>
      <text x="50" y="55" text-anchor="middle" fill="#14b8a6" font-size="30">⚓</text>
    </svg>`;
    
    return new NextResponse(placeholderSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
}
