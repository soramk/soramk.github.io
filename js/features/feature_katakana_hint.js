/**
 * feature_katakana_hint.js (v5: ネイティブ発音・極 - Dark L/R対応版)
 * 辞書にない単語でも、Dark L (語末のL) や R-colored vowels (母音+R) を
 * 識別して、よりネイティブに近い「魔法のカタカナ」を生成します。
 */

(function() {
    const STORAGE_KEY = 'lr_katakana_enabled';
    
    // --- 優先辞書 (ルールでカバーしきれない例外用) ---
    const DICTIONARY = {
        "light": "ルァイt", "right": "ゥライt",
        "lead": "リィード", "read": "ゥリィード",
        "lice": "ルァイス", "rice": "ゥライス",
        "belly": "ベリィ", "berry": "ベゥリィ",
        "pilot": "パイラッt", "pirate": "パイゥレッt",
        "clown": "kルァウン", "crown": "kゥラウン",
        "glass": "gルァス", "grass": "gゥラァス",
        "fly": "fルァイ", "fry": "fゥライ",
        "girl": "gァrォ", "world": "ワァrォd",
        "water": "ワァラr", "little": "リロォ", // 米語風
        "apple": "ェァpォ", "people": "ピィーpォ"
    };

    window.addEventListener('load', () => {
        setTimeout(() => {
            injectSettingsToggle();
            applyState();
            hookUpdateDisplay();
            
            // 初回表示ケア
            const targetEl = document.getElementById('target-word');
            if (targetEl && targetEl.innerText !== '...') {
                updateKatakana();
            }
        }, 800);
    });

    // 1. 設定画面UI
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-katakana-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-katakana-wrapper';
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
        checkbox.id = 'toggle-katakana';
        checkbox.style.marginRight = '10px';
        
        const saved = localStorage.getItem(STORAGE_KEY);
        checkbox.checked = saved === null ? true : (saved === 'true');

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            applyState();
            if(window.currentPair && window.updateWordDisplay) window.updateWordDisplay();
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("🇯🇵 カタカナガイド (ネイティブ風)"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "L(ルァ/ォ)、R(ゥラ/ァr)など、口の形を意識した表記を表示します。";
        wrapper.appendChild(desc);

        const providerSection = document.getElementById('ai-provider').closest('div').parentNode; 
        if(providerSection) {
            providerSection.appendChild(wrapper);
        } else {
            settingsBody.insertBefore(wrapper, settingsBody.firstChild);
        }
    }

    // 2. 表示エリアスタイル
    function applyState() {
        if (!document.getElementById('katakana-style')) {
            const style = document.createElement('style');
            style.id = 'katakana-style';
            style.innerHTML = `
                .kana-guide {
                    font-size: 1.1rem;
                    color: var(--text);
                    opacity: 0.85;
                    margin-top: -5px;
                    margin-bottom: 10px;
                    font-family: "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
                    letter-spacing: 0.03em;
                }
                .kana-l { color: #3b82f6; font-weight:800; } 
                .kana-r { color: #ef4444; font-weight:800; }
                /* 小さい文字などでリズムを表現 */
                .kana-stop { font-size: 0.85em; opacity: 0.7; }
            `;
            document.head.appendChild(style);
        }

        const wordArea = document.getElementById('word-area');
        if (wordArea && !document.getElementById('kana-display-target')) {
            const div = document.createElement('div');
            div.id = 'kana-display-target';
            div.className = 'kana-guide';
            const targetEl = document.getElementById('target-word');
            if(targetEl) targetEl.after(div);
        }
    }

    function hookUpdateDisplay() {
        const originalUpdateWordDisplay = window.updateWordDisplay;
        window.updateWordDisplay = function() {
            if(originalUpdateWordDisplay) originalUpdateWordDisplay();
            updateKatakana();
        };

        const originalNext = window.nextQuestion;
        window.nextQuestion = function() {
            if(originalNext) originalNext();
            updateKatakana();
        };

        const originalCheckListening = window.checkListening;
        window.checkListening = function(userChoseL) {
            if(originalCheckListening) originalCheckListening(userChoseL);
            updateKatakana(true); 
        };
    }

    // 3. 表示ロジック
    function updateKatakana(forceShow = false) {
        const isEnabled = localStorage.getItem(STORAGE_KEY);
        const shouldShow = isEnabled === null ? true : (isEnabled === 'true');
        const el = document.getElementById('kana-display-target');
        
        if (!el || !shouldShow) {
            if(el) el.style.display = 'none';
            return;
        }

        const targetEl = document.getElementById('target-word');
        if (targetEl && targetEl.innerText === '...') {
             el.style.display = 'none';
             return;
        }

        if (!forceShow && window.currentMode === 'listening' && targetEl && targetEl.innerText.includes('???')) {
            el.style.display = 'none';
            return;
        }

        el.style.display = 'block';

        let word = window.targetObj ? window.targetObj.w : "";
        let isL = window.isTargetL;

        if (!word) return;

        // ★強化版エンジン実行
        const kana = convertToPhoneticKana(word.toLowerCase());
        
        // メインの音（L/R）を強調
        // 全体を囲むのではなく、正規表現で特定の文字だけspanで囲む
        let formattedKana = kana
            .replace(/([ルリレロォ])/g, '<span class="kana-l">$1</span>') // L系の文字
            .replace(/([ゥァ]r|[ゥ]?[ラリレルロ])/g, '<span class="kana-r">$1</span>') // R系の文字
            .replace(/([tkpdgbvf])$/g, '<span class="kana-stop">$1</span>'); // 語尾の子音

        // 簡易的な処理なので、L/Rモードに応じてクラスを振り分ける
        // (正解がLなら青っぽく、Rなら赤っぽくベースを変えるのもありだが、今回は文字単位で色付け)
        
        el.innerHTML = formattedKana;
    }

    // --- 4. 強化版 自動変換エンジン (Ultra Native Logic) ---
    function convertToPhoneticKana(text) {
        if (DICTIONARY[text]) return DICTIONARY[text];

        let s = text;

        // --- A. 特殊パターン & 語尾処理 ---
        s = s.replace(/tion$/, 'シュン');
        s = s.replace(/sion$/, 'ジュん');
        s = s.replace(/ment$/, 'マンt');
        s = s.replace(/ture$/, 'チャ');
        s = s.replace(/igh/, 'アイ');
        s = s.replace(/ough/, 'アフ');
        s = s.replace(/ph/, 'f');
        s = s.replace(/sh/, 'シュ');
        s = s.replace(/ch/, 'チ');
        s = s.replace(/ck/, 'ッk');
        s = s.replace(/ng$/, 'ンg');
        s = s.replace(/ing$/, 'ィンg');
        s = s.replace(/th/, 'ス'); // 無声
        s = s.replace(/wh/, 'ホ');
        s = s.replace(/qu/, 'クヮ');

        // --- B. Rの処理 (優先度高) ---
        // 1. 母音 + R (R-colored vowels: 舌を巻く)
        s = s.replace(/([aeiou])r$/g, 'ァr');  // car -> kァr, for -> fァr
        s = s.replace(/([aeiou])r([bcdfghjkmnpqstvwz])/g, 'ァr$2'); // bird -> bァrd
        
        // 2. 語頭・音節頭のR (唇を丸める)
        s = s.replace(/^ra/, 'ゥラ');
        s = s.replace(/^ri/, 'ゥリ');
        s = s.replace(/^ru/, 'ゥル');
        s = s.replace(/^re/, 'ゥレ');
        s = s.replace(/^ro/, 'ゥロ');
        s = s.replace(/([bcdfghjkmnpstvwz])ra/g, '$1ゥラ'); // pray -> pゥレイ(後でei変換)
        s = s.replace(/([bcdfghjkmnpstvwz])ri/g, '$1ゥリ');
        s = s.replace(/([bcdfghjkmnpstvwz])ru/g, '$1ゥル');
        s = s.replace(/([bcdfghjkmnpstvwz])re/g, '$1ゥレ');
        s = s.replace(/([bcdfghjkmnpstvwz])ro/g, '$1ゥロ');
        
        // その他のR
        s = s.replace(/r/g, 'ゥr');

        // --- C. Lの処理 (Dark L vs Light L) ---
        // 1. Dark L (語尾、または子音の前): 「ル」ではなく「ォ」に近い音
        // all -> オーォ, milk -> ミォk, help -> ヘォp
        s = s.replace(/all/g, 'オーォ'); 
        s = s.replace(/([aeiou])l([bcdfghjkmnpqstvwz])/g, '$1ォ$2'); // help -> heォp
        s = s.replace(/([aeiou])l$/g, '$1ォ'); // cool -> kuーォ
        s = s.replace(/le$/, 'ォ'); // apple -> appォ -> ェァpォ

        // 2. Light L (母音の前): 舌を弾く「ルァ」
        s = s.replace(/^la/, 'ルァ');
        s = s.replace(/^li/, 'リ');
        s = s.replace(/^lu/, 'ル');
        s = s.replace(/^le/, 'レ');
        s = s.replace(/^lo/, 'ロ');
        s = s.replace(/([bcdfghjkmnpstvwz])l([aeiou])/g, '$1ル$2'); // play -> pルay
        
        // その他のL
        s = s.replace(/l/g, 'ル');

        // --- D. 母音の処理 (ネイティブ感のキモ) ---
        // Magic E (a_e -> ェイ, i_e -> ァイ)
        s = s.replace(/a([bcdfghjklmnpstvwz])e$/, 'ェイ$1');
        s = s.replace(/i([bcdfghjklmnpstvwz])e$/, 'ァイ$1');
        s = s.replace(/o([bcdfghjklmnpstvwz])e$/, 'ォウ$1');
        s = s.replace(/u([bcdfghjklmnpstvwz])e$/, 'ュー$1');

        // Short A (æ): キャットの「ャ」、ハットの「ェァ」
        // 子音+a+子音 のパターン
        s = s.replace(/([bcdfghjklmnpstvwz])a([bcdfghjklmnpstvwz])/g, '$1ェァ$2');
        
        // Short O (ɑ): ホットではなく「ハ」に近い「ァ」
        // s = s.replace(/([bcdfghjklmnpstvwz])o([bcdfghjklmnpstvwz])/g, '$1ァ$2'); 
        // -> 混乱を招く可能性があるので、今回は「ォ」のままだが少し口を大きく開けるイメージで

        // Short U (ʌ): カットの「ァ」
        s = s.replace(/([bcdfghjklmnpstvwz])u([bcdfghjklmnpstvwz])/g, '$1ァ$2');

        // ee, ea -> ィー
        s = s.replace(/ee/g, 'ィー');
        s = s.replace(/ea/g, 'ィー');
        s = s.replace(/oo/g, 'ゥー');
        s = s.replace(/oa/g, 'ォウ');
        s = s.replace(/ou/g, 'ァウ');
        s = s.replace(/ow/g, 'ァウ');
        s = s.replace(/ay/g, 'ェイ');
        s = s.replace(/ai/g, 'ェイ');

        // --- E. 子音の仕上げ ---
        // 語尾の破裂音は母音を付けない
        s = s.replace(/t$/, 't');
        s = s.replace(/k$/, 'k');
        s = s.replace(/p$/, 'p');
        s = s.replace(/d$/, 'd');
        s = s.replace(/g$/, 'g');
        s = s.replace(/m$/, 'm');
        s = s.replace(/n$/, 'ン');
        s = s.replace(/b$/, 'b');

        // 基本置換
        s = s.replace(/a/g, 'ァ');
        s = s.replace(/i/g, 'ィ');
        s = s.replace(/u/g, 'ゥ');
        s = s.replace(/e/g, 'ェ');
        s = s.replace(/o/g, 'ォ');
        
        s = s.replace(/c/g, 'k'); 
        s = s.replace(/j/g, 'ヂャ');
        s = s.replace(/q/g, 'k');
        s = s.replace(/x/g, 'ks');
        s = s.replace(/y/g, 'ィ');

        // 整形 (連続する小文字などを整理)
        s = s.replace(/ェァェァ/g, 'ェァ');
        s = s.replace(/ゥゥ/g, 'ゥ');
        s = s.replace(/ッッ/g, 'ッ');

        return s;
    }
})();