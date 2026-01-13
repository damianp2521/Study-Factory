import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (sessionUser) => {
        if (!sessionUser) return null;
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sessionUser.id)
                .single();

            // Merge profile data directly into the user object
            return { ...sessionUser, ...profile };
        } catch (error) {
            console.error('Error fetching profile:', error);
            return sessionUser;
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
                    setTimeout(() => reject(new Error('Session check timed out')), 3000)
                );

                const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

                if (session?.user) {
                    const combinedUser = await fetchProfile(session.user);
                    if (mounted) setUser(combinedUser);
                }
            } catch (error) {
                console.error('Auth init error/timeout:', error);
                // If timeout or error, we assume no user or let them login again
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                const combinedUser = await fetchProfile(session?.user);
                if (mounted) setUser(combinedUser);
            } else if (event === 'SIGNED_OUT') {
                if (mounted) setUser(null);
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
        loading
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
