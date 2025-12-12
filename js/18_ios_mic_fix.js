/**
 * 18_ios_mic_fix.js (v7: 自動蘇生 & 完全クリーンアップ版)
 * iPhone (iOS) でホームに戻った際はマイク・オーディオを物理破壊し、
 * ★次回「Start」ボタンを押した瞬間に、自動でオーディオエンジンを再生成（蘇生）します。
 */

(function() {
    // --- 1. クリーンアップ処理 (前回と同じ) ---
    function forceStopMicrophone() {
        console.log("iOS Mic Fix: Cleaning up audio resources...");

        // マイク停止
        if (window.currentStream) {
            try {
                window.currentStream.getTracks().forEach(track => {
                    track.stop();
                    track.enabled = false;
                });
            } catch(e) {}
            window.currentStream = null;
        }

        // Recorder停止
        if (window.mediaRecorder) {
            if (window.mediaRecorder.state !== 'inactive') {
                try { window.mediaRecorder.stop(); } catch(e) {}
            }
            window.mediaRecorder = null;
        }

        // Web Speech API停止
        if (window.webRecognition) {
            try { window.webRecognition.abort(); } catch(e) {}
            window.webRecognition = null;
        }

        // AudioContext破壊 (iOSのオレンジ点灯対策)
        if (window.audioCtx) {
            try { window.audioCtx.close(); } catch(e) {}
            window.audioCtx = null;
        }
        if (window.overlayCtx) {
            try { window.overlayCtx.close(); } catch(e) {}
            window.overlayCtx = null;
        }

        if (typeof window.isRecording !== 'undefined') window.isRecording = false;

        // UIリセット
        const btn = document.getElementById('rec-btn');
        if (btn) {
            btn.classList.remove('recording', 'processing');
            btn.innerText = "🎤 Start";
        }
    }

    // --- 2. ★追加: オーディオエンジンの自動蘇生 (Resurrector) ---
    function attachAudioResurrector() {
        const btn = document.getElementById('rec-btn');
        if (!btn) return;

        // 既存のクリックイベントよりも「前」に実行したいので、
        // addEventListenerの capture オプション(true) を使うか、
        // あるいは単純にクリック時にチェックする
        
        // ここでは「クリックされた瞬間」に audioCtx が死んでいたら生き返らせる
        btn.addEventListener('click', () => {
            // 録音開始しようとしているのに audioCtx がない場合
            if (!window.isRecording && !window.audioCtx) {
                console.log("iOS Mic Fix: Resurrecting AudioContext...");
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                window.audioCtx = new window.AudioContext();
            }
        }, true); // true = capture phase (他の処理より先に実行)
    }

    // --- 3. イベント登録 ---
    window.addEventListener('load', () => {
        // ボタンに蘇生機能を付与
        attachAudioResurrector();
        // 念のため少し待ってからも再試行 (動的生成対策)
        setTimeout(attachAudioResurrector, 1000);
    });

    // バックグラウンド移行検知
    window.addEventListener('pagehide', forceStopMicrophone);
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            forceStopMicrophone();
        }
    });
    window.addEventListener('freeze', forceStopMicrophone);

})();