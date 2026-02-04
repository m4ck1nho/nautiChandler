import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in search params, use it as the redirection URL
    const next = searchParams.get('next') ?? '/';

    if (code) {
        console.log('OAuth redirect: Received code, exchanging for session...');
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            console.log('OAuth redirect: Success! Session established.');
            const forwardedHost = request.headers.get('x-forwarded-host'); // Hello, Vercel
            const isLocalEnv = process.env.NODE_ENV === 'development';

            if (isLocalEnv) {
                console.log(`OAuth redirect: Local env, redirecting to ${origin}${next}`);
                return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                console.log(`OAuth redirect: Vercel env, redirecting to https://${forwardedHost}${next}`);
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                console.log(`OAuth redirect: Production/Other env, redirecting to ${origin}${next}`);
                return NextResponse.redirect(`${origin}${next}`);
            }
        } else {
            console.error('OAuth redirect: Exchange error:', error.message);
        }
    } else {
        console.warn('OAuth redirect: No code found in search params.');
    }

    // return the user to an error page with instructions
    console.log(`OAuth redirect: Final fallback, redirecting to ${origin}/auth/auth-code-error`);
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
