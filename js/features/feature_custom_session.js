/**
 * feature_custom_session.js
 * ユーザーが単語を選んで練習セットを作成する機能
 * 苦手単語だけを集めた「弱点克服モード」
 */

(function() {
    const STORAGE_KEY = 'lr_custom_session_enabled';
    const SESSION_DATA_KEY = 'lr_custom_sessions';

    let customSessions = {};

    function loadSessions() {
        try {
            const saved = localStorage.getItem(SESSION_DATA_KEY);
            if (saved) {
                customSessions = JSON.parse(saved);
            }
        } catch(e) {
            console.error("Failed to load custom sessions:", e);
        }
    }

    function saveSessions() {
        try {
            localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(customSessions));
        } catch(e) {
            console.error("Failed to save custom sessions:", e);
        }
    }

    function isEnabled() {
        return typeof window.getFeatureDefault === 'function'
            ? window.getFeatureDefault(STORAGE_KEY)
            : (localStorage.getItem(STORAGE_KEY) === 'true');
    }

    // 全単語リストを取得
    function getAllWords() {
        const words = [];
        if (!window.db) return words;

        Object.keys(window.db).forEach(category => {
            if (window.db[category] && Array.isArray(window.db[category])) {
                window.db[category].forEach(pair => {
                    if (pair.l && pair.l.w) words.push({ word: pair.l.w, category, isL: true, pair });
                    if (pair.r && pair.r.w) words.push({ word: pair.r.w, category, isL: false, pair });
                });
            }
        });

        return words;
    }

    // カスタムセッション作成モーダル
    function showSessionManager() {
        if (!isEnabled()) {
            alert("カスタム練習セッション機能が無効になっています。設定画面で有効にしてください。");
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'custom-session-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); z-index: 10000; display: flex;
            align-items: center; justify-content: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--card); padding: 20px; border-radius: 16px;
            max-width: 600px; max-height: 90vh; overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        `;

        let html = `
            <h2 style="margin-top:0; color:var(--primary);">🎯 カスタム練習セッション</h2>
            <div style="margin-bottom:15px;">
                <input type="text" id="session-name-input" placeholder="セッション名を入力" 
                    style="width:100%; padding:8px; border-radius:8px; background:var(--bg); color:var(--text); border:1px solid rgba(128,128,128,0.3); margin-bottom:10px;">
                <button class="btn-main" onclick="window.createCustomSession()" style="width:100%;">新規セッション作成</button>
            </div>
            <div id="session-list" style="margin:20px 0;">
                ${renderSessionList()}
            </div>
            <button class="btn-main" onclick="document.getElementById('custom-session-modal').remove();" style="width:100%;">閉じる</button>
        `;

        content.innerHTML = html;
        modal.appendChild(content);
        document.body.appendChild(modal);

        modal.onclick = function(e) {
            if (e.target === modal) modal.remove();
        };
    }

    function renderSessionList() {
        const sessions = Object.keys(customSessions);
        if (sessions.length === 0) {
            return '<p style="text-align:center; color:var(--text-light);">セッションがありません</p>';
        }

        return sessions.map(sessionName => {
            const session = customSessions[sessionName];
            return `
                <div style="border:1px solid rgba(128,128,128,0.3); border-radius:8px; padding:10px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong>${sessionName}</strong>
                            <span style="font-size:0.8rem; color:var(--text-light); margin-left:10px;">
                                (${session.words.length}単語)
                            </span>
                        </div>
                        <div>
                            <button onclick="window.startCustomSession('${sessionName}')" 
                                style="padding:5px 10px; margin-right:5px; border-radius:5px; background:var(--primary); color:white; border:none; cursor:pointer;">
                                開始
                            </button>
                            <button onclick="window.editCustomSession('${sessionName}')" 
                                style="padding:5px 10px; margin-right:5px; border-radius:5px; background:var(--accent); color:white; border:none; cursor:pointer;">
                                編集
                            </button>
                            <button onclick="window.deleteCustomSession('${sessionName}')" 
                                style="padding:5px 10px; border-radius:5px; background:#ef4444; color:white; border:none; cursor:pointer;">
                                削除
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // グローバル関数として公開
    window.createCustomSession = function() {
        const name = document.getElementById('session-name-input').value.trim();
        if (!name) {
            alert("セッション名を入力してください");
            return;
        }

        if (customSessions[name]) {
            alert("この名前のセッションは既に存在します");
            return;
        }

        showWordSelector(name);
    };

    window.startCustomSession = function(sessionName) {
        if (!customSessions[sessionName]) return;

        const session = customSessions[sessionName];
        const wordList = session.words.map(w => {
            const pair = w.pair || { l: { w: w.word, b: [] }, r: { w: w.word, b: [] } };
            return { l: pair.l, r: pair.r };
        });

        if (!window.db) window.db = {};
        window.db[`Custom: ${sessionName}`] = wordList;

        if (typeof populateCategorySelect === 'function') populateCategorySelect();

        const select = document.getElementById('category-select');
        if (select) {
            select.value = `Custom: ${sessionName}`;
            if (typeof changeCategory === 'function') changeCategory();
        }

        if (typeof setMode === 'function') setMode('speaking');

        document.getElementById('custom-session-modal').remove();
    };

    window.editCustomSession = function(sessionName) {
        showWordSelector(sessionName, customSessions[sessionName]);
    };

    window.deleteCustomSession = function(sessionName) {
        if (confirm(`「${sessionName}」を削除しますか？`)) {
            delete customSessions[sessionName];
            saveSessions();
            document.getElementById('session-list').innerHTML = renderSessionList();
        }
    };

    function showWordSelector(sessionName, existingSession = null) {
        const modal = document.createElement('div');
        modal.id = 'word-selector-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); z-index: 10001; display: flex;
            align-items: center; justify-content: center;
        `;

        const words = getAllWords();
        const selectedWords = existingSession ? existingSession.words.map(w => `${w.category}:${w.word}`) : [];

        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--card); padding: 20px; border-radius: 16px;
            max-width: 600px; max-height: 90vh; overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        `;

        let html = `
            <h3 style="margin-top:0;">単語を選択: ${sessionName}</h3>
            <div style="max-height:400px; overflow-y:auto; border:1px solid rgba(128,128,128,0.3); border-radius:8px; padding:10px;">
                ${words.map(w => {
                    const key = `${w.category}:${w.word}`;
                    const checked = selectedWords.includes(key) ? 'checked' : '';
                    return `
                        <label style="display:block; padding:5px; cursor:pointer;">
                            <input type="checkbox" value="${key}" data-word='${JSON.stringify(w)}' ${checked} 
                                style="margin-right:8px;">
                            ${w.word} <span style="color:var(--text-light); font-size:0.8rem;">(${w.category})</span>
                        </label>
                    `;
                }).join('')}
            </div>
            <div style="margin-top:15px; display:flex; gap:10px;">
                <button class="btn-main" onclick="window.saveCustomSession('${sessionName}')" style="flex:1;">保存</button>
                <button class="btn-main" onclick="document.getElementById('word-selector-modal').remove();" style="flex:1;">キャンセル</button>
            </div>
        `;

        content.innerHTML = html;
        modal.appendChild(content);
        document.body.appendChild(modal);

        modal.onclick = function(e) {
            if (e.target === modal) modal.remove();
        };
    }

    window.saveCustomSession = function(sessionName) {
        const checkboxes = document.querySelectorAll('#word-selector-modal input[type="checkbox"]:checked');
        const selectedWords = Array.from(checkboxes).map(cb => {
            const wordData = JSON.parse(cb.dataset.word);
            return {
                word: wordData.word,
                category: wordData.category,
                isL: wordData.isL,
                pair: wordData.pair
            };
        });

        customSessions[sessionName] = {
            name: sessionName,
            words: selectedWords,
            createdAt: Date.now()
        };

        saveSessions();
        document.getElementById('word-selector-modal').remove();
        document.getElementById('session-list').innerHTML = renderSessionList();
    };

    // 設定画面にトグルを追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-custom-session-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-custom-session-wrapper';
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
        checkbox.id = 'toggle-custom-session';
        checkbox.style.marginRight = '10px';
        checkbox.checked = isEnabled();

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            const btn = document.getElementById('custom-session-btn');
            if (btn) btn.style.display = checkbox.checked ? 'inline-block' : 'none';
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("🎯 カスタム練習セッションを有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "単語を選んで練習セットを作成できます。苦手単語だけを集めた練習も可能です。";
        wrapper.appendChild(desc);

        const trendSection = document.getElementById('setting-trend-wrapper');
        if (trendSection) {
            trendSection.parentNode.insertBefore(wrapper, trendSection.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    // ボタンを追加
    function injectButton() {
        const tools = document.querySelector('.header-tools');
        if (!tools || document.getElementById('custom-session-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'custom-session-btn';
        btn.className = 'btn-icon';
        btn.innerHTML = '🎯';
        btn.title = "カスタム練習セッション";
        btn.onclick = showSessionManager;
        btn.style.display = isEnabled() ? 'inline-block' : 'none';

        tools.appendChild(btn);
    }

    window.addEventListener('load', () => {
        loadSessions();
        setTimeout(() => {
            injectSettingsToggle();
            injectButton();
        }, 1000);
    });
})();

