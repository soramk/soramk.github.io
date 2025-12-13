// --- Global Variables Assumption ---
// 3_core_logic.js で window.db = {}; が宣言されている前提ですが、
//念のためここで selectedLevel を定義します。
let selectedLevel = null;

// もし db が未定義ならエラーになるのを防ぐ安全策（本来は core_logic.js にあるべき）
if (typeof db === 'undefined') {
    window.db = {}; 
}

// --- Data Loading Logic ---
// 注: db変数は 3_core_logic.js で定義されたグローバル変数を使用します

async function loadDb() {
    const s = localStorage.getItem('lr_v24_db');
    if (s) {
        try {
            // グローバルのdb変数に代入
            const loaded = JSON.parse(s);
            // 既存のオブジェクトを維持しつつ中身を更新
            Object.assign(db, loaded);
            console.log("Loaded DB from LocalStorage");
            return;
        } catch (e) { console.error("LS load failed", e); }
    }
    console.log("Loading default datasets...");
    
    // グローバルのdbを初期化
    if (typeof window.dataset_basic !== 'undefined') db['basic'] = window.dataset_basic; else db['basic'] = [];
    if (typeof window.dataset_intermediate !== 'undefined') db['intermediate'] = window.dataset_intermediate; else db['intermediate'] = [];
    if (typeof window.dataset_advanced !== 'undefined') db['advanced'] = window.dataset_advanced; else db['advanced'] = [];
    if (typeof window.dataset_business !== 'undefined') db['business'] = window.dataset_business; else db['business'] = [];
}

function populateCategorySelect() { 
    const s=document.getElementById('category-select'); 
    if(!s) return;
    s.innerHTML=''; 
    
    // ★修正: window.db を確実に参照
    const database = window.db || {};

    Object.keys(database).forEach(k=>{
        const o=document.createElement('option');
        o.value=k;
        o.text=`${k} (${database[k].length})`;
        s.appendChild(o);
    }); 
    
    // ★修正: window.currentCategory を確実に参照
    if(window.currentCategory && database[window.currentCategory]) {
        s.value = window.currentCategory;
    }
}

// --- DB MANAGER LOGIC ---
function openDbManager() {
    document.getElementById('db-manager-modal').style.display = 'flex';
    renderDbList();
    selectedLevel = null;
    document.getElementById('current-level-title').innerText = "レベルを選択";
    document.getElementById('word-table-container').innerHTML = '<p style="text-align:center; opacity:0.5; margin-top:50px;">👈 左からレベルを選択</p>';
    document.getElementById('level-actions').style.display = 'none';
    document.getElementById('word-actions').style.display = 'none';
}

function closeDbManager() { 
    document.getElementById('db-manager-modal').style.display = 'none'; 
    populateCategorySelect(); 
    if(typeof changeCategory === 'function') changeCategory(); 
}

function renderDbList() {
    const l = document.getElementById('db-level-list'); 
    if(!l) return;
    l.innerHTML = '';
    // ★修正: window.db を確実に参照
    const database = window.db || {};
    
    Object.keys(database).forEach(k => {
        const li = document.createElement('li'); li.className = 'db-item'; li.style.cursor = 'pointer';
        if (k === selectedLevel) li.style.background = 'rgba(128,128,128,0.1)';
        li.innerHTML = `<span>${k}</span> <span style="font-size:0.8rem; opacity:0.7;">(${database[k].length})</span>`;
        li.onclick = () => selectLevel(k); l.appendChild(li);
    });
}

function selectLevel(k) {
    selectedLevel = k; renderDbList();
    document.getElementById('current-level-title').innerText = k;
    document.getElementById('level-actions').style.display = 'flex';
    document.getElementById('word-actions').style.display = 'block';
    renderWordTable();
}

function renderWordTable() {
    const container = document.getElementById('word-table-container');
    const database = window.db || {};
    const list = database[selectedLevel];
    
    if (!list || list.length === 0) { container.innerHTML = '<p style="text-align:center; opacity:0.5; padding:20px;">単語がまだありません。追加してください！</p>'; return; }
    let html = '<table style="width:100%; border-collapse: collapse; font-size:0.9rem;">';
    html += '<tr style="border-bottom:2px solid rgba(128,128,128,0.2); text-align:left;"><th>Lの単語</th><th>Rの単語</th><th style="text-align:right;">操作</th></tr>';
    list.forEach((pair, idx) => {
        const hasPhonemes = (pair.l.b && pair.l.b.length > 0);
        html += `<tr style="border-bottom:1px solid rgba(128,128,128,0.1);">
            <td style="padding:8px;">${pair.l.w}</td>
            <td style="padding:8px;">${pair.r.w}</td>
            <td style="padding:8px; text-align:right;">
                <span title="${hasPhonemes ? 'アニメーション準備完了' : 'アニメーションデータなし'}" style="cursor:help; font-size:0.8rem; margin-right:10px;">${hasPhonemes ? '✅' : '⚠️'}</span>
                <button onclick="deletePair(${idx})" class="btn-small" style="background:var(--err);">削除</button>
            </td>
        </tr>`;
    });
    html += '</table>'; container.innerHTML = html;
}

function addNewLevel() {
    const n = prompt("新しいレベル名を入力してください（例: 'Travel'）:");
    const database = window.db || {};
    if (n && !database[n]) { database[n] = []; saveDb(); renderDbList(); selectLevel(n); } else if(database[n]) { alert("このレベルは既に存在します！"); }
}

function deleteLevel() {
    if (!selectedLevel) return;
    const database = window.db || {};
    if (confirm(`レベル "${selectedLevel}" とそのすべての単語を削除しますか？`)) { delete database[selectedLevel]; selectedLevel = null; saveDb(); openDbManager(); }
}

function addWordPair() {
    if (!selectedLevel) return;
    const database = window.db || {};

    // 1. 単語の入力
    const lWord = prompt("Lの単語を入力してください (例: Light):"); 
    if (!lWord) return;
    
    const rWord = prompt("Rの単語を入力してください (例: Right):"); 
    if (!rWord) return;

    // 2. 音素データの簡易入力 (空でもOKにする)
    // 入力例: l_shape,wide,alveolar
    const lPhonemesStr = prompt(`"${lWord}" の口の動き（音素ID）をカンマ区切りで入力してください。\n(省略可。例: l_shape,wide,alveolar)`, "l_shape,wide");
    const rPhonemesStr = prompt(`"${rWord}" の口の動き（音素ID）をカンマ区切りで入力してください。\n(省略可。例: r_shape,wide,alveolar)`, "r_shape,wide");

    // 音素文字列をオブジェクト配列に変換するヘルパー
    const parsePhonemes = (str) => {
        if (!str) return [];
        return str.split(',').map(s => {
            const key = s.trim();
            // IDがそのまま表示記号になる簡易実装
            return { p: key, t: key }; 
        }).filter(item => item.p !== "");
    };

    // 3. データの登録
    database[selectedLevel].push({ 
        l: { w: lWord, b: parsePhonemes(lPhonemesStr) }, 
        r: { w: rWord, b: parsePhonemes(rPhonemesStr) } 
    });

    saveDb(); 
    renderWordTable();
    alert(`"${lWord} / ${rWord}" を追加しました。`);
}

function deletePair(idx) {
    if (!selectedLevel) return;
    const database = window.db || {};
    if (confirm("このペアを削除しますか？")) { database[selectedLevel].splice(idx, 1); saveDb(); renderWordTable(); }
}

function exportLevel() {
    if (!selectedLevel) return;
    const database = window.db || {};
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(database[selectedLevel], null, 2));
    const a = document.createElement('a'); a.setAttribute("href", dataStr); a.setAttribute("download", `LR_Master_${selectedLevel}.json`);
    document.body.appendChild(a); a.click(); a.remove();
}

function triggerImport() { document.getElementById('import-file').click(); }

function importLevel(input) {
    if (!selectedLevel) return;
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            if (!Array.isArray(json)) throw new Error("ファイルにはリスト（配列）が含まれている必要があります。");
            const database = window.db || {};
            if(confirm("OKをクリックで追加（APPEND）\nキャンセルで置き換え（REPLACE）")) { database[selectedLevel] = database[selectedLevel].concat(json); } else { database[selectedLevel] = json; }
            saveDb(); renderWordTable(); alert("インポート成功！");
        } catch (err) { alert("インポート失敗: " + err.message); }
        input.value = '';
    };
    reader.readAsText(file);
}

function saveDb() { localStorage.setItem('lr_v24_db', JSON.stringify(window.db)); }

async function resetDb(){
    if(confirm("すべてのデータをデフォルトにリセットしますか？")) { localStorage.removeItem('lr_v24_db'); await loadDb(); openDbManager(); }
}