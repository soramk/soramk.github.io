/**
 * feature_tongue_twister.js (v3: レベル選択対応版)
 * 早口言葉をレベル別 (Lv1〜Lv4) にカテゴリ分けして追加します。
 * 「🔥 Challenge」ボタンでLv1を開始し、その後プルダウンで難易度変更が可能です。
 */

(function() {
    const STORAGE_KEY = 'lr_twister_enabled';
    
    // レベル別データセット
    const TWISTER_LEVELS = {
        "Twister Lv1 (Basic)": [
            "Red lorry, yellow lorry",
            "Truly rural",
            "Real rock wall",
            "Bluebird, blackbird",
            "A loyal warrior",
            "Rolling red wagons",
            "Lucky rabbits",
            "Really leery",
            "Little red riding hood",
            "Lots of little lemons"
        ],
        "Twister Lv2 (Sentence)": [
            "She sells seashells by the seashore",
            "Eleven benevolent elephants",
            "Larry sent the latter a letter later",
            "Freshly fried flying fish",
            "Look at the little red lorry",
            "A lump of red leather, a red leather lump",
            "Reading alone allows you to really relax",
            "Right around the road",
            "Light the night light tonight",
            "Leave the relief loop alone"
        ],
        "Twister Lv3 (Hard)": [
            "I scream, you scream, we all scream for ice cream",
            "Real rock wall, rear rock wall, rare rock wall",
            "A loyal warrior will rarely worry why we rule",
            "Rory the warrior and Roger the worrier were reared wrongly in a rural brewery",
            "Are you copper bottoming 'em, my man? No, I'm aluminiuming 'em, mum",
            "Can you imagine an imaginary menagerie manager imagining managing an imaginary menagerie?",
            "Lesser leather never weathered wetter weather better",
            "Red leather, yellow leather",
            "Which witch switched the Swiss wristwatches?",
            "If a dog chews shoes, whose shoes does he choose?"
        ],
        "Twister Lv4 (Nightmare)": [
            "Jerry's jelly berries taste really rare",
            "The thirty-three thieves thought that they thrilled the throne throughout Thursday",
            "Roberta ran rings around the Roman ruins",
            "Lovely lemon liniment",
            "Red blood, bad blood",
            "Flash message",
            "Irish wristwatch",
            "Strange strategic statistics",
            "Round the rugged rock the ragged rascal ran",
            "Yellow butter, purple jelly, red jam, black bread"
        ]
    };

    window.addEventListener('load', () => {
        const style = document.createElement('style');
        style.innerHTML = `
            body.twister-mode .word-display { font-size: 1.3rem !important; line-height: 1.3; min-height: 4em; display:flex; align-items:center; justify-content:center; }
            body.twister-mode .sub-text { display: none !important; }
            body.twister-mode .phoneme-container { display: none !important; }
            body.twister-mode .diagram-box { display: none !important; }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            injectSettingsToggle();
            // 起動時に有効なら即座にカテゴリを追加
            if (localStorage.getItem(STORAGE_KEY) === 'true') {
                registerTwisterCategories();
            }
            applyState();
            hookNextQuestion();
        }, 800);
    });

    // 1. カテゴリ登録処理 (重要)
    function registerTwisterCategories() {
        if (!window.db) window.db = {};
        
        Object.keys(TWISTER_LEVELS).forEach(levelName => {
            const list = TWISTER_LEVELS[levelName].map(text => {
                return { l: { w: text, b: [] }, r: { w: text, b: [] } };
            });
            window.db[levelName] = list;
        });

        // プルダウン更新
        if (typeof populateCategorySelect === 'function') populateCategorySelect();
    }

    // 2. カテゴリ削除処理 (オフにした時)
    function removeTwisterCategories() {
        if (!window.db) return;
        Object.keys(TWISTER_LEVELS).forEach(levelName => {
            delete window.db[levelName];
        });
        if (typeof populateCategorySelect === 'function') populateCategorySelect();
    }

    // 3. 設定画面UI
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
            if (checkbox.checked) {
                registerTwisterCategories();
            } else {
                removeTwisterCategories();
            }
            applyState();
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("🔥 早口言葉チャレンジを有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "難易度別の早口言葉カテゴリ(Lv1-Lv4)を追加します。";
        wrapper.appendChild(desc);

        const blitzSetting = document.getElementById('setting-blitz-wrapper');
        if(blitzSetting) {
            blitzSetting.parentNode.insertBefore(wrapper, blitzSetting.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    // 4. チャレンジボタン制御
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

    function startTwisterMode() {
        // デフォルトで Lv1 を選択して開始
        const defaultLevel = "Twister Lv1 (Basic)";
        
        if (!window.db[defaultLevel]) {
            registerTwisterCategories(); // 念のため再登録
        }

        const select = document.getElementById('category-select');
        if (select) {
            select.value = defaultLevel;
            if (typeof changeCategory === 'function') changeCategory();
        }

        if (typeof setMode === 'function') setMode('speaking');

        alert("🔥 早口言葉チャレンジ開始!\nカテゴリ選択プルダウンから難易度(Lv1-Lv4)を変更できます。");
    }

    function hookNextQuestion() {
        const originalNext = window.nextQuestion;
        
        window.nextQuestion = function() {
            if(originalNext) originalNext();
            
            // 現在のカテゴリ名に 'Twister' が含まれているかで判定
            const isTwister = (window.currentCategory && window.currentCategory.includes('Twister'));
            
            if (isTwister) {
                document.body.classList.add('twister-mode');
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