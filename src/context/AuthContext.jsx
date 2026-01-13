import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    const fetchProfile = async (sessionUser) => {
        if (!sessionUser) return null;

        // 1. Prepare fallback values from metadata
        const metaRole = sessionUser.user_metadata?.role;
        const metaName = sessionUser.user_metadata?.name;
        const metaBranch = sessionUser.user_metadata?.branch;

        try {
            // 2. Fetch Profile explicitly calling columns to bypass potential '*' cache issues
            const profilePromise = supabase
                .from('profiles')
                .select('id, name, branch, role')
                .eq('id', sessionUser.id)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timed out')), 5000)
            );

            const { data: profile } = await Promise.race([profilePromise, timeoutPromise]);

            // 3. Construct Final User
            // Priority: Profile DB > Metadata > Default (never 'authenticated')
            // If profile.role is null or 'authenticated', fall back to metadata
            let finalRole = profile?.role;
            if (!finalRole || finalRole === 'authenticated') {
                finalRole = metaRole;
            }
            if (!finalRole || finalRole === 'authenticated') {
                finalRole = 'member';
            }

            const finalBranch = profile?.branch || metaBranch || '미정';
            const finalName = profile?.name || metaName || sessionUser.email?.split('@')[0] || '사용자';

            // Force overwrite existing user properties to ensure correct role
            return {
                ...sessionUser,
                ...profile,
                role: finalRole,
                branch: finalBranch,
                name: finalName
            };

        } catch (error) {
            console.error('Profile fetch failed, using fallback:', error);
            // Fallback to metadata
            let finalRole = metaRole;
            if (!finalRole || finalRole === 'authenticated') {
                finalRole = 'member';
            }

            return {
                ...sessionUser,
                role: finalRole,
                name: metaName || sessionUser.email?.split('@')[0],
                branch: metaBranch || '미정'
            };
        }
    };

    useEffect(() => {
        let mounted = true;

        // Cleanup function for potentially stuck keys if needed
        const safelyClearStuckStorage = () => {
            // Optional: careful with this, but if multiple customers report hangs, might be needed.
            // For now, relying on Login page's cleanup.
        };

        const initSession = async () => {
            try {
                // Force timeout after 3 seconds to prevent infinite loading
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Initial session check timed out')), 3000)
                );

                const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

                if (session?.user) {
                    const combinedUser = await fetchProfile(session.user);
                    if (mounted) setUser(combinedUser);
                }
            } catch (error) {
                console.error('Auth init error:', error);
                // If timeout or error, we assume no user or let them login again
                if (mounted) setAuthError(error.message);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                const combinedUser = await fetchProfile(session?.user);
                if (mounted) setUser(combinedUser);
                if (mounted) setAuthError(null); // Clear error on success
            } else if (event === 'SIGNED_OUT') {
                if (mounted) setUser(null);
                if (mounted) setAuthError(null);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const login = async (id, password) => {
        const email = `${id}@studyfactory.com`;
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
    };

    const value = {
        user,
        login,
        logout,
        loading,
        authError
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
