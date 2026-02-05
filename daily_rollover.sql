-- Function to perform daily rollover of incomplete todos
-- Meant to be called by the client (Lazy Trigger) when the user logs in
CREATE OR REPLACE FUNCTION perform_daily_rollover(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    today_date DATE;
    yesterday_date DATE;
    source_todo RECORD;
    inserted_count INT := 0;
BEGIN
    -- 1. Determine dates (Korea Time)
    -- We assume the server might is UTC, so we shift to KST (+9) to define "Today"
    -- However, the client calls this, so it's safer if the client passes the date, OR we respect the user's timezone context.
    -- For simplicity and consistency with the request "5 AM KST", we'll use a fixed offset if possible, 
    -- but usually 'current_date' in DB depends on server config.
    -- Let's stick to standard ISO dates generated from the logic.
    
    -- "Today" relative to KST
    today_date := (now() AT TIME ZONE 'Asia/Seoul')::DATE;
    
    -- If current time in KST is before 5 AM, "Today" for rollover purposes is technically "Yesterday" (we don't rollover yet).
    -- Wait, the user said "At 5 AM... if user failed yesterday... copy to next day".
    -- So if it's 4 AM on Feb 5th, we shouldn't copy Feb 4th tasks yet? Or maybe we should?
    -- Usually "Daily" implies the date has changed. 
    -- Let's stick to strict Date rollover. If it is Feb 5th (KST), we copy incomplete from Feb 4th.
    -- The "5 AM" requirement implies the "Day" effectively starts at 5 AM. 
    -- So if it is 01:00 AM Feb 5th, it is still "Feb 4th night" for the user.
    
    IF (EXTRACT(HOUR FROM (now() AT TIME ZONE 'Asia/Seoul')) < 5) THEN
        today_date := today_date - 1;
    END IF;

    yesterday_date := today_date - 1;

    -- 2. Check if we already did rollover for THIS user for THIS day
    -- We need a way to track idempotency. 
    -- We can check if any todo exists for 'today' that was created via rollover from 'yesterday'.
    -- But what if the user deleted them? We shouldn't Copy again.
    -- So we need a log table OR we just check if there are ANY todos for today? 
    -- No, user might have added some manually.
    
    -- OPTION: We assume if there are *any* tasks for today, we might have already done it? No.
    -- Let's filter by a specific tag or just simply check if the tasks from Yesterday exist in Today.
    
    -- Better approach for "Lazy" load without extra tables:
    -- Select incomplete tasks from yesterday.
    -- For each task, check if a task with SAME content exists for today.
    -- If not, insert it.
    
    FOR source_todo IN 
        SELECT * FROM daily_todos 
        WHERE user_id = target_user_id 
        AND date = yesterday_date
        AND is_completed = false
    LOOP
        -- Check duplicate by content for today
        PERFORM 1 FROM daily_todos
        WHERE user_id = target_user_id
        AND date = today_date
        AND content = source_todo.content;
        
        IF NOT FOUND THEN
            INSERT INTO daily_todos (user_id, content, date, is_completed, created_at, updated_at)
            VALUES (target_user_id, source_todo.content, today_date, false, now(), now());
            
            inserted_count := inserted_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'rolled_over_date', today_date,
        'source_date', yesterday_date,
        'count', inserted_count
    );
END;
$$;
