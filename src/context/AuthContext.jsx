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
            // 2. Fetch Profile without strict timeout constraints
            // We rely on standard network timeout or user patience rather than forceful logout
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('id, name, branch, role')
                .eq('id', sessionUser.id)
                .single();

            if (error) throw error;

            // 3. Construct Final User
            let finalRole = profile?.role;
            if (!finalRole || finalRole === 'authenticated') {
                finalRole = metaRole;
            }
            if (!finalRole || finalRole === 'authenticated') {
                finalRole = 'member';
            }

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

        const initSession = async () => {
            try {
                // 1. Get Session with safety timeout (3 seconds)
                // If it hangs, we unblock the UI so the user can at least see the Login screen or retry
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((resolve) =>
                    setTimeout(() => resolve({ data: { session: null }, error: { message: 'Session check timed out' } }), 3000)
                );

                const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);

                if (error && error.message === 'Session check timed out') {
                    console.warn('Auth session check timed out - defaulting to no session');
                    // Proceed as if no session (will redirect to Login likely)
                } else if (error) {
                    throw error;
                }

                if (session?.user) {
                    // 2. Optimistic Update
                    const metaRole = session.user.user_metadata?.role || 'member';
                    const metaName = session.user.user_metadata?.name || session.user.email?.split('@')[0];
                    const metaBranch = session.user.user_metadata?.branch || '미정';

                    const optimisticUser = {
                        ...session.user,
                        role: metaRole === 'authenticated' ? 'member' : metaRole,
                        name: metaName,
                        branch: metaBranch
                    };

                    if (mounted) {
                        setUser(optimisticUser);
                        setLoading(false); // Unblock UI
                    }

                    // 3. Background Verification
                    const verifiedUser = await fetchProfile(session.user);
                    if (mounted && verifiedUser) {
                        setUser(verifiedUser);
                    }
                } else {
                    if (mounted) setLoading(false);
                }
            } catch (error) {
                console.error('Auth init error:', error);
                if (mounted) {
                    // On error, clear loading so user isn't stuck
                    setLoading(false);
                }
            }
        };

        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (mounted && session?.user) {
                    // For auth state changes, we can also be optimistic if needed, 
                    // but usually simpler to just fetch. 
                    // To keep it smooth, we can set user based on session first.
                    const metaRole = session.user.user_metadata?.role || 'member';
                    const optimisticUser = {
                        ...session.user,
                        role: metaRole === 'authenticated' ? 'member' : metaRole,
                        name: session.user.user_metadata?.name,
                        branch: session.user.user_metadata?.branch
                    };
                    setUser(optimisticUser);

                    const combinedUser = await fetchProfile(session.user);
                    if (mounted) {
                        setUser(combinedUser);
                        setAuthError(null);
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                if (mounted) {
                    setUser(null);
                    setAuthError(null);
                }
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
