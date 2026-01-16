
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sffydkaaevgbetzbnxes.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZnlka2FhZXZnYmV0emJueGVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjk0NzcsImV4cCI6MjA4Mjk0NTQ3N30.2N-2o8rN5Rb6yqu9Lfw9OyvX5qr9-7-jMBsd0If-62w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn() {
    const { data, error } = await supabase
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
