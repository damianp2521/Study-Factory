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
            // 1. Parallel Fetch: Vacation Requests AND Attendance Logs
            const [vacRes, logRes] = await Promise.all([
                supabase
                    .from('vacation_requests')
                    .select('*, profiles:user_id(name, branch), reason')
                    .eq('date', selectedDate)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('attendance_logs')
                    .select('user_id, status, created_at, profiles:user_id(name, branch)')
                    .eq('date', selectedDate)
                    // .eq('period', 1) // Removed to fetch all periods
                    .not('status', 'is', null)
            ]);

            if (vacRes.error) throw vacRes.error;
            if (logRes.error) throw logRes.error;

            const vacData = vacRes.data || [];
            const logData = logRes.data || [];

            // Transform logs to vacation shape
            const formattedLogs = logData.map(log => ({
                id: `log_${log.user_id}`,
                user_id: log.user_id,
                type: 'special_log', // Custom type to distinguish
                periods: [log.period], // Use actual period
                reason: log.status,
                profiles: log.profiles,
                created_at: log.created_at // Use actual created_at
            }));

            // Merge (Unique by user_id preference?)
            // If a user has both, usually Vacation Request should take precedence if it covers the same time?
            // "Special Leave" (attendance log) is "1교시".
            // A "Full Day Vacation" covers 1교시.
            // If I have full day vac, I don't need to show "1교시 Alba" separately?
            // Existing logic: vacation_requests are definitive.
            // Logs are now the ONLY way Special Leaves exist.
            // So we treat them as additive.
            // But let's filter out duplicates if any (e.g. if user matches both lists).
            // Merge Logic:
            // Allow logs to appear alongside vacations unless redundant.
            const vacUserIds = new Set(vacData.map(v => v.user_id));
            const distinctLogs = formattedLogs.filter(l => {
                const hasVacation = vacUserIds.has(l.user_id);
                if (!hasVacation) return true;

                // If user has vacation, filter out generic/redundant statuses
                const redundantStatuses = ['월차', '반차', '오전', '오후', '출석', '결석', 'O', 'X'];
                if (redundantStatuses.includes(l.reason)) return false;

                return true;
            });

            const combinedData = [...vacData, ...distinctLogs];

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
            const filtered = combinedData.filter(req => {
                // Branch Filter
                if (selectedBranch !== '전체' && req.profiles?.branch !== selectedBranch) return false;

                // Type Filter
                let typeKey = 'full';
                if (req.type === 'half') {
                    const p = req.periods || [];
                    if (p.includes(1)) typeKey = 'half_am';
                    else typeKey = 'half_pm';
                } else if (req.type === 'special_log') {
                    // Check period for AM/PM classification
                    const p = req.periods ? req.periods[0] : 1;
                    if (p === 1) typeKey = 'half_am';
                    else typeKey = 'half_pm'; // Periods 2-7 -> PM
                }

                return filters[typeKey];
            });

            // Sort by created_at descending (newest first)
            filtered.sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
                const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
                return dateB - dateA;
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
