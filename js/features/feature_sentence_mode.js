/**
 * feature_sentence_mode.js (v2: レベル選択対応版)
 * L/Rを含む「短文（センテンス）」をレベル別に練習するシャドーイングモードを追加するプラグイン。
 * 設定画面でオン/オフが可能。
 */

(function() {
    const STORAGE_KEY = 'lr_sentence_enabled';
    
    // レベル別センテンスデータセット
    const SENTENCE_LEVELS = {
        "Sentence Lv1 (Basic)": [
            "Please turn on the light.",
            "I really love red roses.",
            "The river flows under the bridge.",
            "Let's eat lunch at the restaurant.",
            "Is this the right road?",
            "Look at the lovely little rabbit.",
            "The rain fell on the green grass.",
            "Please read the rule book.",
            "I will arrive late tomorrow.",
            "Believe in yourself.",
            "The blue balloon flew away.",
            "Hello, my name is Larry.",
            "Are you ready to play?",
            "The glass is full of fresh milk.",
            "It's a long way to run.",
            "I really like this place.",
            "The library is on the left.",
            "Let me help you with that.",
            "The weather is really nice today.",
            "I'll call you later.",
            "The red car is very fast.",
            "Please close the door.",
            "I love to read books.",
            "The train leaves at three.",
            "Let's go to the park.",
            "I really appreciate your help.",
            "The light is too bright.",
            "Please wait for me.",
            "I'll be right back.",
            "The room is very large."
        ],
        "Sentence Lv2 (Intermediate)": [
            "Please turn on the light on the right.",
            "I really love red roses in the garden.",
            "The river flows under the bridge slowly.",
            "Let's eat lunch at the restaurant nearby.",
            "Is this the right road to the lake?",
            "Look at the lovely little rabbit running.",
            "The rain fell on the green grass gently.",
            "Please read the rule book carefully.",
            "I will arrive late tomorrow morning.",
            "Believe in yourself and your dreams always.",
            "The blue balloon flew away in the wind.",
            "Hello, my name is Larry from London.",
            "Are you ready to play the game now?",
            "The glass is full of fresh milk today.",
            "It's a long way to run every day.",
            "I really like this place very much.",
            "The library is on the left side of the street.",
            "Let me help you with that heavy box.",
            "The weather is really nice today, isn't it?",
            "I'll call you later this evening.",
            "The red car is very fast and reliable.",
            "Please close the door when you leave.",
            "I love to read books in the library.",
            "The train leaves at three o'clock sharp.",
            "Let's go to the park this afternoon.",
            "I really appreciate your help with this project.",
            "The light is too bright for my eyes.",
            "Please wait for me at the entrance.",
            "I'll be right back in a few minutes.",
            "The room is very large and comfortable.",
            "She really likes to learn new languages.",
            "The teacher will explain the lesson clearly.",
            "I'll bring the book to the library tomorrow.",
            "The flight will arrive late in the evening.",
            "Please remember to lock the door carefully.",
            "I really want to travel around the world.",
            "The restaurant serves really delicious food.",
            "Let's plan a trip to the lake next week.",
            "I'll write a letter to my friend later.",
            "The weather forecast says it will rain tomorrow."
        ],
        "Sentence Lv3 (Advanced)": [
            "Please turn on the light on the right side of the room.",
            "I really love red roses in the garden behind my house.",
            "The river flows under the bridge slowly and peacefully.",
            "Let's eat lunch at the restaurant nearby the library.",
            "Is this the right road to the lake that you mentioned?",
            "Look at the lovely little rabbit running across the field.",
            "The rain fell on the green grass gently this morning.",
            "Please read the rule book carefully before you start playing.",
            "I will arrive late tomorrow morning because of the traffic.",
            "Believe in yourself and your dreams always, no matter what happens.",
            "The blue balloon flew away in the wind and disappeared from sight.",
            "Hello, my name is Larry from London, and I'm really excited to be here.",
            "Are you ready to play the game now, or would you like to wait?",
            "The glass is full of fresh milk that I bought from the store today.",
            "It's a long way to run every day, but it's really good for your health.",
            "I really like this place very much because it's quiet and peaceful.",
            "The library is on the left side of the street, right next to the park.",
            "Let me help you with that heavy box before you drop it on the floor.",
            "The weather is really nice today, isn't it? Perfect for a walk in the park.",
            "I'll call you later this evening to discuss the details of our plan.",
            "The red car is very fast and reliable, which makes it perfect for long trips.",
            "Please close the door when you leave so that the cat doesn't run outside.",
            "I love to read books in the library because it's quiet and comfortable there.",
            "The train leaves at three o'clock sharp, so please make sure you arrive on time.",
            "Let's go to the park this afternoon to enjoy the beautiful weather together.",
            "I really appreciate your help with this project because it was really challenging.",
            "The light is too bright for my eyes, so could you please turn it down a little?",
            "Please wait for me at the entrance of the building until I finish my work.",
            "I'll be right back in a few minutes, so please don't leave without me.",
            "The room is very large and comfortable, which makes it perfect for our meeting.",
            "She really likes to learn new languages because it helps her understand different cultures.",
            "The teacher will explain the lesson clearly so that everyone can understand it easily.",
            "I'll bring the book to the library tomorrow morning before my first class starts.",
            "The flight will arrive late in the evening, so we'll need to arrange transportation.",
            "Please remember to lock the door carefully when you leave the house for security.",
            "I really want to travel around the world to experience different cultures and languages.",
            "The restaurant serves really delicious food that is prepared fresh every single day.",
            "Let's plan a trip to the lake next week when the weather is supposed to be nice.",
            "I'll write a letter to my friend later today to tell her about my recent travels.",
            "The weather forecast says it will rain tomorrow, so we should bring our umbrellas."
        ],
        "Sentence Lv4 (Expert)": [
            "Please turn on the light on the right side of the room so that we can see clearly.",
            "I really love red roses in the garden behind my house because they remind me of my grandmother.",
            "The river flows under the bridge slowly and peacefully, creating a really beautiful and relaxing atmosphere.",
            "Let's eat lunch at the restaurant nearby the library after we finish reading our books this morning.",
            "Is this the right road to the lake that you mentioned earlier, or should we take a different route?",
            "Look at the lovely little rabbit running across the field, and notice how gracefully it moves through the grass.",
            "The rain fell on the green grass gently this morning, leaving everything fresh and clean for the rest of the day.",
            "Please read the rule book carefully before you start playing the game, so that you understand all the instructions.",
            "I will arrive late tomorrow morning because of the traffic, but I'll make sure to call you as soon as I leave.",
            "Believe in yourself and your dreams always, no matter what happens, because that's the only way to achieve your goals.",
            "The blue balloon flew away in the wind and disappeared from sight, leaving the child really disappointed and sad.",
            "Hello, my name is Larry from London, and I'm really excited to be here today to learn about your culture and language.",
            "Are you ready to play the game now, or would you like to wait a little longer until everyone else arrives?",
            "The glass is full of fresh milk that I bought from the store today, and it's really delicious and nutritious for breakfast.",
            "It's a long way to run every day, but it's really good for your health and helps you stay in shape throughout the year.",
            "I really like this place very much because it's quiet and peaceful, which makes it perfect for reading and relaxing.",
            "The library is on the left side of the street, right next to the park, so it's really easy to find when you're walking.",
            "Let me help you with that heavy box before you drop it on the floor, because I don't want you to hurt yourself.",
            "The weather is really nice today, isn't it? Perfect for a walk in the park or a picnic with friends and family.",
            "I'll call you later this evening to discuss the details of our plan, so please make sure your phone is turned on.",
            "The red car is very fast and reliable, which makes it perfect for long trips across the country during the holidays.",
            "Please close the door when you leave so that the cat doesn't run outside, because we don't want to lose her again.",
            "I love to read books in the library because it's quiet and comfortable there, and I can really focus on my studies.",
            "The train leaves at three o'clock sharp, so please make sure you arrive on time, or you'll have to wait for the next one.",
            "Let's go to the park this afternoon to enjoy the beautiful weather together, and maybe we can have a picnic there too.",
            "I really appreciate your help with this project because it was really challenging, and I couldn't have done it without you.",
            "The light is too bright for my eyes, so could you please turn it down a little, or I'll have to wear my sunglasses inside.",
            "Please wait for me at the entrance of the building until I finish my work, and then we can go to the restaurant together.",
            "I'll be right back in a few minutes, so please don't leave without me, because I really want to talk to you about something important.",
            "The room is very large and comfortable, which makes it perfect for our meeting, and everyone should be able to hear clearly.",
            "She really likes to learn new languages because it helps her understand different cultures and communicate with people from around the world.",
            "The teacher will explain the lesson clearly so that everyone can understand it easily, and then we'll have time to practice together.",
            "I'll bring the book to the library tomorrow morning before my first class starts, so that you can read it during your free time.",
            "The flight will arrive late in the evening, so we'll need to arrange transportation from the airport to the hotel in advance.",
            "Please remember to lock the door carefully when you leave the house for security, because we've had some problems in the neighborhood recently.",
            "I really want to travel around the world to experience different cultures and languages, and learn about how people live in other countries.",
            "The restaurant serves really delicious food that is prepared fresh every single day, using only the finest ingredients from local farms and markets.",
            "Let's plan a trip to the lake next week when the weather is supposed to be nice, and we can spend the whole day swimming and relaxing there.",
            "I'll write a letter to my friend later today to tell her about my recent travels, and ask her if she'd like to join me on my next adventure.",
            "The weather forecast says it will rain tomorrow, so we should bring our umbrellas and raincoats, or we'll get really wet during our walk."
        ]
    };

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
            // 起動時に有効なら即座にカテゴリを追加
            const isEnabled = typeof window.getFeatureDefault === 'function'
                ? window.getFeatureDefault(STORAGE_KEY)
                : (localStorage.getItem(STORAGE_KEY) === 'true');
            if (isEnabled) {
                registerSentenceCategories();
            }
            applyState();
            hookNextQuestion();
        }, 800);
    });

    // 1. カテゴリ登録処理 (重要)
    function registerSentenceCategories() {
        if (!window.db) window.db = {};
        
        Object.keys(SENTENCE_LEVELS).forEach(levelName => {
            const list = SENTENCE_LEVELS[levelName].map(text => {
                return { l: { w: text, b: [] }, r: { w: text, b: [] } };
            });
            window.db[levelName] = list;
        });

        // プルダウン更新
        if (typeof populateCategorySelect === 'function') populateCategorySelect();
    }

    // 2. カテゴリ削除処理 (オフにした時)
    function removeSentenceCategories() {
        if (!window.db) return;
        Object.keys(SENTENCE_LEVELS).forEach(levelName => {
            delete window.db[levelName];
        });
        if (typeof populateCategorySelect === 'function') populateCategorySelect();
    }

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
            if (checkbox.checked) {
                registerSentenceCategories();
            } else {
                removeSentenceCategories();
            }
            applyState();
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("🗣️ センテンス (短文) モードを有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "単語だけでなく、実践的な短い文章でL/Rの発音を練習します。レベル別(Lv1-Lv4)にカテゴリ分けされています。";
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
        registerSentenceCategories();
        
        const select = document.getElementById('category-select');
        if (select) {
            // デフォルトでLv1を選択
            select.value = 'Sentence Lv1 (Basic)';
            if (typeof changeCategory === 'function') changeCategory();
        }

        if (typeof setMode === 'function') setMode('speaking');

        alert("🗣️ センテンスモード開始!\n文章を声に出して読んでみましょう。\n(モデル音声を聞いてシャドーイングするのが効果的です)\nカテゴリ選択プルダウンから難易度(Lv1-Lv4)を変更できます。");
    }

    function hookNextQuestion() {
        const originalNext = window.nextQuestion;
        
        window.nextQuestion = function() {
            if(originalNext) originalNext();
            
            const isSentence = window.currentCategory && window.currentCategory.startsWith('Sentence Lv');
            
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