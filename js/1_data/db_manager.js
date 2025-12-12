/**
 * js/1_data/db-manager.js
 * 単語データベースの管理、およびDBマネージャーモーダルの操作ロジック。
 * 辞書データがまだ読み込まれていなくてもエラーにならないよう対策済み。
 */

(function() {
    // 安全対策: window.db が未定義なら空箱を作っておく
    if (!window.db) window.db = {};

    let currentEditLevel = null;

    // ==========================================
    // 1. Public Functions (Global)
    // ==========================================

    // モーダルを開く
    window.openDBManager = function() {
        const modal = document.getElementById('db-manager-modal');
        if (modal) {
            modal.style.display = 'flex';
            renderLevelList(); // リスト描画
        } else {
            console.error("DB Manager modal not found. Check js/4_ui/templates.js");
            alert("Error: DB Manager HTML not loaded.");
        }
    };

    // モーダルを閉じる
    window.closeDBManager = function() {
        const modal = document.getElementById('db-manager-modal');
        if (modal) modal.style.display = 'none';
    };

    // ==========================================
    // 2. Internal Logic (Render & Edit)
    // ==========================================

    // 左サイドバー: レベル一覧の描画
    function renderLevelList() {
        const list = document.getElementById('db-level-list');
        if (!list) return;

        list.innerHTML = '';
        
        // window.db のキー（レベル名）を取得
        const levels = Object.keys(window.db);

        if (levels.length === 0) {
            list.innerHTML = '<li style="padding:10px; opacity:0.6;">No data found.</li>';
            return;
        }

        levels.forEach(key => {
            const li = document.createElement('li');
            li.className = 'db-item';
            
            // データ数取得（安全策）
            const count = Array.isArray(window.db[key]) ? window.db[key].length : 0;

            li.innerHTML = `
                <span style="font-weight:bold;">${key}</span>
                <span style="font-size:0.8rem; opacity:0.6;">(${count} words)</span>
            `;
            
            li.onclick = () => loadLevelToTable(key);
            list.appendChild(li);
        });
    }

    // 右パネル: 選択したレベルの単語一覧を表示
    function loadLevelToTable(levelId) {
        currentEditLevel = levelId;
        
        const container = document.getElementById('word-table-container');
        const title = document.getElementById('current-level-title');
        const actions = document.getElementById('word-actions');

        if (title) title.innerText = levelId;
        if (actions) actions.style.display = 'flex';

        if (!container || !window.db[levelId]) return;

        // テーブルHTML生成
        let html = `
            <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                <thead>
                    <tr style="background:rgba(128,128,128,0.1); text-align:left;">
                        <th style="padding:8px;">L Word</th>
                        <th style="padding:8px;">R Word</th>
                        <th style="width:40px;"></th>
                    </tr>
                </thead>
                <tbody id="word-tbody">
        `;

        const pairs = window.db[levelId];
        
        if (Array.isArray(pairs)) {
            pairs.forEach((pair, index) => {
                // nullチェック
                const lWord = pair.l ? pair.l.w : "";
                const rWord = pair.r ? pair.r.w : "";

                html += `
                    <tr style="border-bottom:1px solid rgba(128,128,128,0.1);">
                        <td style="padding:5px;">
                            <input type="text" value="${lWord}" class="edit-input" data-idx="${index}" data-type="l" style="width:100%;">
                        </td>
                        <td style="padding:5px;">
                            <input type="text" value="${rWord}" class="edit-input" data-idx="${index}" data-type="r" style="width:100%;">
                        </td>
                        <td style="text-align:center;">
                            <button onclick="removeWordRow(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold;">×</button>
                        </td>
                    </tr>
                `;
            });
        }

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    // ==========================================
    // 3. User Actions (Global)
    // ==========================================

    // 行追加
    window.addWordRow = function() {
        if (!currentEditLevel || !window.db[currentEditLevel]) return;
        // 空のペアを追加
        window.db[currentEditLevel].push({ 
            l: { w: "", b: [] }, 
            r: { w: "", b: [] } 
        });
        loadLevelToTable(currentEditLevel); // 再描画
    };

    // 行削除
    window.removeWordRow = function(index) {
        if (!currentEditLevel || !window.db[currentEditLevel]) return;
        window.db[currentEditLevel].splice(index, 1);
        loadLevelToTable(currentEditLevel);
    };

    // 保存（画面の入力値を反映）
    window.saveCurrentLevel = function() {
        if (!currentEditLevel || !window.db[currentEditLevel]) return;
        
        const inputs = document.querySelectorAll('#word-tbody .edit-input');
        
        // 入力欄の内容でデータ配列を更新
        inputs.forEach(input => {
            const idx = parseInt(input.dataset.idx);
            const type = input.dataset.type; // 'l' or 'r'
            const val = input.value.trim();

            if (window.db[currentEditLevel][idx] && window.db[currentEditLevel][idx][type]) {
                window.db[currentEditLevel][idx][type].w = val;
            }
        });
        
        // ここでLocalStorageに保存するなら実装
        // localStorage.setItem('lr_db_custom', JSON.stringify(window.db));
        
        alert(`Saved changes to "${currentEditLevel}"!`);
        renderLevelList(); // 件数表示更新のため
    };

    // 新規レベル作成
    window.createNewCategory = function() {
        const name = prompt("Enter new category name (e.g. My List):");
        if (!name) return;
        
        if (window.db[name]) {
            alert("Category already exists.");
        } else {
            window.db[name] = [];
            renderLevelList();
            loadLevelToTable(name);
        }
    };

    // レベル削除
    window.deleteCurrentLevel = function() {
        if (!currentEditLevel) return;
        if (confirm(`Are you sure you want to delete "${currentEditLevel}"?`)) {
            delete window.db[currentEditLevel];
            currentEditLevel = null;
            
            // 画面クリア
            document.getElementById('word-table-container').innerHTML = '';
            const title = document.getElementById('current-level-title');
            if(title) title.innerText = 'Select a Level';
            const actions = document.getElementById('word-actions');
            if(actions) actions.style.display = 'none';
            
            renderLevelList();
        }
    };
    
    // 全データリセット
    window.resetAllData = function() {
        if(confirm("Reset all data? (Local changes will be lost)")) {
            localStorage.removeItem('lr_custom_db'); // もし使っていれば
            location.reload();
        }
    };

})();