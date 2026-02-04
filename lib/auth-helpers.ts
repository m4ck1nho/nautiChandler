import { getSupabase } from './supabase';

export async function signInWithGoogle() {
    const supabase = getSupabase();
    if (!supabase) return { error: { message: 'Supabase not initialized' } };

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
        },
    });

    return { data, error };
}

export async function signOut() {
    const supabase = getSupabase();
    if (!supabase) return { error: { message: 'Supabase not initialized' } };

    const { error } = await supabase.auth.signOut();
    return { error };
}
