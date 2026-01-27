-- Create incoming_employees table
CREATE TABLE IF NOT EXISTS public.incoming_employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    seat_number INTEGER NOT NULL,
    entry_date DATE NOT NULL,
    content TEXT,
    is_prepared BOOLEAN DEFAULT FALSE
);

-- Add RLS policies (adjust as needed, currently allowing public access for simplicity based on existing pattern)
ALTER TABLE public.incoming_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON public.incoming_employees
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON public.incoming_employees
    FOR SELECT USING (true);
    
-- Ensure the table is accessible
GRANT ALL ON TABLE public.incoming_employees TO anon;
GRANT ALL ON TABLE public.incoming_employees TO authenticated;
GRANT ALL ON TABLE public.incoming_employees TO service_role;
