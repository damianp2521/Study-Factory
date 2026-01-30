import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BRANCH_LIST } from '../constants/branches';


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
    const { login } = useAuth(); // Destructure login from context

    // Modes: 'login' | 'register_check' | 'register_setup'
    const [mode, setMode] = useState('login');

    // Inputs
    const [name, setName] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [branch, setBranch] = useState('망미점');

    // Captured role removed as it was unused
    // const [foundRole, setFoundRole] = useState('member');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // PWA Install Prompt State
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showIosInstallModal, setShowIosInstallModal] = useState(false);

    // Capture the PWA install prompt event
    useState(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        // Detect iOS
        const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;

        if (isIos) {
            setShowIosInstallModal(true);
        } else if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } else {

            // Check for In-App Browsers (KakaoTalk, Naver, etc.)
            const isKakao = /KAKAOTALK/i.test(navigator.userAgent);
            const isNaver = /NAVER/i.test(navigator.userAgent);
            const isInApp = isKakao || isNaver || /Instagram|FBAN|FBAV/i.test(navigator.userAgent);

            if (isInApp) {
                alert('카카오톡/네이버 등 인앱 브라우저에서는 설치가 지원되지 않습니다.\n\n우측 하단(또는 상단)의 메뉴 버튼(...)을 눌러 [다른 브라우저로 열기]를 선택한 후 다시 시도해주세요.');
            } else {
                // Generic fallback for proper browsers that just didn't fire the event yet (or already installed)
                alert('현재 브라우저에서는 자동 설치를 지원하지 않거나 이미 설치되어 있습니다.\n\n[브라우저 메뉴] -> [홈 화면에 추가] 또는 [앱 설치]를 직접 선택해주세요.');
            }
        }
    };

    // --- Actions ---

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Using the new secure login method from AuthContext
            // FIX: We must use the SAME encoding logic as registration
            // Registration: name -> hex -> email
            // Login: name -> hex -> ID -> login() -> email

            const fullEmail = nameToEmail(name);
            const id = fullEmail.split('@')[0]; // Extract 'u_xxxx' part

            // FIX 2: Password Mismatch
            // Registration sets password as pin + '00'
            // We must append '00' here to match it.
            const finalPassword = pin + '00';

            await login(id, finalPassword);

            // Navigation handled by the component that detects user state change
            // or we can navigate here safely now
            navigate('/');
        } catch (err) {
            console.error(err);
            setError(`로그인 실패: ${err.message}`);
            setLoading(false);
        }
    };

    const handleCheckRegistration = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Check if already registered in profiles
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('id')
                .eq('name', name.trim())
                .single();

            if (existingUser) {
                throw new Error('이미 가입된 회원입니다. 로그인해 주세요.');
            }

            // Check pending_registrations for pre-registered user
            const { data, error: fetchError } = await supabase
                .from('pending_registrations')
                .select('*')
                .eq('name', name.trim())
                .eq('branch', branch)
                .single();

            if (fetchError || !data) {
                throw new Error('사전 등록된 정보가 없습니다. 관리자에게 문의하세요.');
            }

            // Success: Move to PIN setup
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
            // Re-verify user info from pending_registrations to get the role and other details
            const { data: pendingData, error: pendingError } = await supabase
                .from('pending_registrations')
                .select('*')
                .eq('name', name.trim())
                .eq('branch', branch)
                .single();

            if (pendingError) throw new Error('사원 정보를 다시 확인할 수 없습니다.');

            const finalRole = pendingData?.role || 'member';
            const email = nameToEmail(name);
            const password = `${pin}00`;

            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name.trim(),
                        branch: branch,
                        role: finalRole,
                        seat_number: pendingData.seat_number // Pass seat number to metadata (trigger handles profile update)
                    }
                }
            });

            if (signUpError) throw signUpError;

            if (authData?.user) {
                const userId = authData.user.id;

                // 1. Insert Beverage Selections
                if (pendingData.selection_1 || pendingData.selection_2 || pendingData.selection_3) {
                    await supabase.from('user_beverage_selections').insert([{
                        user_id: userId,
                        selection_1: pendingData.selection_1,
                        selection_2: pendingData.selection_2,
                        selection_3: pendingData.selection_3
                    }]);
                }

                // 2. Insert Mmeo
                if (pendingData.memo) {
                    await supabase.from('member_memos').insert([{
                        user_id: userId,
                        content: pendingData.memo
                    }]);
                }
            }

            // Delete from pending_registrations after successful signup
            const { error: deleteError } = await supabase
                .from('pending_registrations')
                .delete()
                .eq('id', pendingData.id);

            if (deleteError) {
                console.error("Failed to remove from pending_registrations", deleteError);
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

            <button
                type="button"
                onClick={handleInstallClick}
                style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#edf2f7',
                    color: '#4a5568',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginTop: '15px'
                }}
            >
                홈 화면에 추가하기
            </button>
        </form>
    );

    // iOS Install Instructions Modal
    const renderIosModal = () => (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }} onClick={() => setShowIosInstallModal(false)}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '320px',
                width: '100%',
                textAlign: 'center'
            }} onClick={e => e.stopPropagation()}>
                <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#2d3748' }}>홈 화면에 추가</h3>
                <p style={{ color: '#4a5568', marginBottom: '20px', lineHeight: '1.6', fontSize: '0.95rem', textAlign: 'left', wordBreak: 'keep-all' }}>
                    아이폰에서는 다음과 같은 방법으로 홈화면에 추가해주세요:<br /><br />
                    1. Safari 브라우저 우측 하단 <strong>... 버튼</strong> 클릭<br />
                    2. <strong>공유</strong> 클릭<br />
                    3. 우측 하단 <strong>더보기</strong> 클릭<br />
                    4. <strong>홈 화면에 추가</strong> 클릭
                </p>
                <button
                    onClick={() => setShowIosInstallModal(false)}
                    style={primaryButtonStyle}
                >
                    닫기
                </button>
            </div>
        </div>
    );

    const renderCheck = () => (
        <form onSubmit={handleCheckRegistration} style={{ width: '100%' }}>
            <h2 style={headerStyle}>사원등록</h2>
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
                    {BRANCH_LIST.map(b => <option key={b} value={b}>{b}</option>)}
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
            {showIosInstallModal && renderIosModal()}
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
    background: 'var(--color-primary, #387679)',
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
