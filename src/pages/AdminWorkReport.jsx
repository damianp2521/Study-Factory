import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar, CheckCircle, Circle, X, Search } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { BRANCH_OPTIONS } from '../constants/branches';

const AdminWorkReport = ({ onBack }) => {
    // 1. State: Filter & Data
    const [selectedBranch, setSelectedBranch] = useState('전체');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState(''); // NEW: Search Query State

    // DETAIL MODAL STATE
    const [selectedReport, setSelectedReport] = useState(null);

    // 2. Date Helpers (Same logic as WorkPlanReport to ensure alignment)
    const getMonday = (d) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
    };

    const weekStart = getMonday(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const handlePrevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    // 3. Fetch Data
    useEffect(() => {
        fetchReports();
    }, [weekStartStr, selectedBranch]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            // Fetch reports for the week
            // We need profile info too
            const { data, error } = await supabase
                .from('weekly_reports')
                .select(`
                    *,
                    profiles:user_id ( name, branch )
                `)
                .eq('week_start_date', weekStartStr);

            if (error) throw error;

            // Client-side Branch Filter
            const filtered = selectedBranch === '전체'
                ? data
                : data.filter(r => r.profiles?.branch === selectedBranch);

            // Sort by name
            filtered.sort((a, b) => (a.profiles?.name || '').localeCompare(b.profiles?.name || ''));

            setReports(filtered);
        } catch (err) {
            console.error('Error fetching reports:', err);
            // alert('데이터 로딩 실패');
        } finally {
            setLoading(false);
        }
    };

    // Filter reports based on search query
    const displayedReports = reports.filter(r =>
        (r.profiles?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 4. Modal Renderer using Portal
    const renderDetailModal = () => {
        if (!selectedReport) return null;

        const planTasks = selectedReport.plan_snapshot || [];
        const resultTasks = selectedReport.result_snapshot || [];

        // Create Portal to render outside of the carousel's transform context
        return ReactDOM.createPortal(
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999, // High Z-Index
                padding: '20px'
            }} onClick={() => setSelectedReport(null)}>
                <div style={{
                    background: 'white',
                    width: '100%',
                    maxWidth: '800px',
                    maxHeight: '90vh',
                    borderRadius: '20px',
                    padding: '25px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                }} onClick={e => e.stopPropagation()}>

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#2d3748' }}>
                                {selectedReport.profiles?.name} 님의 보고서
                            </h2>
                            <p style={{ color: '#718096', margin: '5px 0 0 0' }}>
                                {selectedReport.profiles?.branch} | {weekStart.getMonth() + 1}.{weekStart.getDate()} ~ {weekEnd.getMonth() + 1}.{weekEnd.getDate()}
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedReport(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
                        >
                            <X size={24} color="#a0aec0" />
                        </button>
                    </div>

                    {/* Content Grid */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', // Responsive Grid
                        gap: '20px',
                        paddingBottom: '50px' // Increased padding to prevent cut-off
                    }}>

                        {/* LEFT: PLAN */}
                        <div style={{ background: '#f7fafc', padding: '15px', borderRadius: '12px', minHeight: '200px', maxHeight: '400px', overflowY: 'auto' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '15px', color: '#2b6cb0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                작업 계획
                                {selectedReport.plan_reported_at ? (
                                    <span style={{ fontSize: '0.7rem', background: '#bee3f8', color: '#2c5282', padding: '2px 6px', borderRadius: '4px' }}>
                                        {new Date(selectedReport.plan_reported_at).toLocaleDateString()} 제출
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '0.7rem', background: '#fed7d7', color: '#c53030', padding: '2px 6px', borderRadius: '4px' }}>미제출</span>
                                )}
                            </h3>
                            {!selectedReport.plan_reported_at || planTasks.length === 0 ? (
                                <div style={{
                                    color: '#a0aec0',
                                    textAlign: 'center',
                                    marginTop: '40px',
                                    fontSize: '0.9rem',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                                }}>
                                    <Circle size={24} color="#e2e8f0" />
                                    제출 전입니다
                                </div>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {planTasks.map((t, i) => (
                                        <li key={i} style={{ marginBottom: '8px', padding: '8px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            {t.content}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* RIGHT: RESULT */}
                        <div style={{ background: '#f7fafc', padding: '15px', borderRadius: '12px', minHeight: '200px', maxHeight: '400px', overflowY: 'auto' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '15px', color: '#2f855a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                작업 결과
                                {selectedReport.result_reported_at ? (
                                    <span style={{ fontSize: '0.7rem', background: '#c6f6d5', color: '#22543d', padding: '2px 6px', borderRadius: '4px' }}>
                                        {new Date(selectedReport.result_reported_at).toLocaleDateString()} 제출
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '0.7rem', background: '#fed7d7', color: '#c53030', padding: '2px 6px', borderRadius: '4px' }}>미제출</span>
                                )}
                            </h3>
                            {!selectedReport.result_reported_at || resultTasks.length === 0 ? (
                                <div style={{
                                    color: '#a0aec0',
                                    textAlign: 'center',
                                    marginTop: '40px',
                                    fontSize: '0.9rem',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                                }}>
                                    <Circle size={24} color="#e2e8f0" />
                                    제출 전입니다
                                </div>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {resultTasks.map((t, i) => (
                                        <li key={i} style={{ marginBottom: '8px', padding: '8px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {t.is_completed ? <CheckCircle size={16} color="#48bb78" /> : <Circle size={16} color="#cbd5e0" />}
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ textDecoration: t.is_completed ? 'line-through' : 'none', color: t.is_completed ? '#718096' : '#2d3748' }}>
                                                    {t.content}
                                                </span>
                                                {t.is_completed && t.completed_at && (
                                                    <span style={{ fontSize: '0.75rem', color: '#a0aec0' }}>
                                                        {(() => {
                                                            const d = new Date(t.completed_at);
                                                            return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                                        })()}
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                    </div>
                </div>
            </div>,
            document.body // Append to body
        );
    };


    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        marginLeft: '-8px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2d3748'
                    }}
                >
                    <ChevronLeft size={26} />
                </button>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 0 4px', lineHeight: 1 }}>작업 계획 및 결과 보고</h2>
            </div>

            {/* Controls: Branch & Week & Search */}
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>

                {/* Branch Scroll */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    paddingBottom: '5px',
                    whiteSpace: 'nowrap',
                    scrollbarWidth: 'none'
                }}>
                    <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                    {BRANCH_OPTIONS.map(branch => (
                        <button
                            key={branch}
                            onClick={() => setSelectedBranch(branch)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: selectedBranch === branch ? 'none' : '1px solid #e2e8f0',
                                background: selectedBranch === branch ? 'var(--color-primary)' : 'white',
                                color: selectedBranch === branch ? 'white' : '#718096',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                flexShrink: 0
                            }}
                        >
                            {branch}
                        </button>
                    ))}
                </div>

                {/* Week Selector */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'white', padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', justifyContent: 'space-between' }}>
                        <button onClick={handlePrevWeek} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '5px' }}>
                            <ChevronLeft size={20} color="#4a5568" />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#2d3748' }}>
                            <Calendar size={18} color="#718096" />
                            <span>{weekStart.getFullYear()}. {weekStart.getMonth() + 1}. {weekStart.getDate()} ~ {weekEnd.getMonth() + 1}. {weekEnd.getDate()}</span>
                        </div>
                        <button onClick={handleNextWeek} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '5px' }}>
                            <ChevronRight size={20} color="#4a5568" />
                        </button>
                    </div>
                </div>

                {/* NEW: Search Input */}
                <div style={{ position: 'relative' }}>
                    <Search size={20} color="#a0aec0" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="이름으로 검색"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 12px 12px 45px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            fontSize: '1rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '40px' }}>데이터 불러오는 중...</div>
                ) : displayedReports.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '40px' }}>
                        {searchQuery ? '검색 결과가 없습니다.' : '제출된 보고서가 없습니다.'}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {displayedReports.map((report) => (
                            <div
                                key={report.id}
                                onClick={() => setSelectedReport(report)}
                                style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    border: '1px solid #e2e8f0',
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>
                                        {report.profiles?.name}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#718096' }}>
                                        {report.profiles?.branch}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                                    {/* Plan Status */}
                                    <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: '#718096' }}>계획:</span>
                                        {report.plan_reported_at ? (
                                            <span style={{ color: '#3182ce', fontWeight: 'bold' }}>제출완료</span>
                                        ) : (
                                            <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>미제출</span>
                                        )}
                                    </div>
                                    {/* Result Status */}
                                    <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: '#718096' }}>결과:</span>
                                        {report.result_reported_at ? (
                                            <span style={{ color: '#38a169', fontWeight: 'bold' }}>제출완료</span>
                                        ) : (
                                            <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>미제출</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {renderDetailModal()}
        </div>
    );
};

export default AdminWorkReport;
