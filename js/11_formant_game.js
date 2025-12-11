/**
 * 11_formant_game.js
 * L/Rの違い（F3フォルマント）を可視化し、ゲーム感覚で調整する「F3 Game」モードを追加するプラグイン。
 * 既存の visualize 関数と toggleVisMode 関数を拡張（フック）します。
 */

(function() {
    // --- 定数設定 ---
    const GAME_MODE_NAME = 'formant_game';
    
    // F3の目安 (Hz)
    // 男性: R=1500-2000Hz, L=2500-3000Hz
    // 女性: R=2000-2500Hz, L=3000-3500Hz
    // 中間をとって広めに設定
    const FREQ_MIN = 1200;
    const FREQ_MAX = 4000;

    // ゲーム状態
    let gameScore = 0;
    let inZoneDuration = 0;

    // --- 1. ビジュアライザー切り替えロジックの拡張 ---
    
    const originalToggleVisMode = window.toggleVisMode;
    
    // トグル関数を上書きして、新しいモードを順序に組み込む
    window.toggleVisMode = function() {
        // 現在のモード遷移: wave -> spectrogram -> frequency -> [GAME] -> wave
        if (window.visMode === 'frequency') {
            window.visMode = GAME_MODE_NAME;
        } else if (window.visMode === GAME_MODE_NAME) {
            window.visMode = 'wave';
        } else {
            // それ以外は元のロジックにお任せ（wave -> spectrogram -> frequency）
            if (originalToggleVisMode) originalToggleVisMode();
            // 元関数が wave に戻してしまうのを防ぐため、もし frequency -> wave になっていたら game に強制変更
            // (元の関数の実装次第ですが、ここでは安全策として独自に管理したほうが確実)
            if (window.visMode === 'wave' && arguments.callee.caller !== originalToggleVisMode) {
                // originalToggleVisModeの実装が見えないため、単純にステートを上書きする
            }
        }
        
        // モード変更後のUI更新
        updateGameExplanation();
    };

    // 説明文の更新ロジックも拡張
    function updateGameExplanation() {
        const el = document.getElementById('vis-explanation');
        const label = document.getElementById('vis-label');
        
        if (window.visMode === GAME_MODE_NAME) {
            if(el) el.innerHTML = "【🎯 F3ハンター (Game)】<br>黄色いボールを操作しよう！<br><b>Rの発音:</b> 舌を引いてボールを「下」の赤枠へ。<br><b>Lの発音:</b> 舌を押し当ててボールを「上」の青枠へ。";
            if(label) label.innerText = "F3 GAME";
        } else {
            // 既存の表示更新関数があればそれを呼ぶ、なければ手動で戻す
            if (typeof updateVisExplanation === 'function') {
                updateVisExplanation();
            }
        }
    }


    // --- 2. 描画ロジックの拡張 (Visualizer Loop) ---

    // 既存の visualize 関数を保持
    const originalVisualize = window.visualize;
    let animationFrameId = null;

    // visualizeを完全に置き換える（既存の再帰ループを乗っ取るため）
    window.visualize = function() {
        // 録音中でなければ停止
        if(!window.isRecording) {
            if(animationFrameId) cancelAnimationFrame(animationFrameId);
            return;
        }

        // 次のフレームを予約
        animationFrameId = requestAnimationFrame(window.visualize);

        // ゲームモード以外なら、元の描画処理に任せる
        if (window.visMode !== GAME_MODE_NAME) {
            // 元の関数の中身だけ実行したいが、再帰呼び出しされると困るため、
            // 元関数のロジックをコピーするか、モード判定部分だけ注入するのが理想。
            // しかし既存コードは関数内で requestAnimationFrame しているため、二重ループになる危険がある。
            // ★安全策: 既存の visualize は「1フレーム分だけ描画する」関数として利用できない（再帰するため）。
            // そのため、ここでは「独自に描画」する。既存モードの描画コードをここに再実装する方が安全。
            
            // ...と思いましたが、既存コードを尊重し、
            // 「既存モードなら originalVisualize を呼び出し、即座に return」させると、
            // originalVisualize が自分で requestAnimationFrame してしまう。
            // 競合を防ぐため、ここでは「描画処理を自前で持つ」アプローチをとります。
            // （コード量が増えますが、最もバグが少ない方法です）
            
            drawCurrentMode();
        } else {
            // ゲームモードの描画
            drawGameMode();
        }
    };

    // 現在のモードに応じた描画（既存ロジックの簡易再実装 + ゲーム）
    function drawCurrentMode() {
        const canvas = document.getElementById("visualizer");
        if(!canvas) return;
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;

        // データ取得
        if(window.analyser) {
            if(window.visMode === 'wave') {
                window.analyser.getByteTimeDomainData(window.dataArray);
            } else {
                window.analyser.getByteFrequencyData(window.dataArray);
            }
        }

        // 背景クリア
        ctx.fillStyle='#020617'; 
        ctx.fillRect(0,0,w,h);

        // 各モード描画
        if (window.visMode === 'wave') {
            ctx.lineWidth=2; ctx.strokeStyle='#0ea5e9'; ctx.beginPath();
            const slice = w * 1.0 / window.dataArray.length; 
            let x = 0;
            for(let i=0; i<window.dataArray.length; i++){
                const v = window.dataArray[i] / 128.0; 
                const y = v * h / 2; 
                if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); 
                x += slice;
            }
            ctx.stroke();

        } else if (window.visMode === 'spectrogram' || window.visMode === 'frequency') {
            // 簡易スペクトラム表示（既存のグラデーションバー）
            const barW = (w / window.dataArray.length) * 2.5; 
            let x = 0;
            for(let i=0; i<window.dataArray.length; i++) {
                const barH = (window.dataArray[i] / 255) * h;
                ctx.fillStyle = `rgb(${barH+100}, 50, 255)`;
                ctx.fillRect(x, h-barH, barW, barH);
                x += barW + 1;
            }
        }
    }

    // ★今回の核心：ゲームモードの描画ロジック
    function drawGameMode() {
        const canvas = document.getElementById("visualizer");
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;

        // 周波数データ取得
        window.analyser.getByteFrequencyData(window.dataArray);

        // 背景（少し暗く）
        ctx.fillStyle='#020617'; ctx.fillRect(0,0,w,h);

        // --- 1. ゾーンの描画 ---
        // L Zone (Top, Blue)
        ctx.fillStyle = 'rgba(30, 64, 175, 0.3)';
        ctx.fillRect(0, 0, w, h * 0.35); // 上部35%
        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText("L Zone (Target)", 10, 25);

        // R Zone (Bottom, Red)
        ctx.fillStyle = 'rgba(153, 27, 27, 0.3)';
        ctx.fillRect(0, h * 0.65, w, h * 0.35); // 下部35%
        ctx.fillStyle = '#f87171';
        ctx.fillText("R Zone (Target)", 10, h - 15);

        // --- 2. ピーク検出 (F3付近) ---
        const sampleRate = window.audioCtx.sampleRate;
        const fftSize = window.analyser.fftSize; // 2048
        const binCount = window.analyser.frequencyBinCount; // 1024
        const hzPerBin = sampleRate / fftSize; // 例: 48000/2048 = 23.4Hz

        // 検索範囲のインデックス計算
        const startBin = Math.floor(FREQ_MIN / hzPerBin);
        const endBin = Math.floor(FREQ_MAX / hzPerBin);

        let maxVal = 0;
        let maxIndex = 0;
        
        // 指定範囲内で最大のエネルギーを持つ周波数を探す
        for (let i = startBin; i <= endBin; i++) {
            if (window.dataArray[i] > maxVal) {
                maxVal = window.dataArray[i];
                maxIndex = i;
            }
        }

        // --- 3. ボールの位置計算 ---
        // ピーク周波数をY座標に変換 (高い周波数ほどYは小さく=上になる)
        // FREQ_MIN(下) ～ FREQ_MAX(上)
        const currentHz = maxIndex * hzPerBin;
        
        // 正規化 (0.0 ～ 1.0)
        let normalizedPos = (currentHz - FREQ_MIN) / (FREQ_MAX - FREQ_MIN);
        if(normalizedPos < 0) normalizedPos = 0;
        if(normalizedPos > 1) normalizedPos = 1;

        // Y座標 (Canvasは上が0なので反転)
        const targetY = h - (normalizedPos * h);

        // ノイズ対策: 音量が小さすぎる場合はボールを表示しない
        if (maxVal > 50) { // 閾値
            // ボール描画
            ctx.beginPath();
            ctx.arc(w / 2, targetY, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#facc15'; // Yellow
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();

            // 現在のHz表示
            ctx.fillStyle = '#fff';
            ctx.font = '12px monospace';
            ctx.fillText(`${Math.round(currentHz)}Hz`, w/2 + 20, targetY + 5);

            // --- 判定ロジック ---
            // 上部ゾーン (L)
            if (normalizedPos > 0.65) { 
                ctx.fillStyle = '#60a5fa';
                ctx.font = 'bold 30px sans-serif';
                ctx.fillText("Hit! L", w - 100, h/2);
            }
            // 下部ゾーン (R)
            else if (normalizedPos < 0.35) {
                ctx.fillStyle = '#f87171';
                ctx.font = 'bold 30px sans-serif';
                ctx.fillText("Hit! R", w - 100, h/2);
            }
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillText("Speak louder...", w/2 - 40, h/2);
        }
    }

})();