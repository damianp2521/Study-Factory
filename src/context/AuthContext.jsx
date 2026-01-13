import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Only for session check
    const [isProfileLoaded, setIsProfileLoaded] = useState(false); // New state for profile

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

        const initAuth = async () => {
            console.log('Auth: initAuth started');
            try {
                // Quick check for session
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (session?.user) {
                    console.log('Auth: Session found');
                    // Set Basic User First
                    setUser(session.user);

                    // Fetch Profile Asynchronously
                    fetchProfileData(session.user.id).then((profile) => {
                        if (profile) {
                            console.log('Auth: Profile loaded later');
                            setUser(prev => ({ ...prev, ...profile }));
                        }
                        setIsProfileLoaded(true);
                    });
                } else {
                    console.log('Auth: No active session');
                    setUser(null);
                    setIsProfileLoaded(true); // No user means profile loading is "done" (irrelevant)
                }
            } catch (err) {
                console.error('Auth Check Failed:', err);
                setUser(null);
                setIsProfileLoaded(true);
            } finally {
                setLoading(false); // Unblock generic UI immediately
            }
        };

        initAuth();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth: Event', event);
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setIsProfileLoaded(true);
                return;
            }

            if (session?.user) {
                // If it's a new sign-in, we might not have profile yet. 
                // Don't overwrite existing full user if just token refresh.
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    setUser(session.user);
                    setIsProfileLoaded(false); // Start loading profile
                    const profile = await fetchProfileData(session.user.id);
                    setUser(prev => ({ ...prev, ...(profile || {}) }));
                    setIsProfileLoaded(true);
                }
            }
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
            // Standard timeout
            const { data, error } = await Promise.race([
                supabase.auth.signInWithPassword({
                    email,
                    password,
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('로그인 지연 (10초). 네트워크를 확인해주세요.')), 10000))
            ]);

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Auth: Login failed', err);
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
        loading,
        isProfileLoaded
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
