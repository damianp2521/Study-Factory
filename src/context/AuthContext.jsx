import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    // Helper to fetch full profile and merge with session user
    const fetchProfile = async (sessionUser) => {
        if (!sessionUser) return null;

        const metaRole = sessionUser.user_metadata?.role;
        const metaName = sessionUser.user_metadata?.name;
        const metaBranch = sessionUser.user_metadata?.branch;

        try {
            // Fetch Profile from DB
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('id, name, branch, role')
                .eq('id', sessionUser.id)
                .single();

            // Ignore "Row not found" errors (PGRST116) as we have fallbacks
            if (error && error.code !== 'PGRST116') {
                console.warn('Profile fetch warning:', error.message);
            }

            // Determine final values with priority: Profile DB > Metadata > Default
            let finalRole = profile?.role;
            if (!finalRole || finalRole === 'authenticated') finalRole = metaRole;
            if (!finalRole || finalRole === 'authenticated') finalRole = 'member';

            const finalBranch = profile?.branch || metaBranch || '미정';
            const finalName = profile?.name || metaName || sessionUser.email?.split('@')[0] || '사용자';

            return {
                ...sessionUser,
                ...profile,
                role: finalRole,
                branch: finalBranch,
                name: finalName
            };

        } catch (error) {
            console.error('Profile fetch unexpected error:', error);
            // Fallback to metadata on critical error
            let finalRole = metaRole;
            if (!finalRole || finalRole === 'authenticated') finalRole = 'member';

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

        const initSession = async () => {
            try {
                // 1. Get Session directly
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Auth initialization error:', error);
                    // We don't throw here, just proceed as logged out
                }

                if (mounted && session?.user) {
                    // 2. Optimistic Update (Show UI immediately)
                    const metaRole = session.user.user_metadata?.role || 'member';
                    const optimisticUser = {
                        ...session.user,
                        role: metaRole === 'authenticated' ? 'member' : metaRole,
                        name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
                        branch: session.user.user_metadata?.branch || '미정'
                    };
                    setUser(optimisticUser);

                    // 3. Background Verification
                    // Use .then() to avoid blocking the finally block if we wanted to be super fast,
                    // but awaiting here is safer to prevent role flickering. 
                    // Given the user wants speed, we'll keep the optimistic set above, 
                    // but we MUST await before setting loading=false if we want to confirm the role 
                    // to prevent unauthorized redirects. 
                    // HOWEVER, user asked for speed. Optimistic is key.

                    const verifiedUser = await fetchProfile(session.user);
                    if (mounted && verifiedUser) {
                        setUser(verifiedUser);
                    }
                }
            } catch (err) {
                console.error('Unexpected auth init error:', err);
            } finally {
                // 4. ALWAYS UNBLOCK UI
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        initSession();

        // 5. Subscribe to Auth Changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            console.log('Auth State Change:', event);

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    // Optimistic update
                    const metaRole = session.user.user_metadata?.role || 'member';
                    const optimisticUser = {
                        ...session.user,
                        role: metaRole === 'authenticated' ? 'member' : metaRole,
                        name: session.user.user_metadata?.name,
                        branch: session.user.user_metadata?.branch
                    };
                    setUser(optimisticUser);

                    // Fetch authoritative profile
                    const combinedUser = await fetchProfile(session.user);
                    if (mounted) {
                        setUser(combinedUser);
                        setAuthError(null);
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setAuthError(null);
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
        // The onAuthStateChange listener will handle the user state update
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
