/**
 * feature_overlay_playback.js (v5: 音量バランス調整版)
 * 自分の声とモデル音声を同じ音量レベルで再生するよう調整。
 */

(function() {
    // ★調整箇所
    const USER_VOLUME_GAIN = 3.0; // ユーザー音声を3倍に増幅（録音は元々小さいため）
    const MODEL_VOLUME = 0.9;     // モデル音声を90%に調整（バランス調整）

    // 増幅器（Global汚染しないようwindowに紐付け）
    window.overlayCtx = null;

    function injectOverlayButton() {
        const replayBtn = document.getElementById('replay-user-btn');
        if (!replayBtn || document.getElementById('overlay-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'overlay-btn';
        btn.innerText = "👥 比較（重ね合わせ）";
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

    async function playOverlayAudio() {
        if (!window.userAudioBlob) {
            alert("録音が見つかりません！");
            return;
        }
        if (!window.targetObj || !window.targetObj.w) return;

        // Context準備
        if (!window.overlayCtx) {
            window.overlayCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (window.overlayCtx.state === 'suspended') {
            await window.overlayCtx.resume();
        }

        // --- モデル音声 (同じ音量レベル) ---
        window.speechSynthesis.cancel();
        const modelUtterance = new SpeechSynthesisUtterance(window.targetObj.w);
        // アクセント選択機能に対応
        const selectedAccent = localStorage.getItem('lr_selected_accent') || 'en-US';
        modelUtterance.lang = selectedAccent;
        modelUtterance.rate = window.speechRate || 0.8;
        modelUtterance.volume = MODEL_VOLUME; // ★同じ音量レベル
        window.speechSynthesis.speak(modelUtterance);

        // --- ユーザー音声 (同じ音量レベル) ---
        try {
            const arrayBuffer = await window.userAudioBlob.arrayBuffer();
            const audioBuffer = await window.overlayCtx.decodeAudioData(arrayBuffer);
            const source = window.overlayCtx.createBufferSource();
            source.buffer = audioBuffer;

            const gainNode = window.overlayCtx.createGain();
            gainNode.gain.value = USER_VOLUME_GAIN; // ★ユーザー音声を増幅

            source.connect(gainNode);
            gainNode.connect(window.overlayCtx.destination);
            source.start(0);
        } catch (e) {
            console.error("Audio Boost Error:", e);
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