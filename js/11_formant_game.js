/**
 * 11_formant_game.js (Fix Version)
 * 既存の visualize 関数を「上書き」するのではなく、
 * ゲームモード以外は「元の関数を呼び出す」設計に変更しました。
 * これにより、元の波形やスペクトログラムの表示崩れを完全に防ぎます。
 */

(function() {
    // --- 定数設定 ---
    const GAME_MODE_NAME = 'formant_game';
    
    // F3の検出範囲 (Hz)
    // 一般的なF3: 男性2500Hz前後, 女性3000Hz前後
    // Rの低下: 1500Hz〜2000Hz付近まで落ちる
    const FREQ_MIN = 1200;
    const FREQ_MAX = 3500;

    // --- 1. 元の関数を退避（バックアップ） ---
    // これを使って、ゲームモード以外の時は元の処理に丸投げします
    const originalToggleVisMode = window.toggleVisMode;
    const originalVisualize = window.visualize;

    // --- 2. モード切替ロジックの拡張 ---
    
    window.toggleVisMode = function() {
        // サイクル: wave -> spectrogram -> frequency -> [GAME] -> wave
        if (window.visMode === 'frequency') {
            window.visMode = GAME_MODE_NAME;
            updateGameExplanation();
        } else if (window.visMode === GAME_MODE_NAME) {
            window.visMode = 'wave';
            // 元の表示に戻すため、標準の説明更新を呼ぶ
            if (typeof updateVisExplanation === 'function') updateVisExplanation();
        } else {
            // それ以外は元のロジックに任せる
            if (originalToggleVisMode) originalToggleVisMode();
        }
    };

    function updateGameExplanation() {
        const el = document.getElementById('vis-explanation');
        const label = document.getElementById('vis-label');
        
        if (window.visMode === GAME_MODE_NAME) {
            if(el) el.innerHTML = "【🎯 F3ハンター】<br>声を出しながら黄色いボールを操作しよう！<br><b>R (Right):</b> 舌を奥に引いてボールを「下」へ。<br><b>L (Light):</b> 舌を前歯の裏に当ててボールを「上」へ。";
            if(label) label.innerText = "F3 GAME";
        }
    }


    // --- 3. 描画ループの拡張 (ここが修正の肝) ---

    window.visualize = function() {
        // 録音中でなければ何もしない（元のロジック準拠）
        if(!window.isRecording) return;

        if (window.visMode === GAME_MODE_NAME) {
            // --- A. ゲームモードの場合 ---
            // 自分で描画し、自分で次のフレームを予約する
            drawGameMode();
            requestAnimationFrame(window.visualize);
        } else {
            // --- B. それ以外（Wave, Spectrogram, Spectrum） ---
            // ★重要: 元の関数を呼び出すだけ！
            // 元の関数内で requestAnimationFrame(visualize) が呼ばれるため、ループは継続する
            if (originalVisualize) originalVisualize();
        }
    };


    // --- 4. ゲームモードの描画ロジック ---

    function drawGameMode() {
        const canvas = document.getElementById("visualizer");
        if (!canvas || !window.analyser || !window.dataArray) return;
        
        const ctx = canvas.getContext("2d");
        // Canvasの解像度対応
        const d = window.devicePixelRatio || 1;
        // CSS上のサイズを取得しないと、拡大縮小でおかしくなることがあるため実サイズを使用
        const w = canvas.width / d;
        const h = canvas.height / d;

        // 周波数データを取得
        window.analyser.getByteFrequencyData(window.dataArray);

        // 背景クリア
        ctx.fillStyle='#020617'; 
        ctx.fillRect(0,0,w,h);

        // --- ゾーンの描画 ---
        // L Zone (Top, Blue)
        ctx.fillStyle = 'rgba(30, 64, 175, 0.3)';
        ctx.fillRect(0, 0, w, h * 0.4); 
        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText("L Zone (Target)", 10, 20);

        // R Zone (Bottom, Red)
        ctx.fillStyle = 'rgba(153, 27, 27, 0.3)';
        ctx.fillRect(0, h * 0.6, w, h * 0.4); 
        ctx.fillStyle = '#f87171';
        ctx.fillText("R Zone (Target)", 10, h - 10);

        // --- ピーク検出 (F3付近) ---
        const sampleRate = window.audioCtx.sampleRate;
        const fftSize = window.analyser.fftSize; 
        const hzPerBin = sampleRate / fftSize; 

        // 検索範囲 (インデックス)
        const startBin = Math.floor(FREQ_MIN / hzPerBin);
        const endBin = Math.floor(FREQ_MAX / hzPerBin);

        let maxVal = 0;
        let maxIndex = 0;
        
        // 範囲内で最大の音量を持つ周波数を探す
        // ノイズ対策: 少し平均化するか、単純に最大値を取る
        for (let i = startBin; i <= endBin; i++) {
            if (window.dataArray[i] > maxVal) {
                maxVal = window.dataArray[i];
                maxIndex = i;
            }
        }

        // --- ボールの位置計算 ---
        const currentHz = maxIndex * hzPerBin;
        
        // 正規化 (0.0 ～ 1.0)
        let normalizedPos = (currentHz - FREQ_MIN) / (FREQ_MAX - FREQ_MIN);
        if(normalizedPos < 0) normalizedPos = 0;
        if(normalizedPos > 1) normalizedPos = 1;

        // Y座標 (Canvasは上が0なので 1.0 - pos)
        // normalizedPos: 0(低音=R) -> 1(高音=L)
        // Y座標: h(下) -> 0(上)
        const targetY = h - (normalizedPos * h);

        // --- 描画 ---
        if (maxVal > 50) { // ある程度の音量がある時だけ表示
            // ボール
            ctx.beginPath();
            ctx.arc(w / 2, targetY, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#facc15'; // Yellow
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 周波数表示
            ctx.fillStyle = '#fff';
            ctx.font = '12px monospace';
            ctx.fillText(`${Math.round(currentHz)}Hz`, w/2 + 20, targetY + 4);

            // ヒット判定テキスト
            ctx.font = 'bold 24px sans-serif';
            if (normalizedPos > 0.6) { 
                ctx.fillStyle = '#60a5fa';
                ctx.fillText("Hit! L", w - 80, h/2);
            } else if (normalizedPos < 0.4) {
                ctx.fillStyle = '#f87171';
                ctx.fillText("Hit! R", w - 80, h/2);
            }
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("Speak Louder...", w/2, h/2);
            ctx.textAlign = 'left'; // 戻す
        }
    }

})();