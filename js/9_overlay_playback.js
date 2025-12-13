/**
 * 9_overlay_playback.js (v4: 音量バランス最適化版)
 * 自分の声を「主役」にし、モデル音声を「背景」にするよう音量を調整。
 */

(function() {
    // ★調整箇所
    const USER_VOLUME_GAIN = 6.0; // ユーザー音声を6倍に増幅 (かなり大きく)
    const MODEL_VOLUME = 0.2;     // モデル音声を20%に下げる (BGM程度に)

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

        // --- モデル音声 (音量を小さく) ---
        window.speechSynthesis.cancel();
        const modelUtterance = new SpeechSynthesisUtterance(window.targetObj.w);
        modelUtterance.lang = 'en-US';
        modelUtterance.rate = window.speechRate || 0.8;
        modelUtterance.volume = MODEL_VOLUME; // ★ここで下げる
        window.speechSynthesis.speak(modelUtterance);

        // --- ユーザー音声 (音量を大きく) ---
        try {
            const arrayBuffer = await window.userAudioBlob.arrayBuffer();
            const audioBuffer = await window.overlayCtx.decodeAudioData(arrayBuffer);
            const source = window.overlayCtx.createBufferSource();
            source.buffer = audioBuffer;

            const gainNode = window.overlayCtx.createGain();
            gainNode.gain.value = USER_VOLUME_GAIN; // ★ここで上げる

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