import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const { searchParams } = url;

    // Determine the public origin. Railway/proxies set x-forwarded headers.
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
    const proto = request.headers.get('x-forwarded-proto') || (url.protocol.replace(':', '')) || 'https';
    const origin = `${proto}://${host}`;

    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    // Check for errors returned directly from the provider
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const errorCode = searchParams.get('error_code');

    console.log(`[Auth Callback] Initialized. URL: ${request.url}`);

    if (error) {
        console.error(`[Auth Callback] Provider returned error: ${error}, Description: ${errorDescription}, Code: ${errorCode}`);
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(errorDescription || error)}&error_code=${errorCode || ''}`);
    }

    if (code) {
        console.log('[Auth Callback] Code received. Exchanging for session...');
        const supabase = await createClient();

        try {
            const { error } = await supabase.auth.exchangeCodeForSession(code);

            if (!error) {
                console.log('[Auth Callback] Session established successfully.');
                return handleSuccessRedirect(request, origin, next);
            } else {
                console.error('[Auth Callback] Session exchange failed:', error.message, error.status);

                // Resilience: Check if we already have a session (Double Consumption Fix)
                // This happens often with strict mode or some email scanners
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    console.log('[Auth Callback] Recovered: User already authenticated. Proceeding as success.');
                    return handleSuccessRedirect(request, origin, next);
                }

                const errorMessage = encodeURIComponent(error.message);
                const errorCode = error.status ? `&error_code=${error.status}` : '';
                return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${errorMessage}${errorCode}`);
            }
        } catch (err) {
            console.error('[Auth Callback] Unexpected error during exchange:', err);
            // Last resort recovery check
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                console.log('[Auth Callback] Recovered from unexpected error: User already authenticated.');
                return handleSuccessRedirect(request, origin, next);
            }
            return NextResponse.redirect(`${origin}/auth/auth-code-error?error=Unexpected+error`);
        }
    } else {
        console.warn('[Auth Callback] No code found in search parameters.');
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=No+code+provided`);
    }
}

function handleSuccessRedirect(request: Request, origin: string, next: string) {
    // Simplified redirect logic to rely on the origin calculated from request.url
    // This is safer than relying on x-forwarded-host which can vary between environments indiscriminately
    // unless strictly configured.
    console.log(`[Auth Callback] Redirecting to: ${origin}${next}`);
    return NextResponse.redirect(`${origin}${next}`);
}
