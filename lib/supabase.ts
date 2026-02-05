import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Create client only if credentials are available
let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  // Check env vars dynamically on each call to ensure they're available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    // Only log once to avoid spam
    if (!supabaseInstance) {
      console.error('Supabase env vars missing:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        urlValue: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'empty',
        keyValue: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'empty',
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE')),
      });
    }
    return null;
  }

  if (!supabaseInstance) {
    console.log('Initializing Supabase client with URL:', supabaseUrl.substring(0, 30) + '...');
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        flowType: 'pkce',
      },
    });
  }
  return supabaseInstance;
};

// For backward compatibility - lazy initialization
export const supabase = {
  from: (table: string) => {
    const client = getSupabase();
    if (!client) {
      console.warn('Supabase client not initialized - missing env vars');
      // Return a mock that returns empty results
      return {
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        update: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        delete: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      };
    }
    return client.from(table);
  },
};

// Type definitions for our database tables
export interface CartItemRow {
  id: string;
  session_id: string;
  product_title: string;
  product_price: string;
  product_image: string;
  product_link: string | null;
  quantity: number;
  created_at: string;
}
