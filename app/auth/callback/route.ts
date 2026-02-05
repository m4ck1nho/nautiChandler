import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in search params, use it as the redirection URL
    const next = searchParams.get('next') ?? '/';

    console.log(`[Auth Callback] Initialized. Origin: ${origin}, Next: ${next}`);

    if (code) {
        console.log('[Auth Callback] Code received. Exchanging for session...');
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            console.log('[Auth Callback] Session established successfully.');
            return handleSuccessRedirect(request, origin, next);
        } else {
            console.error('[Auth Callback] Session exchange failed:', error.message, error.status);

            // Resilience: Check if we already have a session (e.g. code already consumed)
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                console.log('[Auth Callback] Recovered: User already authenticated. Proceeding as success.');
                return handleSuccessRedirect(request, origin, next);
            }
        }
    } else {
        console.warn('[Auth Callback] No code found in search parameters.');
    }

    // return the user to an error page with instructions
    console.log(`[Auth Callback] Redirecting to error page: ${origin}/auth/auth-code-error`);
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

function handleSuccessRedirect(request: Request, origin: string, next: string) {
    const forwardedHost = request.headers.get('x-forwarded-host'); // Hello, Vercel
    const isLocalEnv = process.env.NODE_ENV === 'development';

    if (isLocalEnv) {
        console.log(`[Auth Callback] Local environment. Redirecting to: ${origin}${next}`);
        return NextResponse.redirect(`${origin}${next}`);
    } else if (forwardedHost) {
        console.log(`[Auth Callback] Vercel environment (forwarded). Redirecting to: https://${forwardedHost}${next}`);
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
    } else {
        console.log(`[Auth Callback] Production/Other environment. Redirecting to: ${origin}${next}`);
        return NextResponse.redirect(`${origin}${next}`);
    }
}
