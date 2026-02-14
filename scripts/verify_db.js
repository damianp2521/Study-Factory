
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const readEnvValue = (key) => {
    const direct = process.env[key];
    if (direct) return direct;

    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const envText = fs.readFileSync(envPath, 'utf8');
        const line = envText.split(/\r?\n/).find((row) => row.startsWith(`${key}=`));
        return line ? line.slice(key.length + 1) : null;
    } catch {
        return null;
    }
};

const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    readEnvValue('SUPABASE_URL') ||
    process.env.VITE_SUPABASE_URL ||
    readEnvValue('VITE_SUPABASE_URL');

const SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY ||
    readEnvValue('SUPABASE_ANON_KEY') ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    readEnvValue('VITE_SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase env values. Set SUPABASE_URL/SUPABASE_ANON_KEY or VITE_SUPABASE_*.');
    process.exit(1);
}

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
