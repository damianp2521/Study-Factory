import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    // 1. Unified Profile Fetcher
    // Always returns a unified user object or throws error
    const fetchFullProfile = async (sessionUser) => {
        if (!sessionUser) return null;

        try {
            // Fetch strict profile data from DB
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('id, name, branch, role')
                .eq('id', sessionUser.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.warn('Profile fetch warning:', error.message);
            }

            // Merge Logic: DB > Metadata > Fallback
            // Ideally DB should be the source of truth for Role/Branch
            const meta = sessionUser.user_metadata || {};

            const finalRole = profile?.role || meta.role || 'member';
            const finalBranch = profile?.branch || meta.branch || '미정';
            const finalName = profile?.name || meta.name || sessionUser.email?.split('@')[0];

            return {
                ...sessionUser,
                id: sessionUser.id,
                email: sessionUser.email,
                role: finalRole === 'authenticated' ? 'member' : finalRole,
                branch: finalBranch,
                name: finalName
            };
        } catch (err) {
            console.error("Profile construction error:", err);
            // Fallback to metadata if DB fails catastrophicallly
            return {
                ...sessionUser,
                role: sessionUser.user_metadata?.role || 'member',
                branch: sessionUser.user_metadata?.branch || '미정',
                name: sessionUser.user_metadata?.name || '사용자'
            };
        }
    };

    useEffect(() => {
        let mounted = true;

        // 2. Initial Session Check
        const init = async () => {
            try {
                // Create a timeout promise that rejects after 5 seconds
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Connection timeout')), 5000)
                );

                // Race the session check against the timeout
                const sessionPromise = supabase.auth.getSession();

                const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);

                if (error) throw error;

                if (session?.user) {
                    const fullUser = await fetchFullProfile(session.user);
                    if (mounted) setUser(fullUser);
                }
            } catch (err) {
                console.error("Auth Init Error:", err);
                if (mounted) setAuthError(err.message || 'Initialization failed');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        init();

        // 3. Application-wide Auth Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            console.log(`Auth Event: ${event}`);

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                // Ensure we don't set loading=false until we have the profile
                // But if we are already loaded, we just update the user.
                if (session?.user) {
                    const fullUser = await fetchFullProfile(session.user);
                    if (mounted) {
                        setUser(fullUser);
                        setAuthError(null);
                        setLoading(false); // Ensure loading is cleared
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                if (mounted) {
                    setUser(null);
                    setLoading(false);
                    setAuthError(null);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // 4. Login Action
    // Returns a promise that resolves ONLY when the user state is set
    // This allows Login.jsx to await this before traversing routes
    const login = async (id, password) => {
        setLoading(true); // Optimistic loading state
        try {
            const email = `${id}@studyfactory.com`;
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            if (data.session?.user) {
                const fullUser = await fetchFullProfile(data.session.user);
                setUser(fullUser);
                return fullUser;
            }
        } catch (err) {
            setLoading(false); // Reset loading on error
            throw err;
        }
        // Success case: loading stays true briefly until the listener confirms or we navigate
        // actually we can set loading false here to be safe
        setLoading(false);
    };

    const logout = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        // Listener handles state update
    };

    const value = {
        user,
        loading,
        authError,
        login,
        logout
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
