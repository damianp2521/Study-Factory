import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    // 1. Construct User from Session (Immediate)
    const constructUserFromSession = (sessionUser) => {
        if (!sessionUser) return null;
        const meta = sessionUser.user_metadata || {};
        return {
            ...sessionUser,
            role: meta.role || 'member',
            branch: meta.branch || '미정',
            name: meta.name || sessionUser.email?.split('@')[0],
            isSynced: false
        };
    };

    // 2. Background Profile Sync
    const syncProfileInBackground = async (sessionUser) => {
        if (!sessionUser) return;

        try {
            console.log("Starting background profile sync...");
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('id, name, branch, role')
                .eq('id', sessionUser.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.warn('Background sync warning:', error.message);
                return;
            }

            if (profile) {
                setUser(prev => {
                    if (!prev) return null;
                    const nextUser = {
                        ...prev,
                        ...sessionUser,
                        role: profile.role || prev.role,
                        branch: profile.branch || prev.branch,
                        name: profile.name || prev.name,
                        isSynced: true
                    };
                    if (JSON.stringify(prev) === JSON.stringify(nextUser)) return prev;
                    return nextUser;
                });
                console.log("Profile synced from DB");
            }
        } catch (err) {
            console.error("Background sync failed:", err);
        }
    };

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                // Quick Session Check
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (session?.user) {
                    const immediateUser = constructUserFromSession(session.user);
                    if (mounted) {
                        setUser(immediateUser);
                        setLoading(false);
                    }
                    syncProfileInBackground(session.user);
                } else {
                    if (mounted) setLoading(false);
                }
            } catch (err) {
                console.error("Auth Init Error:", err);
                if (mounted) {
                    setAuthError(null);
                    setUser(null);
                    setLoading(false);
                }
            }
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            console.log(`Auth Event: ${event}`);

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    const immediateUser = constructUserFromSession(session.user);
                    if (mounted) {
                        setUser(immediateUser);
                        setLoading(false);
                        setAuthError(null);
                    }
                    syncProfileInBackground(session.user);
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

    const login = async (id, password) => {
        setLoading(true);
        try {
            const email = `${id}@studyfactory.com`;
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.session?.user) {
                const immediateUser = constructUserFromSession(data.session.user);
                setUser(immediateUser);
                setAuthError(null);
                syncProfileInBackground(data.session.user);
                return immediateUser;
            }
        } catch (err) {
            setLoading(false);
            throw err;
        }
        setLoading(false);
    };

    const logout = async () => {
        setLoading(true);
        await supabase.auth.signOut();
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
