/**
 * feature_sentence_mode.js
 * L/Rを含む「短文（センテンス）」を練習するシャドーイングモードを追加するプラグイン。
 * 設定画面でオン/オフが可能。
 */

(function() {
    const STORAGE_KEY = 'lr_sentence_enabled';
    
    // センテンスデータセット (日常会話で使えるL/R混在フレーズ)
    const SENTENCE_DATA = [
        "Please turn on the light on the right.",
        "I really love red roses.",
        "The river flows under the bridge.",
        "Let's eat lunch at the restaurant.",
        "Is this the right road to the lake?",
        "Look at the lovely little rabbit.",
        "The rain fell on the green grass.",
        "Please read the rule book carefully.",
        "I will arrive late tomorrow.",
        "Believe in yourself and your dreams.",
        "The blue balloon flew away.",
        "Hello, my name is Larry.",
        "Are you ready to play the game?",
        "The glass is full of fresh milk.",
        "It's a long way to run."
    ];

    window.addEventListener('load', () => {
        // UI調整用スタイル
        const style = document.createElement('style');
        style.innerHTML = `
            body.sentence-mode .word-display { 
                font-size: 1.4rem !important; 
                line-height: 1.4; 
                min-height: 3.5em; 
                display:flex; 
                align-items:center; 
                justify-content:center;
                padding: 0 10px;
            }
            body.sentence-mode .sub-text { display: none !important; }
            body.sentence-mode .phoneme-container { display: none !important; }
            body.sentence-mode .diagram-box { display: none !important; }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            injectSettingsToggle();
            applyState();
            hookNextQuestion();
        }, 800);
    });

    // 1. 設定画面
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-sentence-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-sentence-wrapper';
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
        checkbox.id = 'toggle-sentence-feature';
        checkbox.style.marginRight = '10px';
        
        checkbox.checked = typeof window.getFeatureDefault === 'function'
            ? window.getFeatureDefault(STORAGE_KEY)
            : (localStorage.getItem(STORAGE_KEY) === 'true');

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            applyState();
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("🗣️ センテンス (短文) モードを有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "単語だけでなく、実践的な短い文章でL/Rの発音を練習します。";
        wrapper.appendChild(desc);

        // 挿入位置: Twister設定の前
        const twisterSetting = document.getElementById('setting-twister-wrapper');
        if(twisterSetting) {
            twisterSetting.parentNode.insertBefore(wrapper, twisterSetting);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    // 2. ボタン表示
    function applyState() {
        const isEnabled = typeof window.getFeatureDefault === 'function'
            ? window.getFeatureDefault(STORAGE_KEY)
            : (localStorage.getItem(STORAGE_KEY) === 'true');
        const subHeader = document.querySelector('.sub-header');
        if (!subHeader) return;

        let btn = document.getElementById('sentence-btn');

        if (isEnabled) {
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'sentence-btn';
                btn.innerText = '🗣️ Sentences';
                btn.style.marginLeft = '10px';
                btn.style.padding = '5px 10px';
                btn.style.borderRadius = '15px';
                btn.style.border = '1px solid #3b82f6';
                btn.style.background = '#dbeafe';
                btn.style.color = '#1d4ed8';
                btn.style.fontWeight = 'bold';
                btn.style.cursor = 'pointer';
                btn.style.fontSize = '0.8rem';
                
                btn.onclick = startSentenceMode;
                
                // Twisterボタンがあればその前、なければ最後に追加
                const twisterBtn = document.getElementById('twister-btn');
                if(twisterBtn) {
                    subHeader.insertBefore(btn, twisterBtn);
                } else {
                    subHeader.appendChild(btn);
                }
            }
            btn.style.display = 'inline-block';
        } else {
            if (btn) btn.style.display = 'none';
        }
    }

    // --- ロジック ---

    function startSentenceMode() {
        if (!window.db) window.db = {};

        // 仮想カテゴリ 'sentence' を注入
        const sentenceList = SENTENCE_DATA.map(text => {
            return { l: { w: text, b: [] }, r: { w: text, b: [] } };
        });
        
        window.db['sentence'] = sentenceList;

        if (typeof populateCategorySelect === 'function') populateCategorySelect();
        
        const select = document.getElementById('category-select');
        if (select) {
            select.value = 'sentence';
            if (typeof changeCategory === 'function') changeCategory();
        }

        if (typeof setMode === 'function') setMode('speaking');

        alert("🗣️ センテンスモード開始!\n文章を声に出して読んでみましょう。\n(モデル音声を聞いてシャドーイングするのが効果的です)");
    }

    function hookNextQuestion() {
        const originalNext = window.nextQuestion;
        
        window.nextQuestion = function() {
            if(originalNext) originalNext();
            
            const isSentence = (window.currentCategory === 'sentence');
            
            if (isSentence) {
                document.body.classList.add('sentence-mode');
                const sub = document.querySelector('.sub-text');
                if(sub) sub.style.display = 'none';
            } else {
                document.body.classList.remove('sentence-mode');
                // Twisterモードでもない場合のみ表示
                if (!document.body.classList.contains('twister-mode')) {
                    const sub = document.querySelector('.sub-text');
                    if(sub) sub.style.display = 'block';
                }
            }
        };
    }
})();