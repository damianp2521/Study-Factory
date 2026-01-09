import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

const Login = () => {
    const [memberId, setMemberId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        // Basic validation
        if (memberId.length !== 8 || password.length !== 6) {
            setError('회원번호 8자리와 비밀번호 6자리를 정확히 입력해주세요.');
            return;
        }

        setLoading(true);
        try {
            const data = await login(memberId, password);
            if (data.user) {
                // Fetch profile to get role
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .single();

                if (profileError) {
                    console.error('Error fetching role:', profileError);
                }

                // Determine role: Priority 1: Profile, Priority 2: User Metadata, Default: member
                let userRole = profile?.role || data.user?.user_metadata?.role || 'member';
                userRole = userRole.toLowerCase().trim();

                console.log('Login: Detected Role:', userRole);

                // Navigate based on role
                if (userRole === 'admin') {
                    navigate('/admindashboard');
                } else if (userRole === 'staff') {
                    navigate('/staffdashboard');
                } else {
                    navigate('/memberdashboard');
                }
            }
        } catch (err) {
            console.error('Login Error:', err);
            // Show specific error message from Supabase if available
            setError(err.message || '로그인 정보가 일치하지 않습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleIdChange = (e) => {
        const value = e.target.value;
        if (value.length <= 8 && /^\d*$/.test(value)) {
            setMemberId(value);
            if (error) setError('');
        }
    };

    const handlePwChange = (e) => {
        const value = e.target.value;
        if (value.length <= 6 && /^\d*$/.test(value)) {
            setPassword(value);
            if (error) setError('');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: '#f8fafc', // Very light blue/gray background
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>

            {/* Motivational Quote Section */}
            <div style={{
                marginBottom: '50px',
                textAlign: 'center',
                maxWidth: '320px',
                lineHeight: '1.6'
            }}>
                <h1 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#2d3748', // Dark gray
                    marginBottom: '10px',
                    wordBreak: 'keep-all',
                    letterSpacing: '-0.5px'
                }}>
                    "매일 같은 노력을<br />정확하게 반복하는 자가<br />운명을 뚫는<br />막대한 힘을 가진다."
                </h1>
                <div style={{ width: '40px', height: '2px', background: '#cbd5e0', margin: '20px auto 0' }}></div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: '320px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
                    {/* Member ID Input */}
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            position: 'absolute',
                            left: '15px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#a0aec0',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <KeyRound size={20} strokeWidth={1.5} />
                        </div>
                        <input
                            type="text"
                            value={memberId}
                            onChange={handleIdChange}
                            placeholder="회원번호 8자리"
                            style={{
                                width: '100%',
                                padding: '15px 15px 15px 45px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                background: 'white',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                boxSizing: 'border-box',
                                color: '#4a5568'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3182ce'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            inputMode="numeric"
                            disabled={loading}
                        />
                    </div>

                    {/* Password Input */}
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            position: 'absolute',
                            left: '15px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#a0aec0',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <Lock size={20} strokeWidth={1.5} />
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={handlePwChange}
                            placeholder="비밀번호 6자리"
                            style={{
                                width: '100%',
                                padding: '15px 15px 15px 45px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                background: 'white',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                boxSizing: 'border-box',
                                color: '#4a5568'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3182ce'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            inputMode="numeric"
                            disabled={loading}
                        />
                    </div>
                </div>

                {error && (
                    <div style={{
                        color: '#e53e3e',
                        fontSize: '0.85rem',
                        textAlign: 'center',
                        marginBottom: '20px',
                        background: '#fff5f5',
                        padding: '10px',
                        borderRadius: '8px'
                    }}>
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '12px',
                        background: '#2d3748', // Dark gray/black button for sophistication
                        color: 'white',
                        border: 'none',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: loading ? 'wait' : 'pointer',
                        transition: 'background 0.2s',
                        marginBottom: '10px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    {loading ? '로그인 중...' : '로그인'}
                </button>

                <div style={{ textAlign: 'center' }}>
                    <button
                        type="button"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#a0aec0',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            textDecoration: 'none'
                        }}
                    >
                        로그인 정보를 잊으셨나요?
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Login;
