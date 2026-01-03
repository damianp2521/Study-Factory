import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and sets the user
        const getSession = async () => {
            try {
                // Add a timeout to prevent infinite loading if Supabase connection hangs
                const { data, error } = await Promise.race([
                    supabase.auth.getSession(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                ]);

                if (error) throw error;

                if (data?.session?.user) {
                    const session = data.session;
                    // Try to fetch profile, but don't block everything if it fails
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (profileError) {
                        console.warn('Profile fetch error:', profileError);
                        setUser(session.user); // Fallback to basic auth user
                    } else {
                        setUser({ ...session.user, ...profile });
                    }
                } else {
                    setUser(null);
                }
            } catch (err) {
                console.error('Auth check failed or timed out:', err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        getSession();

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                // Fetch profile on auth change too
                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                    setUser({ ...session.user, ...profile });
                } catch (err) {
                    console.error('Profile update failed:', err);
                    setUser(session.user);
                }
            } else {
                setUser(null);
            }
            // Ensure loading is false when auth state changes
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = async (id, password) => {
        // Option B: Dummy Email Pattern
        // Since we are using Member ID (8 digits), we map it to a pseudo-email.
        // ex) 12345678 -> 12345678@studyfactory.com
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
    };

    const value = {
        user,
        login,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
