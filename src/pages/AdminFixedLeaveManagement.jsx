import React from 'react';
import { ChevronLeft } from 'lucide-react';

const AdminFixedLeaveManagement = ({ onBack }) => {
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', marginLeft: '-8px' }}>
                    <ChevronLeft size={26} color="#2d3748" />
                </button>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0 4px' }}>고정 기타 휴무 관리</h2>
            </div>

            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: '#a0aec0',
                gap: '10px'
            }}>
                <div style={{ fontSize: '3rem' }}>📌</div>
                <div>준비 중입니다.</div>
            </div>
        </div>
    );
};

export default AdminFixedLeaveManagement;
