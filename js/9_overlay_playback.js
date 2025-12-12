/**
 * 9_overlay_playback.js (v3: 安定化修正版)
 * 自分の声とモデル音声（TTS）を同時に再生するプラグイン。
 * ・AudioContextを使い回すことで「2回目以降音が小さくなる」バグを修正
 * ・タイミング調整を廃止し、モデル音声が再生されない問題を解決
 */

(function() {
    // 音量設定
    const USER_VOLUME_GAIN = 3.0; // ユーザー音声を3倍に増幅
    const MODEL_VOLUME = 1.0;     // モデル音声も最大音量で

    // 増幅器（AudioContext）は1つだけ作って使い回す（リソース枯渇防止）
    let overlayCtx = null;

    // ボタンを注入する処理
    function injectOverlayButton() {
        const replayBtn = document.getElementById('replay-user-btn');
        if (!replayBtn || document.getElementById('overlay-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'overlay-btn';
        btn.innerText = "👥 Compare (Overlap)";
        btn.className = "action-btn";
        
        btn.style.marginTop = "10px";
        btn.style.marginLeft = "5px";
        btn.style.background = "#6366f1";
        btn.style.color = "white";
        btn.style.display = "none";

        btn.onclick = playOverlayAudio;

        replayBtn.parentNode.insertBefore(btn, replayBtn.nextSibling);

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    btn.style.display = replayBtn.style.display;
                }
            });
        });
        observer.observe(replayBtn, { attributes: true });
    }

    // 重ね合わせ再生ロジック
    async function playOverlayAudio() {
        if (!window.userAudioBlob) {
            alert("No recording found!");
            return;
        }
        if (!window.targetObj || !window.targetObj.w) return;

        // --- 1. 増幅器 (AudioContext) の準備 ---
        if (!overlayCtx) {
            overlayCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // サスペンド状態なら叩き起こす (iOS対策)
        if (overlayCtx.state === 'suspended') {
            await overlayCtx.resume();
        }

        // --- 2. モデル音声 (TTS) の再生 ---
        // ★修正: 遅延(setTimeout)を廃止し、クリック直後に実行させることでブロックを防ぐ
        window.speechSynthesis.cancel(); // 前の読み上げをキャンセル
        
        const modelUtterance = new SpeechSynthesisUtterance(window.targetObj.w);
        modelUtterance.lang = 'en-US';
        modelUtterance.rate = window.speechRate || 0.8;
        modelUtterance.volume = MODEL_VOLUME; 
        
        // 再生実行
        window.speechSynthesis.speak(modelUtterance);

        // --- 3. ユーザー音声 (増幅再生) ---
        try {
            const arrayBuffer = await window.userAudioBlob.arrayBuffer();
            // デコードは毎回行う必要がある（BufferSourceは使い捨てのため）
            const audioBuffer = await overlayCtx.decodeAudioData(arrayBuffer);

            const source = overlayCtx.createBufferSource();
            source.buffer = audioBuffer;

            const gainNode = overlayCtx.createGain();
            gainNode.gain.value = USER_VOLUME_GAIN; // 音量ブースト

            source.connect(gainNode);
            gainNode.connect(overlayCtx.destination);

            source.start(0);

        } catch (e) {
            console.error("Audio Playback Error:", e);
            // エラー時は通常のAudioタグでフォールバック再生
            const simpleAudio = new Audio(URL.createObjectURL(window.userAudioBlob));
            simpleAudio.play();
        }
    }

    window.addEventListener('load', () => {
        setTimeout(injectOverlayButton, 1000);
        
        const originalNext = window.nextQuestion;
        window.nextQuestion = function() {
            if(originalNext) originalNext();
            setTimeout(injectOverlayButton, 500);
        };
    });

})();