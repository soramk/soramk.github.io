/**
 * 19_katakana_hint.js (v3: 強化版変換エンジン搭載)
 * 辞書にない単語でも、スペルパターン（フォニックス）を解析して
 * ネイティブに近い「L/R対応カタカナ」を自動生成するプラグイン。
 */

(function() {
    const STORAGE_KEY = 'lr_katakana_enabled';
    
    // --- 優先辞書 (例外的な読み方や、特にこだわりたい単語) ---
    const DICTIONARY = {
        "light": "ルァイt", "right": "ゥライt",
        "lead": "リィード", "read": "ゥリィード",
        "lice": "ルァイス", "rice": "ゥライス",
        "belly": "ベリィ", "berry": "ベゥリィ",
        "pilot": "パイラッt", "pirate": "パイゥレッt",
        "clown": "kルァウン", "crown": "kゥラウン",
        "glass": "gルァス", "grass": "gゥラァス",
        "fly": "fルァイ", "fry": "fゥライ"
    };

    // 初期化
    window.addEventListener('load', () => {
        setTimeout(() => {
            injectSettingsToggle();
            applyState();
            hookUpdateDisplay();
        }, 800);
    });

    // 1. 設定画面UI (前回と同じ)
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
        label.appendChild(document.createTextNode("🇯🇵 カタカナガイド (自動生成)"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "Lは「ルァ」、Rは「ゥラ」、語尾は「t/k」など、ネイティブ発音に近い表記を表示します。";
        wrapper.appendChild(desc);

        const providerSection = document.getElementById('ai-provider').closest('div').parentNode; 
        if(providerSection) {
            providerSection.appendChild(wrapper);
        } else {
            settingsBody.insertBefore(wrapper, settingsBody.firstChild);
        }
    }

    // 2. 表示エリアのスタイル (前回と同じ)
    function applyState() {
        const isEnabled = localStorage.getItem(STORAGE_KEY);
        const shouldShow = isEnabled === null ? true : (isEnabled === 'true');
        
        if (!document.getElementById('katakana-style')) {
            const style = document.createElement('style');
            style.id = 'katakana-style';
            style.innerHTML = `
                .kana-guide {
                    font-size: 1.1rem;
                    color: var(--text);
                    opacity: 0.8;
                    margin-top: -5px;
                    margin-bottom: 10px;
                    font-family: "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
                    letter-spacing: 0.05em;
                }
                .kana-l { color: #3b82f6; font-weight:bold; border-bottom: 2px solid rgba(59, 130, 246, 0.3); } 
                .kana-r { color: #ef4444; font-weight:bold; border-bottom: 2px solid rgba(239, 68, 68, 0.3); } 
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
        if (!forceShow && window.currentMode === 'listening' && targetEl && targetEl.innerText.includes('???')) {
            el.style.display = 'none';
            return;
        }

        el.style.display = 'block';

        let word = window.targetObj ? window.targetObj.w : "";
        let isL = window.isTargetL;

        if (!word) return;

        // ★強化された変換エンジン呼び出し
        const kana = convertToPhoneticKana(word.toLowerCase());
        
        // 全体を色付けするのではなく、L/Rの部分だけ色を変えたいが、
        // 簡易的に全体にクラスを当てる（実装コスト削減のため）
        const colorClass = isL ? 'kana-l' : 'kana-r';
        el.innerHTML = `<span class="${colorClass}">${kana}</span>`;
    }

    // --- 4. 強化版 自動変換エンジン (Main Logic) ---
    function convertToPhoneticKana(text) {
        // 1. 辞書チェック
        if (DICTIONARY[text]) return DICTIONARY[text];

        let s = text;

        // --- A. 特殊な複合文字 (Multi-char rules) ---
        s = s.replace(/tion$/, 'ション');
        s = s.replace(/sion$/, 'ジョン');
        s = s.replace(/ture$/, 'チャ');
        s = s.replace(/igh/, 'アイ');
        s = s.replace(/ough/, 'アフ');
        s = s.replace(/ph/, 'f');
        s = s.replace(/sh/, 'シュ');
        s = s.replace(/ch/, 'チ');
        s = s.replace(/ck/, 'ッk');
        s = s.replace(/ng$/, 'ンg');
        s = s.replace(/th/, 'ス'); // 簡易的にス(th)とする
        s = s.replace(/wh/, 'ホ');

        // --- B. Lの処理 (舌を弾く音) ---
        // 語頭のL
        s = s.replace(/^la/, 'ルァ');
        s = s.replace(/^li/, 'リ');
        s = s.replace(/^lu/, 'ル');
        s = s.replace(/^le/, 'レ');
        s = s.replace(/^lo/, 'ロ');
        // 子音の後のL (blue -> bル, play -> pル)
        s = s.replace(/([bcdfghjkmnpstvwz])l/g, '$1ル');
        // その他のL
        s = s.replace(/l/g, 'ル');

        // --- C. Rの処理 (唇を丸める音) ---
        // 語頭のR
        s = s.replace(/^ra/, 'ゥラ');
        s = s.replace(/^ri/, 'ゥリ');
        s = s.replace(/^ru/, 'ゥル');
        s = s.replace(/^re/, 'ゥレ');
        s = s.replace(/^ro/, 'ゥロ');
        // 語尾のR (er, ar, or) -> ァ (舌を巻く)
        s = s.replace(/er$/, 'ァ');
        s = s.replace(/ar$/, 'ァ');
        s = s.replace(/or$/, 'ォ');
        s = s.replace(/ur$/, 'ァ');
        // 子音の後のR (try -> tゥライ, cry -> kゥライ)
        s = s.replace(/([bcdfghjkmnpstvwz])r/g, '$1ゥr'); // 簡易的に
        // その他のR
        s = s.replace(/r/g, 'ゥr');

        // --- D. サイレントE (Magic E) の簡易処理 ---
        // rate -> ゥレイt, like -> ルァイk
        s = s.replace(/a([bcdfghjklmnpstvwz])e$/, 'ェイ$1');
        s = s.replace(/i([bcdfghjklmnpstvwz])e$/, 'ァイ$1');
        s = s.replace(/o([bcdfghjklmnpstvwz])e$/, 'ォウ$1');
        s = s.replace(/u([bcdfghjklmnpstvwz])e$/, 'ュー$1');

        // --- E. 語尾の子音 (母音を入れない) ---
        s = s.replace(/t$/, 't');
        s = s.replace(/k$/, 'k');
        s = s.replace(/p$/, 'p');
        s = s.replace(/d$/, 'd');
        s = s.replace(/g$/, 'g');
        s = s.replace(/m$/, 'm');
        s = s.replace(/n$/, 'ン');
        s = s.replace(/s$/, 'ス');
        s = s.replace(/ce$/, 'ス');
        s = s.replace(/se$/, 'ズ');
        s = s.replace(/ve$/, 'v');
        s = s.replace(/fe$/, 'f');

        // --- F. 基本的な母音・子音の置換 ---
        s = s.replace(/a/g, 'ァ');
        s = s.replace(/i/g, 'ィ');
        s = s.replace(/u/g, 'ゥ');
        s = s.replace(/e/g, 'ェ');
        s = s.replace(/o/g, 'ォ');
        
        s = s.replace(/b/g, 'ブ');
        s = s.replace(/c/g, 'ク'); // hard c
        s = s.replace(/d/g, 'ド');
        s = s.replace(/f/g, 'f');
        s = s.replace(/g/g, 'グ');
        s = s.replace(/h/g, 'ハ');
        s = s.replace(/j/g, 'ジャ');
        s = s.replace(/k/g, 'ク');
        s = s.replace(/m/g, 'ム');
        s = s.replace(/n/g, 'ヌ');
        s = s.replace(/p/g, 'プ');
        s = s.replace(/q/g, 'ク');
        s = s.replace(/s/g, 'ス');
        s = s.replace(/t/g, 'ト');
        s = s.replace(/v/g, 'v');
        s = s.replace(/w/g, 'ワ');
        s = s.replace(/x/g, 'クス');
        s = s.replace(/y/g, 'ィ');
        s = s.replace(/z/g, 'ズ');

        // 仕上げ: 連続するカタカナの微調整 (ゥゥ -> ゥ, etc)
        s = s.replace(/ゥゥ/g, 'ゥ');
        s = s.replace(/ルル/g, 'ル');

        return s;
    }

})();