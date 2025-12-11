/**
 * 9_overlay_playback.js
 * 自分の声とモデル音声（TTS）を同時に再生し、比較・矯正を行うためのプラグイン。
 */

(function() {
    // ボタンを注入する処理
    function injectOverlayButton() {
        // 既存の「自分の声を再生」ボタンを探す
        const replayBtn = document.getElementById('replay-user-btn');
        
        // まだボタンがない、あるいは既に追加済みなら何もしない
        if (!replayBtn || document.getElementById('overlay-btn')) return;

        // 新しいボタンを作成
        const btn = document.createElement('button');
        btn.id = 'overlay-btn';
        btn.innerText = "👥 Compare (Overlap)";
        btn.className = "action-btn";
        
        // スタイル調整（既存ボタンと並べるため）
        btn.style.marginTop = "10px";
        btn.style.marginLeft = "5px"; // 少し隙間を空ける
        btn.style.background = "#6366f1"; // インディゴ色で区別
        btn.style.color = "white";
        btn.style.display = "none"; // 最初は隠しておく

        // クリック時の動作
        btn.onclick = playOverlayAudio;

        // 既存ボタンの後ろに追加
        replayBtn.parentNode.insertBefore(btn, replayBtn.nextSibling);

        // 既存ボタンの表示状態を監視して、連動させる
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
    function playOverlayAudio() {
        // 1. ユーザーの音声データがあるか確認
        if (!window.userAudioBlob) {
            alert("No recording found!");
            return;
        }

        // 2. ターゲット単語があるか確認
        if (!window.targetObj || !window.targetObj.w) return;

        // --- 再生準備 ---

        // A. ユーザー音声
        const userAudioUrl = URL.createObjectURL(window.userAudioBlob);
        const userAudio = new Audio(userAudioUrl);
        userAudio.volume = 1.0; // ユーザーの声を少し大きめに

        // B. モデル音声 (Web Speech API TTS)
        window.speechSynthesis.cancel(); // 前の再生をキャンセル
        const modelUtterance = new SpeechSynthesisUtterance(window.targetObj.w);
        modelUtterance.lang = 'en-US';
        modelUtterance.rate = window.speechRate || 0.8;
        modelUtterance.volume = 0.6; // モデル音声を少し控えめに（被ると聞き取りにくいため）

        // --- 同時再生実行 ---
        
        // ユーザー音声を再生開始
        userAudio.play();
        
        // わずかな遅延（0.1秒）を入れてモデル音声を再生
        // ※ 完全に同時だと位相干渉で聞こえにくくなることがあるため、ごく僅かにズラすと「シャドーイング」しやすくなります
        setTimeout(() => {
            window.speechSynthesis.speak(modelUtterance);
        }, 100);
    }

    // アプリ読み込み完了後にボタン注入を試みる
    window.addEventListener('load', () => {
        // DOM生成待ち
        setTimeout(injectOverlayButton, 1000);
        
        // 念のため、画面遷移（次の問題へ）のたびにボタン再チェックを行うフック
        const originalNext = window.nextQuestion;
        window.nextQuestion = function() {
            if(originalNext) originalNext();
            setTimeout(injectOverlayButton, 500);
        };
    });

})();