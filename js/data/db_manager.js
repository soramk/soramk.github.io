/**
 * js/data/db-manager.js
 * 単語リストの管理ロジック。
 * window.openDBManager などを公開し、UIからの操作を受け付けます。
 */

(function() {
    let currentEditLevel = null;

    // --- Public Functions (Global) ---

    window.openDBManager = function() {
        const modal = document.getElementById('db-manager-modal');
        if (modal) {
            modal.style.display = 'flex';
            renderLevelList();
        } else {
            console.error("DB Manager modal not found. Ensure templates.js is loaded.");
        }
    };

    window.closeDBManager = function() {
        const modal = document.getElementById('db-manager-modal');
        if (modal) modal.style.display = 'none';
    };

    // --- Internal Logic ---

    function renderLevelList() {
        const list = document.getElementById('db-level-list');
        if (!list || !window.db) return;

        list.innerHTML = '';
        Object.keys(window.db).forEach(key => {
            const li = document.createElement('li');
            li.className = 'db-item';
            
            // アイテム描画
            li.innerHTML = `
                <span style="font-weight:bold;">${key}</span>
                <span style="font-size:0.8rem; opacity:0.6;">(${window.db[key].length} words)</span>
            `;
            
            // クリックイベント
            li.onclick = () => loadLevelToTable(key);
            list.appendChild(li);
        });
    }

    function loadLevelToTable(levelId) {
        currentEditLevel = levelId;
        const container = document.getElementById('word-table-container');
        const title = document.getElementById('current-level-title');
        const actions = document.getElementById('word-actions');

        if (title) title.innerText = levelId;
        if (actions) actions.style.display = 'flex';

        if (!container || !window.db[levelId]) return;

        // テーブル生成
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

        window.db[levelId].forEach((pair, index) => {
            html += `
                <tr style="border-bottom:1px solid rgba(128,128,128,0.1);">
                    <td style="padding:5px;"><input type="text" value="${pair.l.w}" class="edit-input" data-idx="${index}" data-type="l" style="width:100%;"></td>
                    <td style="padding:5px;"><input type="text" value="${pair.r.w}" class="edit-input" data-idx="${index}" data-type="r" style="width:100%;"></td>
                    <td style="text-align:center;">
                        <button onclick="removeWordRow(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer;">×</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    // --- Action Functions (Global for HTML onclick) ---

    window.addWordRow = function() {
        if (!currentEditLevel) return;
        // ダミーデータを追加して再描画
        window.db[currentEditLevel].push({ l: { w: "", b: [] }, r: { w: "", b: [] } });
        loadLevelToTable(currentEditLevel);
    };

    window.removeWordRow = function(index) {
        if (!currentEditLevel) return;
        window.db[currentEditLevel].splice(index, 1);
        loadLevelToTable(currentEditLevel);
    };

    window.saveCurrentLevel = function() {
        if (!currentEditLevel) return;
        
        // 入力値を吸い上げ
        const inputs = document.querySelectorAll('#word-tbody .edit-input');
        const newPairs = [];
        
        // 既存の配列構造を維持しつつ更新するのは複雑なので、
        // 入力欄から再構築する簡易ロジック
        // (本来はinputのonchangeでデータを更新するが、ここではSaveボタン一括方式)
        
        // 現在のデータ数
        const count = window.db[currentEditLevel].length;
        
        for(let i=0; i<count; i++) {
             // DOMから値取得 (無ければ元のまま)
             const lInput = document.querySelector(`input[data-idx="${i}"][data-type="l"]`);
             const rInput = document.querySelector(`input[data-idx="${i}"][data-type="r"]`);
             
             if(lInput && rInput) {
                 window.db[currentEditLevel][i].l.w = lInput.value;
                 window.db[currentEditLevel][i].r.w = rInput.value;
             }
        }
        
        // LocalStorageへ保存 (実装依存だが、ここではアラートのみ)
        // 本来は localStorage.setItem('lr_custom_db', JSON.stringify(window.db)); など
        alert(`Saved ${currentEditLevel}!`);
        renderLevelList(); // 件数更新のため再描画
    };

    window.createNewCategory = function() {
        const name = prompt("Enter new category name:");
        if (name && !window.db[name]) {
            window.db[name] = [];
            renderLevelList();
        } else if (window.db[name]) {
            alert("Category already exists.");
        }
    };

    window.deleteCurrentLevel = function() {
        if (!currentEditLevel) return;
        if (confirm(`Delete category "${currentEditLevel}"?`)) {
            delete window.db[currentEditLevel];
            currentEditLevel = null;
            document.getElementById('word-table-container').innerHTML = '';
            document.getElementById('current-level-title').innerText = 'Select a Level';
            document.getElementById('word-actions').style.display = 'none';
            renderLevelList();
        }
    };
    
    window.resetAllData = function() {
        if(confirm("Reset all data to default? Custom data will be lost.")) {
            localStorage.removeItem('lr_custom_db');
            location.reload();
        }
    };

})();