-- Create a type for the response if needed, or just return TABLE
CREATE OR REPLACE FUNCTION get_public_members()
RETURNS TABLE (
    id UUID,
    name TEXT,
    branch TEXT,
    certificates TEXT[]
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.branch,
        ARRAY_AGG(co.name) FILTER (WHERE co.name IS NOT NULL) as certificates
    FROM public.profiles p
    LEFT JOIN public.user_certificates uc ON p.id = uc.user_id
    LEFT JOIN public.certificate_options co ON uc.certificate_id = co.id
    WHERE p.is_public_todo = true
    GROUP BY p.id, p.name, p.branch
    ORDER BY p.name;
END;
$$ LANGUAGE plpgsql;
