-- Admin can view private work plans in AdminWorkPlanCheck
-- Date: 2026-02-23

-- 1) Admin-only member list for the admin work-plan page
CREATE OR REPLACE FUNCTION public.get_all_members_for_admin()
RETURNS TABLE (
    id UUID,
    name TEXT,
    branch TEXT,
    certificates TEXT[],
    is_public_todo BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can access this function';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.branch,
        ARRAY_AGG(co.name ORDER BY co.name) FILTER (WHERE co.name IS NOT NULL) AS certificates,
        COALESCE(p.is_public_todo, false) AS is_public_todo
    FROM public.profiles p
    LEFT JOIN public.user_certificates uc ON p.id = uc.user_id
    LEFT JOIN public.certificate_options co ON uc.certificate_id = co.id
    GROUP BY p.id, p.name, p.branch, p.is_public_todo
    ORDER BY p.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_members_for_admin() TO authenticated;

-- 2) Admins can read all daily_todos, while members still only read public todos of others
DROP POLICY IF EXISTS "Users can view public todos of others" ON public.daily_todos;

CREATE POLICY "Users can view public todos of others"
ON public.daily_todos
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
    )
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = daily_todos.user_id
          AND p.is_public_todo = true
    )
);
