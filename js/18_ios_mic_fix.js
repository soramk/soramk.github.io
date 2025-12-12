/**
 * 18_ios_mic_fix.js (v6: 再開対応・完全クリーンアップ版)
 * iPhone (iOS) でホームに戻った際、マイクとオーディオエンジンを物理的に破棄し、
 * かつ「次回起動時に再生成できる状態（null）」にリセットします。
 */

(function() {
    function forceStopMicrophone() {
        console.log("iOS Mic Fix: Cleaning up audio resources...");

        // 1. MediaStream (マイク入力) の停止
        if (window.currentStream) {
            try {
                window.currentStream.getTracks().forEach(track => {
                    track.stop();
                    track.enabled = false;
                });
            } catch(e) { console.error(e); }
            window.currentStream = null;
        }

        // 2. MediaRecorder の停止
        if (window.mediaRecorder) {
            if (window.mediaRecorder.state !== 'inactive') {
                try { window.mediaRecorder.stop(); } catch(e) {}
            }
            window.mediaRecorder = null;
        }

        // 3. Web Speech API の停止
        if (window.webRecognition) {
            try { window.webRecognition.abort(); } catch(e) {}
            window.webRecognition = null;
        }

        // 4. AudioContext の完全破棄 (重要)
        // ここで close() して null にしないと、次回録音時に「死んだAudioContext」を使おうとして動かなくなる
        if (window.audioCtx) {
            try {
                window.audioCtx.close(); 
            } catch(e) {}
            window.audioCtx = null; // ★これが再開の鍵
        }

        // オーバーレイ再生用のContextも破棄
        if (window.overlayCtx) {
            try { window.overlayCtx.close(); } catch(e){}
            window.overlayCtx = null;
        }

        // 5. フラグリセット
        if (typeof window.isRecording !== 'undefined') window.isRecording = false;

        // UIリセット
        const btn = document.getElementById('rec-btn');
        if (btn) {
            btn.classList.remove('recording', 'processing');
            btn.innerText = "🎤 Start";
        }
    }

    // イベント監視
    window.addEventListener('pagehide', forceStopMicrophone);
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            forceStopMicrophone();
        }
    });
    // freezeイベントも監視（念のため）
    window.addEventListener('freeze', forceStopMicrophone);

})();