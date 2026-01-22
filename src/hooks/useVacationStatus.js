import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { BRANCH_OPTIONS } from '../constants/branches';
import { getWeekRange, getTodayString } from '../utils/dateUtils';

export const useVacationStatus = () => {
    const { user } = useAuth();
    const BASIC_BRANCHES = BRANCH_OPTIONS;

    // Sorted Branch List
    const branches = useMemo(() => {
        const userBranch = user?.branch || '';
        // 1. Combine and Deduplicate
        const all = new Set([...BASIC_BRANCHES]);
        if (userBranch && userBranch !== '미정') all.add(userBranch);

        // 2. Sort
        return Array.from(all).sort((a, b) => {
            // '전체' always first
            if (a === '전체') return -1;
            if (b === '전체') return 1;

            // User branch always second (right after '전체')
            if (a === userBranch) return -1;
            if (b === userBranch) return 1;

            // Others alphabetical
            return a.localeCompare(b);
        });
    }, [user?.branch, BASIC_BRANCHES]);

    // Initialize with user's branch if possible
    const [selectedBranch, setSelectedBranch] = useState(() => {
        if (user?.branch && user.branch !== '미정') return user.branch;
        return '전체';
    });

    // Update selected branch if user loads late or changes
    useEffect(() => {
        if (user?.branch) {
            const target = (user.branch === '미정' || user.branch === '전체') ? '전체' : user.branch;
            setSelectedBranch(target);
        }
    }, [user?.branch]);

    const [selectedDate, setSelectedDate] = useState(getTodayString());
    const [showCalendar, setShowCalendar] = useState(false);
    const [filters, setFilters] = useState({
        full: true,    // 월차 - Red
        half_am: true, // 오전반차 - Red
        half_pm: true  // 오후반차 - Blue
    });
    const [vacations, setVacations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [weeklyUsage, setWeeklyUsage] = useState({}); // user_id -> usage count

    // Update date on focus
    useEffect(() => {
        const updateDate = () => {
            setSelectedDate(getTodayString());
        };
        window.addEventListener('focus', updateDate);
        return () => window.removeEventListener('focus', updateDate);
    }, []);

    const fetchVacations = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch requests for the selected date
            let query = supabase
                .from('vacation_requests')
                .select('*, profiles:user_id(name, branch), reason')
                .eq('date', selectedDate)
                .order('created_at', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;

            // 2. Fetch Weekly Data for Limit Check
            const { start, end } = getWeekRange(selectedDate);

            const { data: weeklyData, error: weeklyError } = await supabase
                .from('vacation_requests')
                .select('user_id, type, reason')
                .gte('date', start)
                .lte('date', end);

            if (weeklyError) throw weeklyError;

            // Calculate Usage
            const usageMap = {};
            (weeklyData || []).forEach(req => {
                // Only count if reason is NULL (Wolcha/Bancha only)
                if (!req.reason) {
                    const score = req.type === 'full' ? 1 : 0.5;
                    usageMap[req.user_id] = (usageMap[req.user_id] || 0) + score;
                }
            });
            setWeeklyUsage(usageMap);

            // 3. Client-side Filter by Branch and Type
            const filtered = data.filter(req => {
                // Branch Filter
                if (selectedBranch !== '전체' && req.profiles?.branch !== selectedBranch) return false;

                // Type Filter
                let typeKey = 'full';
                if (req.type === 'half') {
                    const p = req.periods || [];
                    if (p.includes(1)) typeKey = 'half_am';
                    else typeKey = 'half_pm';
                }

                return filters[typeKey];
            });

            setVacations(filtered);
        } catch (err) {
            console.error('Error fetching vacations:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedBranch, selectedDate, filters]);

    useEffect(() => {
        fetchVacations();
    }, [fetchVacations]);

    const toggleFilter = (key) => {
        setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return {
        branches,
        selectedBranch,
        setSelectedBranch,
        selectedDate,
        setSelectedDate,
        showCalendar,
        setShowCalendar,
        filters,
        toggleFilter,
        vacations,
        loading,
        weeklyUsage
    };
};
