/**
 * 18_ios_mic_fix.js
 * iPhone (iOS Safari) などで、ページを閉じたりバックグラウンドにした際に
 * マイクの使用状態（オレンジの点）が残り続ける問題を解決するためのパッチ。
 */

(function() {
    // ページが隠れたり、閉じられたりした時に実行
    function forceStopMicrophone() {
        console.log("iOS Mic Fix: Releasing resources...");

        // 1. MediaStream (getUserMedia) の停止
        if (window.currentStream) {
            try {
                window.currentStream.getTracks().forEach(track => {
                    track.stop(); // ここでハードウェアレベルの停止命令を送る
                    console.log("Track stopped:", track.kind);
                });
            } catch(e) {
                console.error("Error stopping stream:", e);
            }
            window.currentStream = null;
        }

        // 2. MediaRecorder の停止
        if (window.mediaRecorder && window.mediaRecorder.state !== 'inactive') {
            try {
                window.mediaRecorder.stop();
            } catch(e) {}
        }

        // 3. Web Speech API の停止
        if (window.webRecognition) {
            try {
                window.webRecognition.abort(); // stop()ではなくabort()で即切断
            } catch(e) {}
            window.webRecognition = null;
        }

        // 4. AudioContext の停止 (バッテリー消費防止)
        if (window.audioCtx && window.audioCtx.state === 'running') {
            try {
                window.audioCtx.suspend();
            } catch(e) {}
        }

        // 5. アプリ状態のリセット
        if (typeof window.isRecording !== 'undefined') {
            window.isRecording = false;
        }

        // UIの見た目も戻しておく (次に開いた時のため)
        const btn = document.getElementById('rec-btn');
        if (btn) {
            btn.classList.remove('recording');
            btn.classList.remove('processing');
            btn.innerText = "🎤 Start";
        }
    }

    // iOSでは unload よりも pagehide が確実に発火する
    window.addEventListener('pagehide', forceStopMicrophone);

    // タブ切り替えやホーム画面に戻った時にも停止させる (プライバシー保護推奨動作)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            forceStopMicrophone();
        }
    });

})();