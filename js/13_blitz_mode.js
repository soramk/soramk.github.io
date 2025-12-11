/**
 * 13_blitz_mode.js
 * 制限時間内にL/Rを聞き分ける早押しゲーム「Blitz Mode」を追加するプラグイン。
 * 設定画面でオン/オフが可能。
 */

(function() {
    const STORAGE_KEY = 'lr_blitz_enabled';
    const GAME_DURATION = 30; // 30秒
    let timerInterval = null;
    let currentScore = 0;
    let isBlitzPlaying = false;

    // --- 初期化 ---
    window.addEventListener('load', () => {
        setTimeout(() => {
            injectSettingsToggle();
            applyState();
        }, 800);
    });

    // 1. 設定画面にスイッチを追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody) return;
        if (document.getElementById('setting-blitz-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-blitz-wrapper';
        wrapper.style.marginBottom = '15px';
        wrapper.style.padding = '10px';
        wrapper.style.background = 'rgba(128,128,128,0.05)';
        wrapper.style.borderRadius = '8px';

        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.cursor = 'pointer';
        label.style.fontWeight = 'bold';
        label.style.fontSize = '0.9rem';
        label.style.color = 'var(--text)';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'toggle-blitz-feature';
        checkbox.style.marginRight = '10px';
        
        const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
        checkbox.checked = isEnabled;

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            applyState();
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("⚡ Enable Blitz Mode (Game)"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "Add a speed-listening game to the Listen tab.";
        wrapper.appendChild(desc);

        // ミラー設定の後ろ、あるいは適当な場所へ
        const mirrorSetting = document.getElementById('setting-mirror-wrapper');
        if(mirrorSetting) {
            mirrorSetting.parentNode.insertBefore(wrapper, mirrorSetting.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    // 2. ボタンの表示切り替え
    function applyState() {
        const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
        const controls = document.getElementById('controls-listening');
        if (!controls) return;

        let btn = document.getElementById('start-blitz-btn');

        if (isEnabled) {
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'start-blitz-btn';
                btn.className = 'action-btn';
                btn.innerText = '⚡ Blitz';
                btn.style.background = '#f59e0b'; // Amber color
                btn.style.color = 'white';
                btn.style.gridColumn = 'span 2'; // 幅広に
                btn.onclick = startBlitzGame;
                
                // Nextボタンの前に追加
                const nextBtn = document.getElementById('next-btn-lst');
                if(nextBtn) {
                    controls.insertBefore(btn, nextBtn);
                } else {
                    controls.appendChild(btn);
                }
            }
            btn.style.display = 'block';
        } else {
            if (btn) btn.style.display = 'none';
        }
    }

    // --- ゲームロジック ---

    function startBlitzGame() {
        if (!window.db || !window.currentCategory) return;
        
        isBlitzPlaying = true;
        currentScore = 0;
        let timeLeft = GAME_DURATION;

        // UIをゲームモードに変更
        const container = document.querySelector('.container');
        const originalContent = container.innerHTML; // 元の画面をバックアップ
        
        // シンプルなゲーム画面を描画
        container.innerHTML = `
            <div style="padding:20px;">
                <h2 style="color:#f59e0b; margin:0;">⚡ Blitz Mode</h2>
                <div style="font-size:3rem; font-weight:bold; margin:20px 0;" id="blitz-timer">${timeLeft}</div>
                <div style="font-size:1.2rem;">Score: <span id="blitz-score">0</span></div>
                
                <div style="margin: 30px 0; min-height: 60px; display:flex; justify-content:center; align-items:center;">
                    <span id="blitz-feedback" style="font-size:2rem;">🔊 Listen!</span>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <button id="blitz-btn-l" class="choice-btn" style="height:120px;">L</button>
                    <button id="blitz-btn-r" class="choice-btn" style="height:120px;">R</button>
                </div>
                
                <button onclick="window.location.reload()" style="margin-top:20px; background:none; border:none; color:#888; text-decoration:underline;">Quit</button>
            </div>
        `;

        // L/Rボタンのイベント設定
        document.getElementById('blitz-btn-l').onclick = () => checkBlitzAnswer(true);
        document.getElementById('blitz-btn-r').onclick = () => checkBlitzAnswer(false);

        // タイマースタート
        timerInterval = setInterval(() => {
            timeLeft--;
            const el = document.getElementById('blitz-timer');
            if(el) el.innerText = timeLeft;
            
            if (timeLeft <= 0) {
                endBlitzGame(currentScore);
            }
        }, 1000);

        // 最初の問題
        nextBlitzQuestion();
    }

    // 現在の問題データ保持用
    let blitzTargetIsL = true;
    let blitzPair = null;

    function nextBlitzQuestion() {
        if(!isBlitzPlaying) return;

        const list = window.db[window.currentCategory];
        const idx = Math.floor(Math.random() * list.length);
        blitzPair = list[idx];
        blitzTargetIsL = Math.random() < 0.5;
        const targetWord = blitzTargetIsL ? blitzPair.l.w : blitzPair.r.w;

        // ボタンのラベル更新 (単語を表示するか、L/Rだけにするかは難易度による。今回はL/Rのみで音に集中させる)
        // もし単語を表示したい場合は以下をコメントアウト解除
        // document.getElementById('blitz-btn-l').innerText = `L\n(${blitzPair.l.w})`;
        // document.getElementById('blitz-btn-r').innerText = `R\n(${blitzPair.r.w})`;

        // 音声再生
        const u = new SpeechSynthesisUtterance(targetWord);
        u.lang = 'en-US';
        u.rate = window.speechRate || 1.0; // 少し早めでもいいかも
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
    }

    function checkBlitzAnswer(userChoseL) {
        if(!isBlitzPlaying) return;

        const isCorrect = (userChoseL === blitzTargetIsL);
        const fb = document.getElementById('blitz-feedback');
        
        if (isCorrect) {
            currentScore++;
            document.getElementById('blitz-score').innerText = currentScore;
            fb.innerText = "⭕ Nice!";
            fb.style.color = "var(--success)";
            // 効果音があれば鳴らす
            if(typeof sfx !== 'undefined' && sfx.correct) sfx.correct();
        } else {
            fb.innerText = "❌ Oops!";
            fb.style.color = "var(--err)";
            if(typeof sfx !== 'undefined' && sfx.wrong) sfx.wrong();
        }

        // 次の問題へ（少しだけ待つか、即次へ行くか。Blitzなので即次へ）
        setTimeout(nextBlitzQuestion, 200);
    }

    function endBlitzGame(score) {
        isBlitzPlaying = false;
        clearInterval(timerInterval);
        
        const container = document.querySelector('.container');
        container.innerHTML = `
            <div style="padding:20px;">
                <h2 style="margin-bottom:10px;">🏁 Time Up!</h2>
                <div style="font-size:4rem; font-weight:bold; color:var(--primary);">${score}</div>
                <p>Correct Answers</p>
                <div style="margin-top:30px;">
                    <button class="action-btn btn-main" onclick="window.location.reload()">Return to Menu</button>
                </div>
            </div>
        `;
        
        // 記録に残すならここで拡張機能(7_extensions.js)を呼んでも良い
        // if(typeof AppExtension !== 'undefined') AppExtension.logBlitzScore(score);
    }

})();