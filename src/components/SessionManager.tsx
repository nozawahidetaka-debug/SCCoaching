import React, { useCallback, useRef, useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import type { Phase } from '../store/sessionStore';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

const JOURNEY_MAP: { key: string; question: (val: string) => string }[] = [
    { key: 'journey1', question: (A: string) => `${A}できたら良いことは何ですか？` },
    { key: 'journey2', question: (B: string) => `${B}できなかったら悪いことは何ですか？` },
    { key: 'journey3', question: (A: string) => `${A}できたら悪いことは何ですか？` },
    { key: 'journey4', question: (B: string) => `${B}できなかったら良いことは何ですか？` },
];

export const SessionManager: React.FC = () => {
    const { phase, variables, currentCycle, setPhase, setVariables, addHistory, incrementCycle, resetCycle, addInsight } = useSessionStore();
    const { transcript, isListening, startListening, stopListening, setTranscript } = useSpeechRecognition();
    const { speak, cancel } = useSpeechSynthesis();

    // アンマウント時に音声をキャンセル
    React.useEffect(() => {
        return () => {
            cancel();
        };
    }, [cancel]);

    const [isProcessing, setIsProcessing] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const isProcessingRef = useRef(false);

    // デバッグ用
    React.useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).useSessionStore = useSessionStore;
    }, []);

    const processResponse = useCallback(async (text: string) => {
        const cleanText = text.trim();
        console.log(`[Session] Processing request in phase "${phase}":`, cleanText);
        if (isProcessingRef.current || !cleanText) return;

        isProcessingRef.current = true;
        setIsProcessing(true);
        stopListening();

        try {
            if (phase === 'intro') {
                // 変数抽出: より寛容なパターン
                const introRegex = /(.+?)[した]い(?:けれども?|けど|だけど|なのに|のに)?[、,\s]*(.+?)(?:が|を)?(?:できない|出来ない|きない|出来ん)/;
                const match = cleanText.match(introRegex);
                if (match) {
                    const [, A, B] = match;
                    setVariables({ A, B });
                    setPhase('journey1');
                    const firstQuestion = JOURNEY_MAP[0].question(A);
                    await speak(firstQuestion, { delay: 1500 });
                } else {
                    console.warn('[Session] Intro match failed for:', cleanText);
                    await speak("すみません、よく聞き取れませんでした。「まるまるしたいけれど、まるまるできない」の形式でもう一度教えてください。", { delay: 1200 });
                }
            } else if (phase.startsWith('journey')) {
                const journeyIndex = parseInt(phase.replace('journey', '')) - 1;
                const journey = JOURNEY_MAP[journeyIndex];

                // 履歴に追加
                addHistory(journey.key, {
                    question: currentCycle === 0 ? journey.question(journeyIndex % 2 === 0 ? variables.A : variables.B) : "それだとどうなりますか？",
                    answer: cleanText,
                    timestamp: Date.now()
                });

                if (currentCycle < 29) {
                    incrementCycle();
                    console.log(`[Session] Advancing cycle in ${phase}:`, currentCycle + 1);
                    await speak(`${cleanText}だと、どうなりますか？`, { delay: 1500 });
                } else {
                    // 旅の終了
                    console.log(`[Session] Finshing ${phase}, moving to extract.`);
                    await speak("はい、ここまでで、何か感じたこと、気がついたことはありますか？", { delay: 2000 });
                    resetCycle();
                    setPhase(`extract_${phase}` as Phase);
                }
            } else if (phase.startsWith('extract_')) {
                // 気づきの記録
                addInsight(cleanText);
                const currentJourneyNum = parseInt(phase.replace('extract_journey', ''));
                console.log(`[Session] Insight recorded for journey ${currentJourneyNum}:`, cleanText);

                if (currentJourneyNum < 4) {
                    const nextJourneyNum = currentJourneyNum + 1;
                    setPhase(`journey${nextJourneyNum}` as Phase);
                    // nextJourneyNum は 1-indexed なので、JOURNEY_MAP のインデックスは nextJourneyNum - 1
                    const nextJourney = JOURNEY_MAP[nextJourneyNum - 1];
                    const nextVar = (nextJourneyNum - 1) % 2 === 0 ? variables.A : variables.B;
                    console.log(`[Session] Moving to journey${nextJourneyNum}:`, nextJourney.question(nextVar));
                    await speak(nextJourney.question(nextVar), { delay: 2000 });
                } else {
                    setPhase('summary');
                    await speak("これで全ての旅が終わりました。もう一度全体を見直して、感じたことを教えて下さい。", { delay: 3000 });
                }
            } else if (phase === 'summary') {
                addInsight(cleanText);
                setPhase('reflection');
            }

            setTranscript('');
            startListening();
        } catch (error) {
            console.error('Session processing error:', error);
        } finally {
            isProcessingRef.current = false;
            setIsProcessing(false);
        }
    }, [phase, variables, currentCycle, setPhase, setVariables, addHistory, incrementCycle, resetCycle, addInsight, stopListening, startListening, speak, setTranscript]);

    // セッション開始ハンドラ
    const handleStartSession = async () => {
        setHasStarted(true);
        isProcessingRef.current = true;
        setIsProcessing(true);

        if (phase === 'intro') {
            console.log('[Session] Triggering initial greeting.');
            await speak("「まるまるしたいけれど、まるまるできない」、の形式で教えてください", { delay: 500 });
        } else {
            // intro 以外のフェーズで再開した場合
            console.log('[Session] Resuming session.');
        }

        isProcessingRef.current = false;
        setIsProcessing(false);
        startListening();
    };

    // 音声入力の監視
    React.useEffect(() => {
        if (!hasStarted) return;
        if (transcript && !isListening && !isProcessingRef.current) {
            console.log('[Session] Final transcript detected:', transcript);
            processResponse(transcript);
        }
    }, [transcript, isListening, processResponse, hasStarted]);

    // 手動での聞き取り再開（クリック時）
    const handleManualRestart = () => {
        if (!hasStarted) return;

        console.log('[Session] Manual restart triggered.');

        // 処理中・考え中の場合でも強制的にリセットする（スタック回避のため）
        if (isProcessingRef.current || isProcessing) {
            console.log('[Session] Force resetting stuck state.');
            isProcessingRef.current = false;
            setIsProcessing(false);
            cancel(); // 読み上げ中なら止める
        }

        // 基本的に常にstartListeningを試みる
        if (!isListening) {
            startListening();
        }
    };

    // 音声認識の自動復帰監視 (Watchdog)
    React.useEffect(() => {
        if (!hasStarted) return;
        if (isProcessing) return; // 処理中・発話中は再開しない

        // 本来マイクがONであるべき状態なのにOFFになっている場合
        if (!isListening) {
            // 少し待ってから再開（エラー直後の連打防止）
            const timer = setTimeout(() => {
                // コンポーネントがアンマウントされていたり、状態が変わっていたら何もしない
                if (!isProcessingRef.current && hasStarted) {
                    console.log('[Session] Microphone stopped unexpectedly, restarting...');
                    startListening();
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [hasStarted, isProcessing, isListening, startListening]);

    if (!hasStarted) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '20px'
            }}>
                <button
                    onClick={handleStartSession}
                    style={{
                        padding: '15px 40px',
                        fontSize: '1.5rem',
                        backgroundColor: '#ffcc00',
                        color: '#333',
                        border: 'none',
                        borderRadius: '50px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(255, 204, 0, 0.4)',
                        fontWeight: 'bold',
                        transition: 'transform 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    セッションを始める
                </button>
                <p style={{ color: '#fff', fontSize: '1.1rem' }}>
                    音声を使用します。ボリュームを調整してください。
                </p>
            </div>
        );
    }

    return (
        <div
            translate="no" // Google翻訳の干渉を防止
            onClick={handleManualRestart}
            style={{
                position: 'fixed',
                bottom: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                zIndex: 1000,
                cursor: 'pointer',
            }}
        >
            {/* マイクアイコン */}
            <div
                style={{
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
                    position: 'relative',
                }}
            >
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

                {(!isListening && !isProcessing) && (
                    <div style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        width: '15px',
                        height: '15px',
                        backgroundColor: '#ffcc00',
                        borderRadius: '50%',
                        border: '2px solid #333'
                    }} />
                )}
            </div>

            {/* ステータステキスト */}
            <div className="chalk-text" style={{
                fontSize: '1.2rem',
                opacity: 0.9,
                textAlign: 'center',
                height: '2rem'
            }}>
                {isListening ? (
                    <span>🎤 話してください...</span>
                ) : isProcessing ? (
                    <span>💭 考え中...</span>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>(マイクを待機中)</span>
                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>クリックして再開</span>
                    </div>
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
