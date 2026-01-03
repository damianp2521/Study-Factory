
import { createClient } from '@supabase/supabase-js';

// Access environment variables securely
// We will need to create a .env file later with these values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase Config:', {
    url: supabaseUrl,
    keyLength: supabaseAnonKey?.length,
    keyStart: supabaseAnonKey?.substring(0, 10)
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
