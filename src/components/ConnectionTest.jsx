import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const ConnectionTest = () => {
    const [status, setStatus] = useState('idle'); // idle, testing, success, error
    const [message, setMessage] = useState('');
    const [logs, setLogs] = useState([]);

    const addLog = (msg) => setLogs(prev => [...prev, msg]);

    const testConnection = async () => {
        setStatus('testing');
        setMessage('진단 중...');
        setLogs([]);

        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

        // 1. Config Check
        if (!url) {
            addLog('❌ Config: URL이 없습니다 (VITE_SUPABASE_URL missing)');
            setStatus('error');
            setMessage('환경 변수 설정 오류');
            return;
        } else {
            addLog(`✅ Config: ${url.substring(0, 15)}... (Found)`);
        }

        try {
            // 2. Direct HTTP Ping (Bypassing SDK)
            addLog('📡 Network: Direct Ping 시도 (3s Timeout)...');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            // Fetching auth health endpoint
            const response = await fetch(`${url}/auth/v1/health`, {
                method: 'GET',
                headers: { 'apikey': key },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                addLog(`✅ Network: Ping 성공 (${response.status} OK)`);
            } else {
                addLog(`⚠️ Network: 응답 실패 (${response.status})`);
                // Continue anyway to see if SDK works
            }

            // 3. SDK Session Check
            addLog('📚 SDK: Session 확인 중...');
            const { error } = await supabase.auth.getSession();

            if (error) {
                addLog(`❌ SDK Error: ${error.message}`);
                throw error;
            } else {
                addLog('✅ SDK: 정상 응답');
            }

            setStatus('success');
            setMessage('진단 완료: 연결 상태 양호');

        } catch (err) {
            console.error('Test failed:', err);
            setStatus('error');
            if (err.name === 'AbortError') {
                addLog('❌ Timeout: 3초 동안 응답이 없습니다.');
                setMessage('네트워크 타임아웃 (차단됨)');
            } else if (err.message === 'Failed to fetch') {
                addLog('❌ Fetch Error: 인터넷 연결이나 URL을 확인하세요.');
                setMessage('네트워크 연결 실패');
            } else {
                setMessage(`오류: ${err.message}`);
            }
        }
    };

    return (
        <div style={{ marginTop: '30px', padding: '15px', background: '#f5f5f5', borderRadius: '8px', width: '100%', fontSize: '0.85rem' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#666' }}>연결 진단 도구</h4>

            <button
                type="button"
                onClick={testConnection}
                style={{
                    padding: '8px 16px',
                    background: '#333',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: '100%',
                    marginBottom: '10px'
                }}
            >
                {status === 'testing' ? '진단 중...' : '서버 연결 및 설정 확인 시작'}
            </button>

            {message && (
                <div style={{
                    fontWeight: 'bold',
                    color: status === 'success' ? 'green' : (status === 'error' ? 'red' : '#333'),
                    marginBottom: '10px'
                }}>
                    결과: {message}
                </div>
            )}

            {logs.length > 0 && (
                <div style={{
                    textAlign: 'left',
                    background: 'white',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    fontFamily: 'monospace'
                }}>
                    {logs.map((log, i) => (
                        <div key={i} style={{ marginBottom: '4px' }}>{log}</div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ConnectionTest;
