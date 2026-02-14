
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

const supabaseUrl =
    process.env.SUPABASE_URL ||
    readEnvValue('SUPABASE_URL') ||
    process.env.VITE_SUPABASE_URL ||
    readEnvValue('VITE_SUPABASE_URL');

const supabaseKey =
    process.env.SUPABASE_ANON_KEY ||
    readEnvValue('SUPABASE_ANON_KEY') ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    readEnvValue('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env values. Set SUPABASE_URL/SUPABASE_ANON_KEY or VITE_SUPABASE_*.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn() {
    const { error } = await supabase
        .from('staff_todos')
        .select('branch')
        .limit(1);

    if (error) {
        console.log('Error/Missing:', error.message);
    } else {
        console.log('Column exists.');
    }
}

checkColumn();
