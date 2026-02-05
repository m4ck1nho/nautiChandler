import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') as EmailOtpType | null;
    const next = searchParams.get('next') ?? '/';

    console.log(`[Auth Confirm] Initialized. Type: ${type}, Origin: ${origin}, Next: ${next}`);

    if (token_hash && type) {
        const supabase = await createClient();

        console.log(`[Auth Confirm] Verifying OTP for type: ${type}`);
        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        });

        if (!error) {
            console.log('[Auth Confirm] OTP verified successfully.');
            // Redirect to the "next" path
            const redirectTo = new URL(request.url);
            redirectTo.pathname = next;
            redirectTo.searchParams.delete('token_hash');
            redirectTo.searchParams.delete('type');
            redirectTo.searchParams.delete('next');
            return NextResponse.redirect(redirectTo);
        } else {
            console.error('[Auth Confirm] OTP verification error:', error.message, error.status);

            // Resilience: Check if we are already authenticated.
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                console.log('[Auth Confirm] User already authenticated or confirmed. Redirecting to target.');
                const redirectTo = new URL(request.url);
                redirectTo.pathname = next;
                redirectTo.searchParams.delete('token_hash');
                redirectTo.searchParams.delete('type');
                redirectTo.searchParams.delete('next');
                return NextResponse.redirect(redirectTo);
            }

            // Error Page
            const redirectTo = new URL(request.url);
            redirectTo.pathname = '/auth/auth-code-error';
            redirectTo.searchParams.set('error', error.message);
            if (error.status) redirectTo.searchParams.set('error_code', error.status.toString());
            return NextResponse.redirect(redirectTo);
        }
    } else {
        console.warn('[Auth Confirm] Missing token_hash or type in request.');
    }

    const redirectTo = new URL(request.url);
    redirectTo.pathname = '/auth/auth-code-error';
    redirectTo.searchParams.set('error', 'Missing token or type');
    return NextResponse.redirect(redirectTo);
}
