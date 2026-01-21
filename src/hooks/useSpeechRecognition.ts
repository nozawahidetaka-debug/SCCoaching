import { useState, useEffect, useCallback, useRef } from 'react';

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

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('Speech recognition not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;  // 継続モードで長めに待つ
        recognition.interimResults = true;
        recognition.lang = 'ja-JP';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => {
            setIsListening(false);
            // 継続モードで終了した場合、最終結果を確定
            if (finalTranscriptRef.current) {
                console.log('Final transcript (on end):', finalTranscriptRef.current);
                setTranscript(finalTranscriptRef.current);
                finalTranscriptRef.current = '';
            }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            let finalResult = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalResult += result[0].transcript;
                }
            }

            if (finalResult) {
                finalTranscriptRef.current += finalResult;

                // 沈黙タイマーをリセット（2秒待つ）
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                }
                silenceTimerRef.current = setTimeout(() => {
                    if (finalTranscriptRef.current && recognitionRef.current) {
                        console.log('Silence detected, stopping recognition:', finalTranscriptRef.current);
                        recognitionRef.current.stop();
                    }
                }, 2000); // 2秒の沈黙で確定
            }
        };

        recognitionRef.current = recognition;

        return () => {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        };
    }, []);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            finalTranscriptRef.current = '';
            setTranscript('');
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
            recognitionRef.current.start();
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
            recognitionRef.current.stop();
        }
    }, [isListening]);

    return { transcript, isListening, startListening, stopListening, setTranscript };
};
