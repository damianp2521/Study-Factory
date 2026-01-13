import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async (userId) => {
            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error) {
                    console.warn('Profile fetch error:', error.message);
                    return null;
                }
                return profile;
            } catch (err) {
                console.error('Profile fetch failed:', err);
                return null;
            }
        };

        // 1. Check active sessions and set basic user immediately
        const initAuth = async () => {
            try {
                // Quick check for session
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (session?.user) {
                    console.log('Auth: Session found, fetching profile...');
                    // Fetch profile BEFORE setting user to prevent race condition
                    const profile = await fetchProfileData(session.user.id);

                    const finalUser = {
                        ...session.user,
                        ...(profile || {}) // Merge profile if exists
                    };

                    console.log('Auth: Setting complete user with role:', finalUser.role);
                    setUser(finalUser);
                } else {
                    console.log('Auth: No active session');
                    setUser(null);
                }
            } catch (err) {
                console.error('Auth Check Failed:', err);
                setUser(null);
            } finally {
                setLoading(false); // Unblock UI only after profile is loaded and user is set
            }
        };

        initAuth();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    const profile = await fetchProfileData(session.user.id);
                    setUser({ ...session.user, ...(profile || {}) });
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
            }
            // Note: For INITIAL_SESSION, initAuth handles it, so we don't need to do much here or might cause double renders, 
            // but setting it again is safe as React batches/diffs.
            if (event !== 'INITIAL_SESSION') {
                setLoading(false);
            }
        });

        // Safety timeout: If nothing happens for 3 seconds, stop loading
        const safetyTimeout = setTimeout(() => {
            if (loading) {
                console.warn('Auth: Loading timed out, forcing render.');
                setLoading(false);
            }
        }, 3000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(safetyTimeout);
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
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
