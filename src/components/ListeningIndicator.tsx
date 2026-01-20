import React from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

export const ListeningIndicator: React.FC = () => {
    const { isListening, transcript } = useSpeechRecognition();

    return (
        <div style={{
            position: 'fixed',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            zIndex: 1000,
        }}>
            {/* マイクアイコン */}
            <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: isListening ? 'rgba(255, 82, 82, 0.8)' : 'rgba(100, 100, 100, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: isListening ? 'pulse 1.5s ease-in-out infinite' : 'none',
                transition: 'background-color 0.3s ease',
                boxShadow: isListening ? '0 0 20px rgba(255, 82, 82, 0.6)' : 'none',
            }}>
                <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
            </div>

            {/* ステータステキスト */}
            <div className="chalk-text" style={{
                fontSize: '1.2rem',
                opacity: 0.9,
                textAlign: 'center',
            }}>
                {isListening ? (
                    <span>🎤 話してください...</span>
                ) : (
                    <span>処理中...</span>
                )}
            </div>

            {/* リアルタイム認識テキスト */}
            {transcript && (
                <div className="chalk-text" style={{
                    fontSize: '1rem',
                    opacity: 0.7,
                    maxWidth: '300px',
                    textAlign: 'center',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                }}>
                    「{transcript}」
                </div>
            )}
        </div>
    );
};
