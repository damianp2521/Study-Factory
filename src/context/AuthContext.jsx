import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Check active sessions and set basic user immediately
        const initAuth = async () => {
            try {
                // Quick check for session
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (session?.user) {
                    console.log('Auth: Session found (Basic)');
                    setUser(session.user); // Set basic user immediately

                    // 2. Fetch Profile in Background (Awaited now)
                    await fetchProfile(session.user);
                } else {
                    console.log('Auth: No active session');
                    setUser(null);
                }
            } catch (err) {
                console.error('Auth Check Failed:', err);
                setUser(null);
            } finally {
                setLoading(false); // Unblock UI only after profile is loaded
            }
        };

        const fetchProfile = async (basicUser) => {
            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', basicUser.id)
                    .single();

                if (error) {
                    console.warn('Profile fetch error:', error.message);
                } else if (profile) {
                    console.log('Auth: Profile loaded');
                    // Update user state with full profile
                    setUser(prev => ({ ...prev, ...profile }));
                }
            } catch (err) {
                console.error('Profile fetch failed:', err);
            }
        };

        initAuth();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUser(session.user);
                fetchProfile(session.user);
            } else {
                setUser(null);
            }
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
