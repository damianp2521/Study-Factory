import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const ConnectionTest = () => {
    const [status, setStatus] = useState('idle'); // idle, testing, success, error
    const [message, setMessage] = useState('');

    const testConnection = async () => {
        setStatus('testing');
        setMessage('서버 연결 확인 중...');

        try {
            const start = Date.now();

            // Try a very simple query (fetching system time or just checking health)
            // For Supabase, selecting count from a table is usually cheap. 
            // If we don't know a table, we can try to get the session which hits the auth server.
            const { data, error } = await supabase.auth.getSession();

            const duration = Date.now() - start;

            if (error) throw error;

            setStatus('success');
            setMessage(`연결 성공! (응답 시간: ${duration}ms)`);
        } catch (err) {
            console.error('Connection Test Error:', err);
            setStatus('error');
            setMessage(`연결 실패: ${err.message || '알 수 없는 오류'}`);
        }
    };

    return (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
                type="button"
                onClick={testConnection}
                style={{
                    padding: '8px 16px',
                    fontSize: '0.8rem',
                    background: '#f0f0f0',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                서버 연결 테스트
            </button>
            {message && (
                <p style={{
                    marginTop: '8px',
                    fontSize: '0.8rem',
                    color: status === 'success' ? 'green' : (status === 'error' ? 'red' : 'gray')
                }}>
                    {message}
                </p>
            )}
        </div>
    );
};

export default ConnectionTest;
