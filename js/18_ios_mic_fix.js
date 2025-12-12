/**
 * 18_ios_mic_fix.js (v2: 強力停止版)
 * iPhone (iOS Safari) でホームに戻ったり画面を閉じた際に、
 * マイクのリソースを確実に解放し、オレンジ色のインジケーターを消すパッチ。
 */

(function() {
    function forceStopMicrophone() {
        // 1. MediaStream (マイク入力) の物理切断
        if (window.currentStream) {
            try {
                window.currentStream.getTracks().forEach(track => {
                    track.stop(); 
                    track.enabled = false; // 念押し
                });
            } catch(e) { console.error(e); }
            window.currentStream = null;
        }

        // 2. MediaRecorder の停止
        if (window.mediaRecorder && window.mediaRecorder.state !== 'inactive') {
            try { window.mediaRecorder.stop(); } catch(e) {}
        }

        // 3. Web Speech API の停止
        if (window.webRecognition) {
            try { window.webRecognition.abort(); } catch(e) {}
            window.webRecognition = null;
        }

        // 4. AudioContext の停止 (サスペンド)
        if (window.audioCtx) {
            try {
                if (window.audioCtx.state === 'running') window.audioCtx.suspend();
            } catch(e) {}
        }

        // 5. アプリ状態のリセット
        if (typeof window.isRecording !== 'undefined') {
            window.isRecording = false;
        }

        // UIリセット
        const btn = document.getElementById('rec-btn');
        if (btn) {
            btn.classList.remove('recording', 'processing');
            btn.innerText = "🎤 Start";
        }
    }

    // iOS用の強力なイベント監視セット
    window.addEventListener('pagehide', forceStopMicrophone);
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') forceStopMicrophone();
    });
    // Safariのバックグラウンドフリーズ対策
    window.addEventListener('freeze', forceStopMicrophone);

})();