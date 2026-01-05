import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock } from 'lucide-react';
import logo from '../assets/logo.png';

import { useAuth } from '../context/AuthContext';

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
            await login(memberId, password);
            navigate('/dashboard');
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
        <div className="flex-center flex-col" style={{ minHeight: '80vh', padding: 'var(--spacing-lg)' }}>
            {/* Logo */}
            <div className="flex-center flex-col" style={{ marginBottom: '3rem' }}>
                <div
                    style={{
                        width: '180px',
                        padding: '20px',
                        borderRadius: 'var(--radius-lg)',
                        background: 'white',
                        boxShadow: 'var(--shadow-md)',
                        marginBottom: 'var(--spacing-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <img src={logo} alt="자격증공장" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} style={{ width: '100%' }}>
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    {/* Member ID Input */}
                    <div
                        className="flex-center"
                        style={{
                            background: 'var(--color-surface)',
                            borderRadius: 'var(--radius-md)',
                            padding: '0 var(--spacing-md)',
                            boxShadow: 'var(--shadow-sm)',
                            border: '1px solid transparent',
                            marginBottom: 'var(--spacing-md)'
                        }}
                    >
                        <KeyRound size={20} style={{ color: 'var(--color-text-secondary)', marginRight: 'var(--spacing-xs)' }} />
                        <input
                            type="text"
                            value={memberId}
                            onChange={handleIdChange}
                            placeholder="회원번호 8자리"
                            style={{
                                width: '100%',
                                padding: '1rem 0',
                                border: 'none',
                                outline: 'none',
                                fontSize: '1rem',
                                background: 'transparent'
                            }}
                            inputMode="numeric"
                            disabled={loading}
                        />
                    </div>

                    {/* Password Input */}
                    <div
                        className="flex-center"
                        style={{
                            background: 'var(--color-surface)',
                            borderRadius: 'var(--radius-md)',
                            padding: '0 var(--spacing-md)',
                            boxShadow: 'var(--shadow-sm)',
                            border: '1px solid transparent'
                        }}
                    >
                        <Lock size={20} style={{ color: 'var(--color-text-secondary)', marginRight: 'var(--spacing-xs)' }} />
                        <input
                            type="password"
                            value={password}
                            onChange={handlePwChange}
                            placeholder="비밀번호 6자리"
                            style={{
                                width: '100%',
                                padding: '1rem 0',
                                border: 'none',
                                outline: 'none',
                                fontSize: '1rem',
                                background: 'transparent'
                            }}
                            inputMode="numeric"
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <p style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: 'var(--spacing-xs)', paddingLeft: '4px' }}>
                            {error}
                        </p>
                    )}
                </div>

                <div className="flex-center flex-col" style={{ width: '100%' }}>
                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ marginBottom: 'var(--spacing-md)', opacity: loading ? 0.7 : 1 }}
                        disabled={loading}
                    >
                        {loading ? '로그인 중...' : '로그인'}
                    </button>

                    <button
                        type="button"
                        onClick={() => { }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-secondary)',
                            fontSize: '0.9rem',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            padding: 'var(--spacing-xs)'
                        }}
                    >
                        로그인 오류 문의하기
                    </button>
                </div>
            </form >
        </div >
    );
};

export default Login;
