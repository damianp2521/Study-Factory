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

    const [logs, setLogs] = useState([]);

    const addLog = (msg) => {
        const time = new Date().toLocaleTimeString().split(' ')[0];
        setLogs(prev => [`[${time}] ${msg}`, ...prev]);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLogs([]); // Clear logs
        addLog('로그인 프로세스 시작');

        // Basic validation
        if (memberId.length !== 8 || password.length !== 6) {
            setError('회원번호 8자리와 비밀번호 6자리를 정확히 입력해주세요.');
            addLog('유효성 검사 실패: 길이 불일치');
            return;
        }

        setLoading(true);
        try {
            addLog(`ID: ${memberId} 로 요청 준비`);

            // Direct Supabase Call Verification (Bypassing Context for Diagnosis)
            addLog('Supabase SDK 요청 전송...');
            const email = `${memberId}@studyfactory.com`;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                addLog(`SDK 에러 발생: ${error.message}`);
                addLog(`에러 코드: ${error.status || 'Unknown'}`);
                throw error;
            }

            addLog('SDK 응답 성공, 토큰 획득');

            if (data.user) {
                addLog('프로필 정보(Role) 조회 중...');
                // Fetch profile to get role
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .single();

                if (profileError) {
                    addLog(`프로필 조회 실패: ${profileError.message}`);
                    console.error('Error fetching role:', profileError);
                } else {
                    addLog(`프로필 조회 성공: ${profile.role}`);
                }

                // Determine role
                let userRole = profile?.role || data.user?.user_metadata?.role || 'member';
                userRole = userRole.toLowerCase().trim();

                addLog(`최종 권한: ${userRole} -> 이동`);

                // Navigate based on role
                if (userRole === 'admin' || userRole === 'staff') {
                    navigate('/managerdashboard');
                } else {
                    navigate('/memberdashboard');
                }
            }
        } catch (err) {
            console.error('Login Error:', err);
            addLog(`최종 에러: ${err.message}`);
            // Show specific error message from Supabase if available
            setError(err.message || '로그인 정보가 일치하지 않습니다.');
        } finally {
            setLoading(false);
            addLog('프로세스 종료');
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

            {/* Debug Console */}
            <div style={{ marginTop: '20px', width: '100%', maxWidth: '320px', background: '#2d3748', borderRadius: '8px', padding: '10px', color: '#00ff00', fontFamily: 'monospace', fontSize: '12px' }}>
                <div style={{ marginBottom: '5px', borderBottom: '1px solid #4a5568', paddingBottom: '5px' }}>🖥️ 정밀 진단 콘솔</div>
                <div style={{ height: '100px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                    {logs.length === 0 ? '대기 중...' : logs.map((log, i) => <div key={i}>{log}</div>)}
                </div>
            </div>
        </div>
    );
};

export default Login;
