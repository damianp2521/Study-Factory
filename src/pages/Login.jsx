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
                // Navigate based on role
                if (userRole === 'admin' || userRole === 'staff') {
                    navigate('/managerdashboard');
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
                    fontSize: '1.4rem',
                    fontWeight: '500',
                    color: '#2d3748', // Dark gray
                    marginBottom: '15px',
                    wordBreak: 'keep-all',
                    letterSpacing: '-0.5px',
                    fontFamily: '"Nanum Myeongjo", "Batang", serif', // Myeongjo/Serif for sophistication
                    lineHeight: '1.8'
                }}>
                    "매일 같은 노력을<br />정확하게 반복하는 자가<br />운명을 뚫는<br />막대한 힘을 가진다"
                </h1>
                <div style={{ width: '30px', height: '1px', background: '#a0aec0', margin: '25px auto 0' }}></div>
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

            <div style={{ marginTop: '30px', padding: '10px', background: '#edf2f7', borderRadius: '8px', fontSize: '0.75rem', color: '#718096', width: '100%', maxWidth: '320px', textAlign: 'left' }}>
                <strong>시스템 진단:</strong>
                <div style={{ marginTop: '5px' }}>
                    URL 설정: {import.meta.env.VITE_SUPABASE_URL ? <span style={{ color: 'green' }}>확인됨</span> : <span style={{ color: 'red' }}>누락됨 (환경변수 확인 필요)</span>}
                </div>
                <div style={{ marginTop: '5px' }}>
                    서버 연결: <ConnectionStatus />
                </div>
            </div>
        </div>
    );
};

const ConnectionStatus = () => {
    const [status, setStatus] = React.useState('확인 중...');
    const [color, setColor] = React.useState('#a0aec0');
    const [details, setDetails] = React.useState('');

    React.useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        const start = Date.now();
        try {
            const url = import.meta.env.VITE_SUPABASE_URL || '';
            let projectRef = '';

            // Check URL format
            if (!url.includes('supabase.co')) {
                setDetails(`URL 경고: 'supabase.co'가 포함되지 않음 (${url.substring(0, 15)}...)`);
                if (!url) {
                    setStatus('설정 없음');
                    setColor('red');
                    return;
                }
            } else {
                projectRef = url.split('://')[1]?.split('.')[0];
            }

            // Raw Health Check (Bypassing SDK)
            const healthUrl = `${url}/auth/v1/health`;
            console.log('Testing connection to:', healthUrl);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(healthUrl, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const latency = Date.now() - start;

            if (response.ok) {
                setStatus(`정상 (${latency}ms)`);
                setColor('green');
                setDetails('');
            } else {
                setStatus(`상태 이상 (HTTP ${response.status})`);
                setColor('orange');
                setDetails('서버에 도달했으나 오류가 반환되었습니다.');
            }

        } catch (err) {
            console.error('Connection check failed:', err);
            setColor('red');

            if (err.name === 'AbortError') {
                setStatus('응답 없음 (시간 초과)');
                setDetails('방화벽, VPN, 또는 사내 보안 네트워크가 서버 접속을 차단하고 있을 수 있습니다.');
            } else if (err.message === 'Failed to fetch') {
                setStatus('연결 실패 (Network Error)');
                setDetails('인터넷 연결을 확인하거나 광고 차단/VPN을 잠시 끄고 시도해주세요.');
            } else {
                setStatus('오류 발생');
                setDetails(err.message);
            }
        }
    };

    return (
        <div>
            <span style={{ color, fontWeight: 'bold' }}>{status}</span>
            {details && <div style={{ marginTop: '4px', fontSize: '0.7em', color: '#e53e3e' }}>{details}</div>}
            <div style={{ marginTop: '4px', fontSize: '0.7em', color: '#718096' }}>
                연결 대상: {import.meta.env.VITE_SUPABASE_URL ? import.meta.env.VITE_SUPABASE_URL.split('://')[1]?.split('.')[0] : '없음'}
            </div>
        </div>
    );
}

export default Login;
