
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sffydkaaevgbetzbnxes.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZnlka2FhZXZnYmV0emJueGVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjk0NzcsImV4cCI6MjA4Mjk0NTQ3N30.2N-2o8rN5Rb6yqu9Lfw9OyvX5qr9-7-jMBsd0If-62w';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verify() {
    console.log('Verifying DB Access via RPC...');

    const { data, error } = await supabase.rpc('get_public_members');

    if (error) {
        console.error('Error fetching members via RPC:', error);
        return;
    }
    console.log('Members found via RPC:', data.length);
    console.log('Sample members:', data.map(m => m.name).join(', '));
}

verify();
