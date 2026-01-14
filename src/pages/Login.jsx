import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Helper: Convert Name to Deterministic Hex Email
const nameToEmail = (name) => {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(name.trim());
        const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
        return `u_${hex}@studyfactory.com`;
    } catch (e) {
        console.error("Name encoding error", e);
        return `error_${Date.now()}@studyfactory.com`;
    }
};

const Login = () => {
    const navigate = useNavigate();
    const { initSession } = useAuth();

    // Modes: 'login' | 'register_check' | 'register_setup'
    const [mode, setMode] = useState('login');

    // Inputs
    const [name, setName] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [branch, setBranch] = useState('망미점');

    // Captured role from authorized_users
    const [foundRole, setFoundRole] = useState('member');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // --- Actions ---

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const email = nameToEmail(name);
            const password = `${pin}00`; // Pad 4 digits to 6 chars

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) throw signInError;

            // Session init handled by AuthContext, just navigate
            navigate('/');
        } catch (err) {
            console.error(err);
            // Show raw error for debugging
            setError(`오류 발생: ${err.message}`);
            setLoading(false);
        }
    };

    const handleCheckRegistration = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Check authorized_users
            const { data, error: fetchError } = await supabase
                .from('authorized_users')
                .select('*')
                .eq('name', name.trim())
                .eq('branch', branch)
                .single();

            if (fetchError || !data) {
                throw new Error('사전 등록된 정보가 없습니다. 관리자에게 문의하세요.');
            }

            if (data.is_registered) {
                throw new Error('이미 가입된 회원입니다. 로그인해 주세요.');
            }

            // Success: Move to PIN setup
            setFoundRole(data.role || 'member'); // Store role
            setPin('');
            setConfirmPin('');
            setMode('register_setup');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteRegistration = async (e) => {
        e.preventDefault();
        if (pin.length !== 4) {
            setError('비밀번호는 4자리여야 합니다.');
            return;
        }
        if (pin !== confirmPin) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            // CRITICAL: Re-verify user info to get the DEFINITIVE role before creating account
            // This prevents stale state (e.g. if page was left open)
            const { data: authData, error: authError } = await supabase
                .from('authorized_users')
                .select('role')
                .eq('name', name.trim())
                .eq('branch', branch)
                .single();

            if (authError) throw new Error('사원 정보를 다시 확인할 수 없습니다.');

            const finalRole = authData?.role || 'member';
            const email = nameToEmail(name);
            const password = `${pin}00`;

            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name.trim(),
                        branch: branch,
                        role: finalRole // Use the re-verified role
                    }
                }
            });

            if (signUpError) throw signUpError;

            // Update authorized_users to is_registered = true
            // Using the Name to match since we might not have ID link easily yet
            // Use RPC to bypass RLS and mark as registered
            const { error: updateError } = await supabase
                .rpc('mark_user_registered', { user_name: name.trim() });

            if (updateError) {
                console.error("Failed to mark as registered", updateError);
            }

            alert('가입이 완료되었습니다! 로그인해 주세요.');
            setMode('login');
            setPin('');
            setError('');

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- Renderers ---

    const renderLogin = () => (
        <form onSubmit={handleLogin} style={{ width: '100%' }}>
            <div style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="이름 (예: 김공장)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={inputStyle}
                />
            </div>
            <div style={{ marginBottom: '20px' }}>
                <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="비밀번호 (4자리)"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    style={inputStyle}
                />
            </div>

            {error && <div style={{ color: '#e53e3e', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

            <button type="submit" disabled={loading} style={primaryButtonStyle}>
                {loading ? '로그인 중...' : '로그인'}
            </button>

            <button
                type="button"
                onClick={() => { setMode('register_check'); setError(''); setName(''); setBranch('망미점'); }}
                style={{ ...secondaryButtonStyle, marginTop: '15px' }}
            >
                사원등록
            </button>
        </form>
    );

    const renderCheck = () => (
        <form onSubmit={handleCheckRegistration} style={{ width: '100%' }}>
            <h2 style={headerStyle}>사원 확인</h2>
            <div style={{ marginBottom: '15px' }}>
                <label style={labelStyle}>이름</label>
                <input
                    type="text"
                    placeholder="이름을 입력하세요"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={inputStyle}
                />
            </div>
            <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>지점</label>
                <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none' }}
                >
                    <option value="망미점">망미점</option>
                </select>
            </div>

            {error && <div style={{ color: '#e53e3e', marginBottom: '20px', fontSize: '0.9rem' }}>{error}</div>}

            <button type="submit" disabled={loading} style={primaryButtonStyle}>
                {loading ? '확인 중...' : '확인'}
            </button>

            <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                style={{ ...textButtonStyle, marginTop: '20px' }}
            >
                <ArrowLeft size={16} style={{ marginRight: '5px' }} /> 돌아가기
            </button>
        </form>
    );

    const renderSetup = () => (
        <form onSubmit={handleCompleteRegistration} style={{ width: '100%' }}>
            <h2 style={headerStyle}>비밀번호 설정</h2>
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f7fafc', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.9rem', color: '#718096' }}>가입 정보</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>{name} / {branch}</div>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="new-password"
                    placeholder="사용하실 비밀번호 (4자리)"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    style={inputStyle}
                />
            </div>
            <div style={{ marginBottom: '20px' }}>
                <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="new-password"
                    placeholder="비밀번호 확인"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    style={inputStyle}
                />
            </div>

            {error && <div style={{ color: '#e53e3e', marginBottom: '20px', fontSize: '0.9rem' }}>{error}</div>}

            <button type="submit" disabled={loading} style={primaryButtonStyle}>
                {loading ? '등록 중...' : '등록완료'}
            </button>

            <button
                type="button"
                onClick={() => { setMode('register_check'); setError(''); }}
                style={{ ...textButtonStyle, marginTop: '20px' }}
            >
                <ArrowLeft size={16} style={{ marginRight: '5px' }} /> 뒤로
            </button>
        </form>
    );

    return (
        <div style={{
            height: '100vh',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px'
        }}>

            {/* Logo */}
            {mode === 'login' && (
                <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                    <img
                        src="/logo.png"
                        alt="Logo"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                        }}
                        style={{ width: '150px', objectFit: 'contain' }}
                    />
                </div>
            )}

            {mode === 'login' && renderLogin()}
            {mode === 'register_check' && renderCheck()}
            {mode === 'register_setup' && renderSetup()}
        </div>
    );
};

// Styles
const inputStyle = {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box'
};

const primaryButtonStyle = {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: 'none',
    background: 'var(--color-primary, #2b6cb0)',
    color: 'white',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s'
};

const secondaryButtonStyle = {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#4a5568',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer'
};

const textButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#718096',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '0.9rem'
};

const headerStyle = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '30px',
    color: '#2d3748',
    textAlign: 'center'
};

const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '0.9rem',
    color: '#718096',
    fontWeight: 'bold'
};

export default Login;
