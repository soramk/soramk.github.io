/**
 * util_ios_mic_fix.js (v8: 完全クリーンアップ & マイクアイコン修正版)
 * iPhone (iOS) でホームに戻った際はマイク・オーディオを物理破壊し、
 * ★次回「開始」ボタンを押した瞬間に、自動でオーディオエンジンを再生成（蘇生）します。
 * 
 * 修正内容:
 * - バックグラウンド移行時の完全なクリーンアップ
 * - ビジュアライザーのアニメーションループ停止
 * - アナライザーノードの切断
 * - UIの完全なリセット（マイクアイコンの非表示）
 */

(function() {
    // --- 1. 完全クリーンアップ処理 ---
    function forceStopMicrophone() {
        console.log("iOS Mic Fix: Cleaning up audio resources...");

        // 録音状態を即座にfalseに（これによりvisualize関数のループも自動停止）
        if (typeof window.isRecording !== 'undefined') window.isRecording = false;

        // アナライザーノードとオーディオソースノードの切断
        if (window.audioSourceNode) {
            try {
                window.audioSourceNode.disconnect();
            } catch(e) {}
            window.audioSourceNode = null;
        }
        if (window.analyser) {
            try {
                window.analyser.disconnect();
            } catch(e) {}
            window.analyser = null;
        }

        // マイクストリーム停止
        if (window.currentStream) {
            try {
                window.currentStream.getTracks().forEach(track => {
                    track.stop();
                    track.enabled = false;
                });
            } catch(e) {}
            window.currentStream = null;
        }

        // MediaRecorder停止
        if (window.mediaRecorder) {
            try {
                if (window.mediaRecorder.state !== 'inactive') {
                    window.mediaRecorder.stop();
                }
            } catch(e) {}
            window.mediaRecorder = null;
        }

        // Web Speech API停止
        if (window.webRecognition) {
            try { 
                window.webRecognition.abort(); 
            } catch(e) {}
            window.webRecognition = null;
        }

        // AudioContext破壊 (iOSのオレンジ点灯対策)
        if (window.audioCtx) {
            try { 
                window.audioCtx.close(); 
            } catch(e) {}
            window.audioCtx = null;
        }
        if (window.overlayCtx) {
            try { 
                window.overlayCtx.close(); 
            } catch(e) {}
            window.overlayCtx = null;
        }

        // ビジュアライザーのアニメーションループを停止
        if (window.visualizerAnimationFrameId !== null) {
            try {
                cancelAnimationFrame(window.visualizerAnimationFrameId);
            } catch(e) {}
            window.visualizerAnimationFrameId = null;
        }

        // ビジュアライザーの状態リセット
        if (typeof resetVisualizerState === 'function') {
            resetVisualizerState();
        }

        // UIの完全なリセット
        const btn = document.getElementById('rec-btn');
        if (btn) {
            btn.classList.remove('recording', 'processing');
            btn.innerText = "🎤 開始";
            btn.style.display = 'block';
        }

        // フィードバックエリアのリセット
        const feedback = document.getElementById('feedback-area');
        if (feedback) {
            feedback.className = 'feedback';
            feedback.innerText = '準備完了';
        }

        // マイクレベル表示のリセット
        const micDebug = document.getElementById('mic-debug');
        if (micDebug) {
            micDebug.innerText = 'マイク準備完了';
        }

        // 再生ボタンの非表示
        const replayBtn = document.getElementById('replay-user-btn');
        if (replayBtn) {
            replayBtn.style.display = 'none';
        }

        console.log("iOS Mic Fix: Cleanup completed.");
    }

    // --- 2. ★追加: オーディオエンジンの自動蘇生 (Resurrector) ---
    // グローバルに公開して、他のファイルからも呼び出せるようにする
    window.ensureAudioContext = function() {
        // AudioContextが存在しない、またはclosed状態の場合は再生成
        if (!window.audioCtx || window.audioCtx.state === 'closed') {
            console.log("iOS Mic Fix: Resurrecting AudioContext...");
            try {
                if (window.audioCtx && window.audioCtx.state === 'closed') {
                    window.audioCtx = null;
                }
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                window.audioCtx = new window.AudioContext();
                console.log("iOS Mic Fix: AudioContext created, state:", window.audioCtx.state);
            } catch(e) {
                console.error("iOS Mic Fix: Failed to create AudioContext:", e);
            }
        } else if (window.audioCtx.state === 'suspended') {
            // suspended状態の場合はresumeを試みる
            window.audioCtx.resume().then(() => {
                console.log("iOS Mic Fix: AudioContext resumed");
            }).catch(e => {
                console.error("iOS Mic Fix: Failed to resume AudioContext:", e);
            });
        }
    };

    function attachAudioResurrector() {
        const btn = document.getElementById('rec-btn');
        if (!btn) return;

        // 既存のクリックイベントよりも「前」に実行したいので、
        // addEventListenerの capture オプション(true) を使う
        
        // ここでは「クリックされた瞬間」に audioCtx が死んでいたら生き返らせる
        btn.addEventListener('click', () => {
            // 録音開始しようとしている場合
            if (!window.isRecording) {
                window.ensureAudioContext();
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

    // バックグラウンド移行検知（複数のイベントで確実に検知）
    window.addEventListener('pagehide', forceStopMicrophone);
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            forceStopMicrophone();
        }
    });
    window.addEventListener('blur', () => {
        // ウィンドウがフォーカスを失ったとき（別タブや別アプリに切り替え）
        if (window.isRecording) {
            forceStopMicrophone();
        }
    });
    window.addEventListener('freeze', forceStopMicrophone);
    
    // iOS Safari特有のイベント
    document.addEventListener('pause', forceStopMicrophone, false);
    
    // ページがアンロードされる前にもクリーンアップ
    window.addEventListener('beforeunload', forceStopMicrophone);

})();