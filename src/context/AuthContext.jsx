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

            // Merge profile data directly into the user object for easy access
            return { ...sessionUser, ...profile };
        } catch (error) {
            console.error('Error fetching profile:', error);
            return sessionUser;
        }
    };

    useEffect(() => {
        let mounted = true;

        // 1. Initial Session Check
        const initSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const params = new URLSearchParams(window.location.search);
                    // Handle password reset case if needed, but keep it simple
                    const combinedUser = await fetchProfile(session.user);
                    if (mounted) setUser(combinedUser);
                }
            } catch (error) {
                console.error('Auth init error:', error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initSession();

        // 2. Auth State Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth State Change:', event);
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
