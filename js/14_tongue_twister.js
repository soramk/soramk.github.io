/**
 * 14_tongue_twister.js
 * L/Rが混在する難関フレーズ（早口言葉）に挑戦するモードを追加するプラグイン。
 * 既存のDBシステムに仮想カテゴリ 'twister' を注入することで実現します。
 */

(function() {
    const STORAGE_KEY = 'lr_twister_enabled';
    
    // 早口言葉データセット (L/Rが混ざる難易度の高いもの)
    const TWISTER_DATA = [
        "Red lorry, yellow lorry",
        "Truly rural",
        "She sells seashells by the seashore",
        "Eleven benevolent elephants",
        "Rolling red wagons",
        "Real rock wall, rear rock wall",
        "A loyal warrior will rarely worry",
        "Larry sent the latter a letter later",
        "I scream, you scream, we all scream for ice cream",
        "Freshly fried flying fish"
    ];

    // --- 初期化 ---
    window.addEventListener('load', () => {
        // スタイル注入（長い文章用にフォントサイズを調整）
        const style = document.createElement('style');
        style.innerHTML = `
            body.twister-mode .word-display { font-size: 1.4rem !important; line-height: 1.3; min-height: 4em; display:flex; align-items:center; justify-content:center; }
            body.twister-mode .sub-text { display: none !important; }
            body.twister-mode .phoneme-container { display: none !important; }
            body.twister-mode .diagram-box { display: none !important; }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            injectSettingsToggle();
            applyState();
            
            // 既存の nextQuestion をフックして、モードごとの表示切替を行う
            hookNextQuestion();
        }, 800);
    });

    // 1. 設定画面にスイッチを追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-twister-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-twister-wrapper';
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
        checkbox.id = 'toggle-twister-feature';
        checkbox.style.marginRight = '10px';
        
        const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
        checkbox.checked = isEnabled;

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            applyState();
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("🔥 Enable Tongue Twister (Challenge)"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "Practice difficult L/R phrases.";
        wrapper.appendChild(desc);

        // Blitz設定の後ろに追加
        const blitzSetting = document.getElementById('setting-blitz-wrapper');
        if(blitzSetting) {
            blitzSetting.parentNode.insertBefore(wrapper, blitzSetting.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    // 2. チャレンジボタンの表示切り替え
    function applyState() {
        const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
        const subHeader = document.querySelector('.sub-header');
        if (!subHeader) return;

        let btn = document.getElementById('twister-btn');

        if (isEnabled) {
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'twister-btn';
                btn.innerText = '🔥 Challenge';
                btn.style.marginLeft = '10px';
                btn.style.padding = '5px 10px';
                btn.style.borderRadius = '15px';
                btn.style.border = '1px solid #ef4444';
                btn.style.background = '#fee2e2';
                btn.style.color = '#b91c1c';
                btn.style.fontWeight = 'bold';
                btn.style.cursor = 'pointer';
                btn.style.fontSize = '0.8rem';
                
                btn.onclick = startTwisterMode;
                subHeader.appendChild(btn);
            }
            btn.style.display = 'inline-block';
        } else {
            if (btn) btn.style.display = 'none';
        }
    }

    // --- 早口言葉モードロジック ---

    function startTwisterMode() {
        if (!window.db) window.db = {};

        // 1. 仮想カテゴリ 'twister' をDBに注入
        // 既存のペア構造 {l:{w...}, r:{w...}} に無理やり合わせる（左右同じ文章にする）
        const twisterList = TWISTER_DATA.map(text => {
            return {
                l: { w: text, b: [] }, // b:[] は発音記号なしの意味
                r: { w: text, b: [] }
            };
        });
        
        window.db['twister'] = twisterList;

        // 2. カテゴリセレクトを更新して 'twister' を選択
        if (typeof populateCategorySelect === 'function') {
            populateCategorySelect();
        }
        
        const select = document.getElementById('category-select');
        if (select) {
            select.value = 'twister';
            // changeCategory() を呼ぶと nextQuestion() が走る
            if (typeof changeCategory === 'function') changeCategory();
        }

        // 3. モードをSpeakに強制変更
        if (typeof setMode === 'function') setMode('speaking');

        alert("🔥 Tongue Twister Challenge Started!\n文章全体を滑らかに読んでください。");
    }

    // nextQuestionをフックして、カテゴリが 'twister' の時だけ画面レイアウトを変える
    function hookNextQuestion() {
        const originalNext = window.nextQuestion;
        
        window.nextQuestion = function() {
            // 元の処理を実行
            if(originalNext) originalNext();

            // 現在のカテゴリをチェック
            const isTwister = (window.currentCategory === 'twister');
            
            // bodyにクラスを付与/除去してCSSで見た目を制御
            if (isTwister) {
                document.body.classList.add('twister-mode');
                
                // 対戦相手表示（vs ...）の文言を消す念押し
                const sub = document.querySelector('.sub-text');
                if(sub) sub.style.display = 'none';

            } else {
                document.body.classList.remove('twister-mode');
                const sub = document.querySelector('.sub-text');
                if(sub) sub.style.display = 'block';
            }
        };
    }

})();