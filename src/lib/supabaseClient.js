
import { createClient } from '@supabase/supabase-js';

// Access environment variables securely
// We will need to create a .env file later with these values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.error('Supabase URL or Anon Key is missing.');
    if (import.meta.env.PROD) {
        alert('시스템 설정 오류: 서버 연결 정보를 찾을 수 없습니다. 관리자에게 문의하세요.');
    }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
    }
});
