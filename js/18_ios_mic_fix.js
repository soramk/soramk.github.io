/**
 * 18_ios_mic_fix.js (v3: 完全遮断版)
 * iPhone (iOS Safari) でホームに戻ったり画面を閉じた際に、
 * マイクのリソースを徹底的に破棄し、オレンジ色のインジケーターを消すパッチ。
 */

(function() {
    function forceStopMicrophone() {
        console.log("iOS Mic Fix: Killing all audio inputs...");

        // 1. MediaStream (マイク入力) の物理切断
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
        if (window.mediaRecorder && window.mediaRecorder.state !== 'inactive') {
            try { window.mediaRecorder.stop(); } catch(e) {}
        }

        // 3. Web Speech API の停止
        if (window.webRecognition) {
            try { window.webRecognition.abort(); } catch(e) {}
            window.webRecognition = null;
        }

        // 4. AudioContext の停止 (重要: これが動いているとマイク中とみなされることがある)
        if (window.audioCtx) {
            try {
                // suspend() ではなく close() してしまうのが確実だが、
                // 再開が面倒になるので suspend に留める。ただしiOSでは効きにくい場合あり。
                if (window.audioCtx.state === 'running') {
                    window.audioCtx.suspend();
                }
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
    // pagehide: タブを閉じる/移動する時
    window.addEventListener('pagehide', forceStopMicrophone);
    
    // visibilitychange: ホームに戻る/別のアプリに行く時
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            forceStopMicrophone();
        }
    });
    
    // freeze: iOS特有のメモリ凍結時
    window.addEventListener('freeze', forceStopMicrophone);

    // blur: ウィンドウからフォーカスが外れた時（念のため）
    window.addEventListener('blur', () => {
        // 録音中であれば止める
        if (typeof window.isRecording !== 'undefined' && window.isRecording) {
            forceStopMicrophone();
        }
    });

})();