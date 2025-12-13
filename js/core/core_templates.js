/**
 * core_templates.js
 * アプリケーションのHTML構造を定義し、DOMに展開します。
 */

// ★ HTMLの見た目（テンプレート）を管理するオブジェクト
const HTML_TEMPLATES = {
    // 1. メイン画面
    mainInterface: `
    <div class="container">
        <div class="header-bar">
            <h1 class="app-title">L/R Master</h1>
            <div class="header-tools">
                <button id="dark-mode-btn" class="btn-icon" onclick="toggleDarkMode()" title="ダークモード">🌙</button>
                <button id="db-manager-btn" class="btn-icon" onclick="openDbManager()" title="DB編集">📝</button>
                <button id="settings-btn" class="btn-icon" onclick="openSettings()" style="color:var(--primary);" title="設定">⚙️</button>
            </div>
        </div>

        <div class="sub-header">
            <div class="mode-toggle">
                <button class="active" onclick="setMode('speaking')" id="mode-speak">🎤 発音</button>
                <button onclick="setMode('listening')" id="mode-listen">👂 聞き取り</button>
            </div>
            <select id="category-select" onchange="changeCategory()"></select>
            <span style="font-size:0.8rem; font-weight:bold; color:var(--success);">連続正解: <span id="streak-disp">0</span></span>
        </div>

        <div class="flow-options">
            <label><input type="checkbox" id="toggle-auto-flow" checked> 🔄 自動次へ</label>
            <label><input type="checkbox" id="toggle-auto-stop" checked> 🗣️ 自動停止</label>
        </div>

        <div class="visualizer-box" onclick="toggleVisMode()">
            <canvas id="visualizer"></canvas>
            <div class="vis-label" id="vis-label">波形</div>
        </div>
        
        <div id="vis-explanation" style="font-size: 0.8rem; color: var(--text); opacity: 0.8; margin-top: 5px; min-height: 3.6em; line-height: 1.4; background: rgba(128,128,128,0.1); padding: 5px; border-radius: 4px;">
            波形モード: 声の大きさの変化を表示します。
        </div>

        <div class="mic-level" id="mic-debug">マイク準備完了</div>

        <div id="word-area">
            <div id="target-word" class="word-display">...</div>
            <div class="sub-text">vs <span id="opponent-word">...</span></div>
        </div>

        <div id="speaking-tools">
            <div id="phoneme-list" class="phoneme-container"></div>
            <div class="diagram-box">
                <div id="diagram-svg" class="mouth-diagram"></div>
                <div class="diagram-text">
                    <h4 id="diagram-title">コツ <span id="viseme-tag" style="font-size:0.7em; color:var(--accent); margin-left:5px;"></span></h4>
                    <p id="diagram-desc">音素を選択</p>
                </div>
            </div>
        </div>

        <div id="controls-speaking" class="controls">
            <button class="action-btn btn-skip" onclick="skipQuestion()">スキップ</button>
            <button class="action-btn btn-model" onclick="speakModel()">🔊 お手本</button>
            <button id="rec-btn" class="action-btn btn-main" onclick="toggleRecord()">🎤 開始</button>
            <button id="next-btn-spk" class="action-btn btn-next" onclick="nextQuestion()" style="background-color:#2563eb; color:#ffffff;">次へ ➡</button>
        </div>

        <div id="controls-listening" class="controls" style="display:none; grid-template-columns: 1fr 1fr;">
            <button id="choice-l" class="choice-btn" onclick="checkListening(true)">L</button>
            <button id="choice-r" class="choice-btn" onclick="checkListening(false)">R</button>
            <button class="action-btn btn-skip" onclick="skipQuestion()">スキップ</button>
            <button class="action-btn btn-model" onclick="speakModel()">🔊 再生</button>
            <button id="next-btn-lst" class="action-btn btn-next" onclick="nextQuestion()" style="grid-column: span 2; background-color:#2563eb; color:#ffffff;">次へ ➡</button>
        </div>

        <div id="feedback-area" class="feedback">準備完了</div>
        <button id="replay-user-btn" onclick="replayUserAudio()">▶️ 自分の声を再生</button>

        <div class="history-container">
            <div style="font-size:0.8rem; font-weight:bold; color:var(--primary); margin-bottom:5px;">📜 履歴</div>
            <ul id="history-list" class="history-list"></ul>
        </div>
    </div>
    `, 

    // 2. スタート画面
    startOverlay: `
    <div id="start-overlay">
        <div style="font-size:3rem; margin-bottom:20px;">🎧</div>
        <h2>L/R Master</h2>
        <p>タップして音声を有効化</p>
        <button class="start-btn" onclick="unlockAudio()">開始</button>
    </div>
    `, 

    // 3. 設定モーダル
    settingsModal: `
    <div id="settings-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header"><h3>⚙️ 設定</h3><button class="btn-icon" onclick="closeSettings()">×</button></div>
            <div style="text-align:left; max-height:70vh; overflow-y:auto;">
                
                <div style="margin-bottom:20px; border-bottom:1px solid #ddd; padding-bottom:15px;">
                    <label style="font-size:0.9rem; font-weight:bold; color:var(--primary);">🎯 AIプロバイダー</label>
                    <select id="ai-provider" style="width:100%; padding:10px; margin-top:5px; font-weight:bold;" onchange="toggleProviderSettings()">
                        <option value="gemini">Google Gemini (推奨)</option>
                        <option value="openai">OpenAI (Whisper + GPT)</option>
                        <option value="web">ブラウザ標準 (無料/高速)</option>
                    </select>
                </div>

                <div id="config-gemini" class="provider-config">
                    <div style="margin-bottom:15px;">
                        <label style="font-size:0.8rem; font-weight:bold; color:var(--text);">Gemini APIキー</label>
                        <input type="password" id="api-key-gemini" placeholder="AIzaSy..." style="width:100%; padding:10px; margin-top:5px; box-sizing:border-box; border-radius:6px; border:1px solid rgba(128,128,128,0.3);">
                        <button onclick="fetchModels()" class="btn-small" style="width:100%; margin-top:5px;">🔄 Geminiモデルを更新</button>
                    </div>
                    <div style="margin-bottom:15px;">
                        <label style="font-size:0.8rem; font-weight:bold; color:var(--text);">モデル</label>
                        <select id="model-select" style="width:100%; padding:10px; margin-top:5px;" disabled><option>まず取得...</option></select>
                    </div>
                </div>

                <div id="config-openai" class="provider-config" style="display:none;">
                    <div style="margin-bottom:15px;">
                        <label style="font-size:0.8rem; font-weight:bold; color:var(--text);">OpenAI APIキー</label>
                        <input type="password" id="api-key-openai" placeholder="sk-..." style="width:100%; padding:10px; margin-top:5px; box-sizing:border-box; border-radius:6px; border:1px solid rgba(128,128,128,0.3);">
                        <p style="font-size:0.7rem; color:var(--text); opacity:0.7;">Whisper-1（音声認識）とGPT-4o-mini（アドバイス）を使用</p>
                    </div>
                </div>

                <div id="config-web" class="provider-config" style="display:none;">
                    <p style="font-size:0.8rem; color:var(--text); padding:10px; background:rgba(128,128,128,0.1); border-radius:6px;">
                        🚀 <b>Web Speech API</b> はブラウザ内蔵エンジンを使用します。<br>
                        • APIキー不要<br>
                        • 完全無料<br>
                        • 非常に高速<br>
                        （注意: AIアドバイスは汎用的になります）
                    </p>
                </div>

                <div style="margin-bottom:20px; margin-top:20px;">
                    <label style="font-size:0.8rem; font-weight:bold; color:var(--text);">🗣️ 再生速度: <span id="rate-val">0.8</span>x</label>
                    <input type="range" id="speech-rate" min="0.5" max="1.5" step="0.1" value="0.8" style="width:100%; margin-top:5px;" oninput="document.getElementById('rate-val').innerText=this.value">
                </div>

                <button onclick="saveSettings()" class="btn-main" style="width:100%; padding:12px; border:none; border-radius:8px; cursor:pointer;">設定を保存</button>
            </div>
        </div>
    </div>
    `, 

    // 4. DBマネージャー
    dbManagerModal: `
    <div id="db-manager-modal" class="modal-overlay" style="display:none;">
        <div class="modal-content db-manager-layout">
            <div class="modal-header">
                <h3>📝 単語リスト管理</h3>
                <button class="btn-close" onclick="closeDbManager()">×</button>
            </div>
            
            <div class="modal-body">
                <div class="sidebar">
                    <div class="sidebar-header">
                        <h4 style="margin:0;">レベル</h4>
                    </div>
                    <ul id="db-level-list" class="db-list"></ul>
                    <button onclick="addNewLevel()" class="btn-small" style="width:100%; margin-top:10px; background:var(--accent); color:white;">+ 新規レベル</button>
                    <div style="margin-top:auto; border-top:1px solid rgba(128,128,128,0.2); padding-top:10px;">
                        <button onclick="resetDb()" style="color:var(--err); background:none; border:none; text-decoration:underline; font-size:0.8rem; cursor:pointer;">デフォルトにリセット</button>
                    </div>
                </div>

                <div class="main-panel">
                    <div class="panel-header">
                        <span id="current-level-title" style="font-weight: bold; font-size: 1.1rem; color: var(--primary);">レベルを選択</span>
                        <div id="level-actions" style="display:none; gap:5px;">
                            <button onclick="triggerImport()" class="btn-small" style="background:var(--accent); color:white;">📂 インポート</button>
                            <button onclick="exportLevel()" class="btn-small" style="background:#0f172a; color:white;">💾 エクスポート</button>
                            <button onclick="deleteLevel()" class="btn-small btn-danger">🗑 レベル削除</button>
                        </div>
                    </div>

                    <div id="word-table-container" class="scrollable-table">
                        <p style="text-align:center; opacity:0.5; margin-top:50px;">左からレベルを選択して単語を表示</p>
                    </div>

                    <div id="word-actions" style="margin-top: 10px; display:none; text-align:right;">
                        <button onclick="addWordPair()" class="btn-primary">+ 新しい単語ペアを追加</button>
                    </div>
                </div>
            </div>
            
            <input type="file" id="import-file" accept=".json" style="display:none" onchange="importLevel(this)">
        </div>
    </div>
    `
};

/**
 * 初期化処理: 定義されたHTMLテンプレートをDOM（body）に注入します。
 */
function initHtmlTemplates() {
    // 全てのテンプレートを結合してbodyに挿入
    const fullHtml = 
        HTML_TEMPLATES.mainInterface + 
        HTML_TEMPLATES.startOverlay + 
        HTML_TEMPLATES.settingsModal + 
        HTML_TEMPLATES.dbManagerModal;
    
    document.body.innerHTML = fullHtml;
    console.log("Templates injected successfully.");
}

// 読み込み完了時に実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHtmlTemplates);
} else {
    initHtmlTemplates();
}