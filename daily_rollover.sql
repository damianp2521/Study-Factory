-- Function to perform daily rollover of incomplete todos
-- Meant to be called by the client (Lazy Trigger) when the user logs in
CREATE OR REPLACE FUNCTION perform_daily_rollover(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    today_date DATE;
    last_active_date DATE;
    target_date DATE;
    source_date DATE;
    source_todo RECORD;
    inserted_count INT := 0;
    daily_inserted_count INT;
BEGIN
    -- 1. Determine "Today" in KST (Korean Standard Time)
    today_date := (now() AT TIME ZONE 'Asia/Seoul')::DATE;
    
    -- If current time in KST is before 5 AM, "Today" for rollover purposes is technically "Yesterday"
    IF (EXTRACT(HOUR FROM (now() AT TIME ZONE 'Asia/Seoul')) < 5) THEN
        today_date := today_date - 1;
    END IF;

    -- 2. Find the last date the user had ANY todos
    SELECT MAX(date) INTO last_active_date
    FROM daily_todos
    WHERE user_id = target_user_id;

    -- If no history, nothing to rollover
    IF last_active_date IS NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'No history found');
    END IF;

    -- If last active date is today or future, nothing to do
    IF last_active_date >= today_date THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already up to date');
    END IF;

    -- 3. Loop from (last_active_date + 1) to today_date
    -- This "fills in the gaps" day by day
    target_date := last_active_date + 1;
    
    WHILE target_date <= today_date LOOP
        source_date := target_date - 1;
        daily_inserted_count := 0;

        -- For each day, copy incomplete tasks from the previous day (source_date) to current day (target_date)
        FOR source_todo IN 
            SELECT * FROM daily_todos 
            WHERE user_id = target_user_id 
            AND date = source_date
            AND is_completed = false
        LOOP
            -- Check duplicate by content for target_date to avoid double insertion if re-run
            PERFORM 1 FROM daily_todos
            WHERE user_id = target_user_id
            AND date = target_date
            AND content = source_todo.content;
            
            IF NOT FOUND THEN
                INSERT INTO daily_todos (user_id, content, date, is_completed, created_at, updated_at)
                VALUES (target_user_id, source_todo.content, target_date, false, now(), now());
                
                daily_inserted_count := daily_inserted_count + 1;
                inserted_count := inserted_count + 1;
            END IF;
        END LOOP;

        -- Validate: If we just created new tasks for 'target_date', that date is now "active" for the *next* iteration.
        -- Even if we didn't insert anything (because yesterday was fully complete), we continue to next day.
        -- But wait, if yesterday was fully complete, 'source_todo' loop is empty. 
        -- Then 'target_date' gets NO tasks. 
        -- Then for 'target_date + 1', 'source_date' is 'target_date' (which is empty).
        -- So the chain stops if there is a day with 100% completion (or no tasks).
        -- This is CORRECT logic: "Copy incomplete tasks". If yesterday was perfect, today starts fresh.
        
        target_date := target_date + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'rolled_over_to', today_date,
        'last_active_was', last_active_date,
        'count', inserted_count
    );
END;
$$;
