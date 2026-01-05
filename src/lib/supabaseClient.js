
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

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL ERROR: Supabase URL or Anon Key is missing! Check your .env file.');
    alert('시스템 설정 오류: 서버 연결 정보를 찾을 수 없습니다. 관리자에게 문의하세요.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false, // Changed to false to prevent storage hanging issues
        autoRefreshToken: true,
        detectSessionInUrl: false // Disable URL hash parsing
    }
});
