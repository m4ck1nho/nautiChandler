import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') as EmailOtpType | null;
    const next = searchParams.get('next') ?? '/';

    console.log(`[Auth Confirm] Initialized. Type: ${type}, Origin: ${origin}, Next: ${next}`);

    const redirectTo = request.nextUrl.clone();
    redirectTo.pathname = next;
    redirectTo.searchParams.delete('token_hash');
    redirectTo.searchParams.delete('type');

    if (token_hash && type) {
        const supabase = await createClient();

        console.log(`[Auth Confirm] Verifying OTP for type: ${type}`);
        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        });

        if (!error) {
            console.log('[Auth Confirm] OTP verified successfully.');
            redirectTo.searchParams.delete('next');
            return NextResponse.redirect(redirectTo);
        } else {
            console.error('[Auth Confirm] OTP verification error:', error.message, error.status);

            // Resilience: If the error is about a stale/used token, but the user can still be fetched, 
            // it likely means the scanner already consumed it.
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                console.log('[Auth Confirm] User already authenticated or confirmed by scanner. Redirecting home.');
                redirectTo.pathname = '/';
                return NextResponse.redirect(redirectTo);
            }
        }
    } else {
        console.warn('[Auth Confirm] Missing token_hash or type in request.');
    }

    // return the user to an error page with some instructions
    console.warn(`[Auth Confirm] Redirecting to error page: ${origin}/auth/auth-code-error`);
    redirectTo.pathname = '/auth/auth-code-error';
    return NextResponse.redirect(redirectTo);
}
