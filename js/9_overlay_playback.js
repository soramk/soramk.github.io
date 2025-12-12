/**
 * 9_overlay_playback.js (v2: 音量ブースト版)
 * 自分の声とモデル音声（TTS）を同時に再生し、比較・矯正を行うプラグイン。
 * ★自分の声が小さい場合に備え、GainNodeを使って音量を増幅(ブースト)させます。
 */

(function() {
    // 増幅率 (1.0 = そのまま, 2.0 = 2倍, 3.0 = 3倍)
    // スマホのマイク入力は小さいことが多いので大きめに設定
    const USER_VOLUME_GAIN = 3.0; 
    const MODEL_VOLUME = 0.8;

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

        // --- A. ユーザー音声 (AudioContextで増幅再生) ---
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        try {
            // BlobをArrayBufferに変換してデコード
            const arrayBuffer = await window.userAudioBlob.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            // ソースノード作成
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;

            // ゲインノード (音量増幅) 作成
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = USER_VOLUME_GAIN; // ★ここで音量を3倍にする

            // 接続: Source -> Gain -> Speaker
            source.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // 再生開始
            source.start(0);

        } catch (e) {
            console.error("Audio Boost Error:", e);
            // エラー時はフォールバックとして通常の再生を行う
            const simpleAudio = new Audio(URL.createObjectURL(window.userAudioBlob));
            simpleAudio.volume = 1.0;
            simpleAudio.play();
        }

        // --- B. モデル音声 (TTS) ---
        // ユーザーの声と被りすぎないよう、わずかに遅らせて再生
        setTimeout(() => {
            window.speechSynthesis.cancel();
            const modelUtterance = new SpeechSynthesisUtterance(window.targetObj.w);
            modelUtterance.lang = 'en-US';
            modelUtterance.rate = window.speechRate || 0.8;
            modelUtterance.volume = MODEL_VOLUME; 
            window.speechSynthesis.speak(modelUtterance);
        }, 100);
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