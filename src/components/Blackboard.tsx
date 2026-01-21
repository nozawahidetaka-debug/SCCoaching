import React, { useMemo } from 'react';
import { useSessionStore } from '../store/sessionStore';

const NODE_HEIGHT = 80;
const GAP_Y = 100;

export const Blackboard: React.FC = () => {
    const { history, phase, insights } = useSessionStore();

    // 現在アクティブな旅のキーを取得
    const activeJourneyKey = useMemo(() => {
        if (phase.startsWith('journey')) {
            return phase;
        } else if (phase.startsWith('extract_journey')) {
            return phase.replace('extract_', '');
        }
        return null;
    }, [phase]);

    // 現在の旅のノードを取得（縦1列）
    const currentNodes = useMemo(() => {
        if (!activeJourneyKey) return [];

        const journeyHistory = history[activeJourneyKey] || [];
        return journeyHistory.map((entry, i) => ({
            id: `${activeJourneyKey}-${i}`,
            text: entry.answer,
            y: i * (NODE_HEIGHT + GAP_Y),
            index: i
        }));
    }, [history, activeJourneyKey]);

    // viewBox を最新のノードが中央付近に来るように計算
    const viewBox = useMemo(() => {
        const viewWidth = 800;
        const viewHeight = 600;

        if (phase === 'reflection' || phase === 'summary') {
            // 全体表示モード（すべてのinsightsを表示）
            return `-400 -200 ${viewWidth} 1600`;
        }

        if (phase === 'intro') {
            return `-400 -300 ${viewWidth} ${viewHeight}`;
        }

        // 最新のノードを画面中央に持ってくる
        const lastIndex = currentNodes.length - 1;
        if (lastIndex < 0) {
            return `-400 -300 ${viewWidth} ${viewHeight}`;
        }

        const lastY = currentNodes[lastIndex].y;
        // 最新ノードが画面の上下中央に来るように: lastY - (viewHeight / 2)
        const viewY = lastY - (viewHeight / 2);

        return `-400 ${viewY} ${viewWidth} ${viewHeight}`;
    }, [phase, currentNodes]);

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', paddingBottom: '200px' }}>
            <svg
                viewBox={viewBox}
                style={{
                    width: '100%',
                    height: 'calc(100% - 200px)',
                    transition: 'viewBox 0.8s ease-out'
                }}
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#f5f5f5" />
                    </marker>
                </defs>

                {/* 現在の旅のノード（縦1列） */}
                {currentNodes.map((node, i) => (
                    <g key={node.id} style={{ transition: 'opacity 0.5s' }}>
                        <text
                            x={0}
                            y={node.y}
                            textAnchor="middle"
                            className="chalk-text"
                            style={{ fontSize: '48px', fill: '#f5f5f5' }}
                        >
                            {node.text}
                        </text>
                        {/* 次のノードへの矢印 */}
                        {i < currentNodes.length - 1 && (
                            <line
                                x1={0}
                                y1={node.y + 30}
                                x2={0}
                                y2={currentNodes[i + 1].y - 40}
                                stroke="var(--chalk-white)"
                                strokeDasharray="5,5"
                                strokeOpacity={0.5}
                            />
                        )}
                    </g>
                ))}

                {/* summary/reflection 時に気づきを表示 */}
                {(phase === 'summary' || phase === 'reflection') && insights.map((insight, i) => (
                    <text
                        key={`insight-${i}`}
                        x={0}
                        y={200 + i * 140}
                        textAnchor="middle"
                        className="chalk-text"
                        style={{ fontSize: '40px', fill: '#ffeb3b', opacity: 0.9 }}
                    >
                        【気づき {i + 1}】{insight}
                    </text>
                ))}
            </svg>

            {phase === 'intro' && (
                <div style={{
                    position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
                    fontSize: '3rem', textAlign: 'center'
                }} className="chalk-text fade-in">
                    The Deep Chalk
                </div>
            )}
        </div>
    );
};
