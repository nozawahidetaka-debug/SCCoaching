import React, { useMemo } from 'react';
import { useSessionStore } from '../store/sessionStore';

const NODE_WIDTH = 250;
const NODE_HEIGHT = 80;
const GAP_X = 100;
const GAP_Y = 120;

export const Blackboard: React.FC = () => {
    const { history, phase, insights } = useSessionStore();

    const allNodes = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nodes: any[] = [];
        const journeys = ['journey1', 'journey2', 'journey3', 'journey4'];

        journeys.forEach((jKey, jIdx) => {
            const journeyHistory = history[jKey] || [];
            const offsetX = jIdx % 2 === 0 ? -400 : 400;
            const offsetY = Math.floor(jIdx / 2) * 1500; // 各旅の間隔

            journeyHistory.forEach((entry, i) => {
                // 蛇行レイアウト (snake)
                const row = Math.floor(i / 3);
                const col = i % 3;
                const x = offsetX + (row % 2 === 0 ? col : 2 - col) * (NODE_WIDTH + GAP_X);
                const y = offsetY + row * (NODE_HEIGHT + GAP_Y);

                nodes.push({
                    id: `${jKey}-${i}`,
                    text: entry.answer,
                    x,
                    y,
                    isActive: phase === jKey || phase === `extract_${jKey}`,
                    journeyIndex: jIdx
                });
            });
        });

        return nodes;
    }, [history, phase]);

    const viewBox = useMemo(() => {
        if (phase === 'reflection' || phase === 'summary') {
            return "-1000 -500 2000 4000"; // 全体表示
        }
        // 現在のアクティブな旅にフォーカス
        let journeyIdx = 0;
        if (phase.startsWith('journey')) {
            journeyIdx = parseInt(phase.replace('journey', '')) - 1;
        } else if (phase.startsWith('extract_journey')) {
            journeyIdx = parseInt(phase.replace('extract_journey', '')) - 1;
        }
        // ノード配置と同じ計算ロジックを使用
        const offsetY = Math.floor(journeyIdx / 2) * 1500;
        const centerY = offsetY + 500;
        return `-800 ${centerY - 600} 1600 1200`;
    }, [phase]);

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <svg
                viewBox={viewBox}
                style={{ width: '100%', height: '100%', transition: 'viewBox 3s ease-in-out' }}
            >
                <defs>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#f5f5f5" />
                    </marker>
                </defs>

                {allNodes.map((node, i) => (
                    <g key={node.id} style={{ opacity: node.isActive ? 1 : 0.3, transition: 'opacity 1s' }}>
                        <text
                            x={node.x + NODE_WIDTH / 2}
                            y={node.y + NODE_HEIGHT / 2}
                            textAnchor="middle"
                            className="chalk-text"
                            style={{ fontSize: '24px', fill: '#f5f5f5' }}
                        >
                            {node.text}
                        </text>
                        {/* 簡易的な矢印 (次のノードへの連結) */}
                        {i < allNodes.length - 1 && allNodes[i + 1].journeyIndex === node.journeyIndex && (
                            <line
                                x1={node.x + NODE_WIDTH / 2}
                                y1={node.y + NODE_HEIGHT}
                                x2={allNodes[i + 1].x + NODE_WIDTH / 2}
                                y2={allNodes[i + 1].y}
                                stroke="var(--chalk-white)"
                                strokeDasharray="5,5"
                                markerEnd="url(#arrow)"
                            />
                        )}
                    </g>
                ))}

                {/* 気づきの表示 */}
                {insights.map((insight, i) => (
                    <text
                        key={`insight-${i}`}
                        x={0}
                        y={i * 1500 + 1300}
                        textAnchor="middle"
                        className="chalk-text"
                        style={{ fontSize: '32px', fill: '#ffeb3b', opacity: 0.9 }}
                    >
                        【気づき】{insight}
                    </text>
                ))}
            </svg>

            {phase === 'intro' && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    fontSize: '3rem', textAlign: 'center'
                }} className="chalk-text fade-in">
                    The Deep Chalk
                </div>
            )}
        </div>
    );
};
