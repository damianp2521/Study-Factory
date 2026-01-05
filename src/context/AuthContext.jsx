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
                console.log('Auth: Checking session...');
                // Timeout reduced to 2 seconds to fail fast if connection is bad
                const { data, error } = await Promise.race([
                    supabase.auth.getSession(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Auth check timed out (2000ms)')), 2000))
                ]);

                if (error) throw error;

                if (data?.session?.user) {
                    console.log('Auth: Session found');
                    const session = data.session;

                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (profileError) {
                        console.warn('Profile fetch error - using basic user data:', profileError.message);
                        setUser(session.user);
                    } else {
                        setUser({ ...session.user, ...profile });
                    }
                } else {
                    console.log('Auth: No active session');
                    setUser(null);
                }
            } catch (err) {
                console.error('Auth Check Failed:', err);
                // If it's a timeout or network error, we should still let the app load (as logged out)
                // rather than waiting forever or crashing.
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

        console.log(`Auth: Attempting login for ${email}`);

        try {
            // Add a 5-second timeout to the login request
            const { data, error } = await Promise.race([
                supabase.auth.signInWithPassword({
                    email,
                    password,
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Login request timed out (5s). Check your network connection.')), 5000))
            ]);

            if (error) {
                console.error('Auth: Login failed', error);
                throw error;
            }

            console.log('Auth: Login successful', data);
            return data;
        } catch (err) {
            console.error('Auth: Message during login:', err.message);
            throw err;
        }
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
