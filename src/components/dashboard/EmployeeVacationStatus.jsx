import React, { useState } from 'react';
import { Calendar, Search, X } from 'lucide-react';
import EmbeddedCalendar from '../EmbeddedCalendar';
import { useVacationStatus } from '../../hooks/useVacationStatus';
import { formatDateWithDay } from '../../utils/dateUtils';

const EmployeeVacationStatus = ({ onUserClick }) => {
    const {
        branches,
        selectedBranch,
        setSelectedBranch,
        selectedDate,
        setSelectedDate,
        showCalendar,
        setShowCalendar,
        filters,
        toggleFilter,
        vacations,
        loading,
        weeklyUsage
    } = useVacationStatus();

    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Filter vacations by search term
    const filteredVacations = vacations.filter(v => {
        if (!searchTerm.trim()) return true;
        return v.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Top Controls: Search & Branch Dropdown */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                marginBottom: '20px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Name Search */}
                    {isSearchOpen ? (
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
                            padding: '8px 12px', flex: 1
                        }}>
                            <Search size={16} color="#a0aec0" style={{ marginRight: '6px', flexShrink: 0 }} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="이름 검색"
                                style={{
                                    border: 'none', outline: 'none', fontSize: '0.9rem', flex: 1, color: '#4a5568'
                                }}
                                autoFocus
                                onBlur={() => {
                                    if (!searchTerm) setIsSearchOpen(false);
                                }}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => { setSearchTerm(''); setIsSearchOpen(false); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}
                                >
                                    <X size={14} color="#a0aec0" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            style={{
                                background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
                                padding: '8px 12px', fontSize: '0.9rem', color: '#4a5568',
                                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                            }}
                        >
                            <Search size={16} color="#718096" />
                            <span>이름 검색</span>
                        </button>
                    )}

                    {/* Branch Filter Dropdown */}
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.9rem',
                            color: '#4a5568',
                            backgroundColor: 'white',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {branches.map(branch => (
                            <option key={branch} value={branch}>
                                {branch === '전체' ? '전체 지점' : branch}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {/* Date Picker (Toggleable) */}
                    <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        style={{
                            width: '100%',
                            height: '46px',
                            padding: '0 12px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            background: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{
                            fontSize: '1rem',
                            color: '#2d3748',
                            fontWeight: 'bold',
                            fontFamily: 'var(--font-mono, monospace)',
                            letterSpacing: '1px'
                        }}>
                            {selectedDate ? formatDateWithDay(selectedDate) : '날짜 선택'}
                        </span>
                        <Calendar size={20} color="#718096" />
                    </button>

                    {showCalendar && (
                        <div style={{
                            marginTop: '5px',
                            background: 'white',
                            padding: '15px',
                            borderRadius: '16px',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                            border: '1px solid #e2e8f0',
                            zIndex: 10
                        }}>
                            <EmbeddedCalendar
                                selectedDate={selectedDate}
                                onSelectDate={(val) => {
                                    setSelectedDate(val);
                                    setShowCalendar(false);
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Filter Toggle Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button
                    onClick={() => toggleFilter('full')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: filters.full ? '2px solid #e53e3e' : '1px solid #e2e8f0',
                        background: filters.full ? '#fff5f5' : 'white',
                        color: filters.full ? '#c53030' : '#a0aec0',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.9rem'
                    }}
                >
                    월차
                </button>
                <button
                    onClick={() => toggleFilter('half_am')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: filters.half_am ? '2px solid #e53e3e' : '1px solid #e2e8f0', // Red for AM
                        background: filters.half_am ? '#fff5f5' : 'white',
                        color: filters.half_am ? '#c53030' : '#a0aec0',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.9rem'
                    }}
                >
                    오전
                </button>
                <button
                    onClick={() => toggleFilter('half_pm')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: filters.half_pm ? '2px solid #3182ce' : '1px solid #e2e8f0', // Blue for PM
                        background: filters.half_pm ? '#ebf8ff' : 'white',
                        color: filters.half_pm ? '#2c5282' : '#a0aec0',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.9rem'
                    }}
                >
                    오후
                </button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '20px' }}>로딩 중...</div>
                ) : filteredVacations.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '20px' }}>휴무자가 없습니다.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {filteredVacations.map(req => {
                            // Determine type label and color
                            let typeLabel = '월차';
                            let color = '#c53030'; // Red
                            let bg = '#fff5f5';

                            let isAm = (req.periods || []).includes(1);

                            if (req.type === 'half') {
                                if (isAm) {
                                    typeLabel = '오전반차';
                                    color = '#c53030'; // Red
                                    bg = '#fff5f5';
                                } else {
                                    typeLabel = '오후반차';
                                    color = '#2c5282'; // Blue
                                    bg = '#ebf8ff';
                                }
                            } else if (req.type === 'special_log') {
                                const periods = req.periods || [1];
                                const firstPeriod = periods[0];
                                // Show all periods joined
                                typeLabel = `${periods.join(', ')}교시 ${req.reason}`;

                                if (firstPeriod === 1) {
                                    color = '#c53030'; // Red (Morning Style)
                                    bg = '#fff5f5';
                                } else {
                                    color = '#2c5282'; // Blue (Afternoon Style)
                                    bg = '#ebf8ff';
                                }
                            }

                            // Reason override (for normal vacations)
                            let displayLabel = typeLabel;
                            if (req.reason && req.type !== 'special_log') {
                                // "Other Leave" logic for vacations
                                if (req.type === 'full') {
                                    displayLabel = `종일 ${req.reason}`;
                                } else if (req.type === 'half') {
                                    if (isAm) displayLabel = `오전 ${req.reason}`;
                                    else displayLabel = `오후 ${req.reason}`;
                                }
                            }

                            return (
                                <div key={req.id}
                                    onClick={() => onUserClick && onUserClick({ id: req.user_id, ...req.profiles })}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px 15px', // Reduced vertical padding
                                        borderRadius: '12px',
                                        background: bg,
                                        border: '1px solid transparent',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        cursor: 'pointer'
                                    }}>
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {req.profiles?.name || '알 수 없음'}
                                            {(() => {
                                                // Staff: limit is 2, Members: limit is 1.5
                                                const userRole = req.profiles?.role;
                                                const limit = (userRole === 'staff' || userRole === 'admin') ? 2 : 1.5;
                                                const usage = weeklyUsage[req.user_id] || 0;
                                                return usage > limit ? (
                                                    <span style={{ fontSize: '0.8rem', color: '#e53e3e', fontWeight: 'bold' }}>
                                                        휴가 초과 사용
                                                    </span>
                                                ) : null;
                                            })()}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#718096' }}>
                                            {req.profiles?.branch || '지점 미정'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontSize: '0.9rem',
                                            fontWeight: 'bold',
                                            color: color,
                                            marginBottom: '2px'
                                        }}>
                                            {displayLabel}
                                        </div>
                                        {req.created_at && (
                                            <div style={{ fontSize: '0.7rem', color: '#a0aec0' }}>
                                                {(() => {
                                                    const d = new Date(req.created_at);
                                                    const days = ['일', '월', '화', '수', '목', '금', '토'];
                                                    const day = days[d.getDay()];
                                                    const yyyy = d.getFullYear();
                                                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                                                    const dd = String(d.getDate()).padStart(2, '0');
                                                    const hh = String(d.getHours()).padStart(2, '0');
                                                    const min = String(d.getMinutes()).padStart(2, '0');
                                                    return `${yyyy}.${mm}.${dd}(${day}) ${hh}:${min}`;
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeVacationStatus;
