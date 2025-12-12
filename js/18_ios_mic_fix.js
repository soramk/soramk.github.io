/**
 * 18_ios_mic_fix.js (v4: 核ボタン級停止版)
 * iPhone (iOS) でホームに戻ったりした際、マイクを物理的に遮断するパッチ。
 */

(function() {
    function forceStopMicrophone() {
        console.log("iOS Mic Fix: Terminating Audio...");

        // 1. MediaStreamTrack の完全停止
        if (window.currentStream) {
            window.currentStream.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            window.currentStream = null;
        }

        // 2. MediaRecorder の停止
        if (window.mediaRecorder && window.mediaRecorder.state !== 'inactive') {
            try { window.mediaRecorder.stop(); } catch(e) {}
        }
        window.mediaRecorder = null;

        // 3. Web Speech API の停止
        if (window.webRecognition) {
            try { window.webRecognition.abort(); } catch(e) {}
            window.webRecognition = null;
        }

        // 4. AudioContext の停止 (suspendではなくcloseを試みるが、再開不可のためsuspend)
        if (window.audioCtx) {
            try {
                if (window.audioCtx.state === 'running') window.audioCtx.suspend();
            } catch(e) {}
        }
        // オーバーレイ再生用のContextも停止
        if (window.overlayCtx) {
            try { window.overlayCtx.suspend(); } catch(e){}
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

    // iOSのあらゆるバックグラウンド移行イベントをフック
    window.addEventListener('pagehide', forceStopMicrophone);
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') forceStopMicrophone();
    });
    window.addEventListener('freeze', forceStopMicrophone);
    // window.addEventListener('blur', forceStopMicrophone); // blurは誤爆が多いので除外
})();