import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * カスタム音声認識フック
 * Web Speech API (webkitSpeechRecognition) を使用
 * 発話終了後、2秒の沈黙で確定
 */
export const useSpeechRecognition = () => {
    const [transcript, setTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const finalTranscriptRef = useRef('');
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // クリーンアップ関数
    const stopRecognition = useCallback(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.error('Error stopping recognition:', e);
            }
        }
    }, []);

    const startListening = useCallback(() => {
        if (isListening) {
            console.log('Already listening, skipping start.');
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('Speech recognition not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ja-JP';

        recognition.onstart = () => {
            console.log('Recognition started');
            setIsListening(true);
            finalTranscriptRef.current = '';
            setTranscript('');
        };

        recognition.onend = () => {
            console.log('Recognition ended');
            setIsListening(false);
            // 終了時に結果があればセット
            if (finalTranscriptRef.current) {
                console.log('Setting final transcript on end:', finalTranscriptRef.current);
                setTranscript(finalTranscriptRef.current);
            }
            recognitionRef.current = null;
        };

        recognition.onerror = (event: any) => {
            console.error('Recognition error:', event.error);
            if (event.error === 'no-speech') {
                // 無音の場合は無視して終了（必要なら再開ロジックを検討）
            }
            // エラー時も停止扱いにする
            stopRecognition();
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            let interimTrans = '';
            let finalResult = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalResult += result[0].transcript;
                } else {
                    interimTrans += result[0].transcript;
                }
            }

            if (finalResult) {
                finalTranscriptRef.current += finalResult;

                // 沈黙タイマーのリセット
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                }
                silenceTimerRef.current = setTimeout(() => {
                    console.log('Silence detected, stopping...');
                    stopRecognition();
                }, 2000);
            }

            // 途中経過も表示したい場合はここで setTranscript するか検討
            // 今回は最終確定時に SessionManager が反応するため、途中経過を表示用に入れるなら state を分けるか、
            // SessionManager側で transcript をリアルタイム表示に使っているならここでも setTranscript する。
            if (interimTrans || finalResult) {
                setTranscript(finalTranscriptRef.current + interimTrans);
            }
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            console.error('Failed to start recognition:', e);
            setIsListening(false);
        }
    }, [isListening, stopRecognition]);

    // コンポーネントアンマウント時のクリーンアップ
    useEffect(() => {
        return () => {
            stopRecognition();
        };
    }, [stopRecognition]);

    return { transcript, isListening, startListening, stopListening: stopRecognition, setTranscript };
};
