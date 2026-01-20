import { useCallback, useRef, useEffect } from 'react';

/**
 * カスタム音声合成フック
 * 落ち着いたトーン、沈黙（間）の制御をサポート
 */
export const useSpeechSynthesis = () => {
    const synthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);
    const voicesLoadedRef = useRef(false);

    // 音声リストをプリロード
    useEffect(() => {
        const loadVoices = () => {
            const voices = synthesisRef.current.getVoices();
            if (voices.length > 0) {
                voicesLoadedRef.current = true;
            }
        };
        loadVoices();
        synthesisRef.current.addEventListener('voiceschanged', loadVoices);
        return () => {
            synthesisRef.current.removeEventListener('voiceschanged', loadVoices);
        };
    }, []);

    const speak = useCallback((text: string, options?: { pitch?: number; rate?: number; delay?: number }) => {
        return new Promise<void>((resolve) => {
            // 指定されたミリ秒待機 (1.2s - 2.0s の「間」を再現するため)
            setTimeout(() => {
                // 既存の発話をキャンセル
                synthesisRef.current.cancel();

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'ja-JP';

                // かわいらしい声の設定（高めのピッチ）
                utterance.pitch = options?.pitch ?? 1.1;  // やや高めのピッチ
                utterance.rate = options?.rate ?? 0.9;    // ゆっくりめの速度

                // 音声の選定 (可能な限り女性らしい声を優先)
                const voices = synthesisRef.current.getVoices();
                const preferredVoice = voices.find(v => v.lang === 'ja-JP' && v.name.includes('Google')) || voices.find(v => v.lang === 'ja-JP');
                if (preferredVoice) {
                    utterance.voice = preferredVoice;
                }

                utterance.onend = () => {
                    resolve();
                };

                utterance.onerror = (e) => {
                    console.error('Speech synthesis error:', e);
                    resolve(); // エラー時も解決して処理を続行
                };

                synthesisRef.current.speak(utterance);

                // 安全策: 30秒後にタイムアウト
                setTimeout(() => {
                    resolve();
                }, 30000);
            }, options?.delay ?? 0);
        });
    }, []);

    const cancel = useCallback(() => {
        synthesisRef.current.cancel();
    }, []);

    return { speak, cancel };
};
