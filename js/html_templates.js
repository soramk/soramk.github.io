// ★ HTMLの見た目（テンプレート）だけを管理するファイル
const HTML_TEMPLATES = {
    // 1. メイン画面
    mainInterface: `
    <div class="container">
        <div class="header-bar">
            <h1 class="app-title">L/R Master</h1>
            <div class="header-tools">
                <button class="btn-icon" onclick="toggleDarkMode()" title="ダークモード">🌙</button>
                <button class="btn-icon" onclick="openDbManager()" title="DB編集">📝</button>
                <button class="btn-icon" onclick="openSettings()" style="color:var(--primary);" title="設定">⚙️</button>
            </div>
        </div>

        <div class="sub-header">
            <div class="mode-toggle">
                <button class="active" onclick="setMode('speaking')" id="mode-speak">🎤 Speak</button>
                <button onclick="setMode('listening')" id="mode-listen">👂 Listen</button>
            </div>
            <select id="category-select" onchange="changeCategory()"></select>
            <span style="font-size:0.8rem; font-weight:bold; color:var(--success);">Streak: <span id="streak-disp">0</span></span>
        </div>

        <div class="flow-options">
            <label><input type="checkbox" id="toggle-auto-flow" checked> 🔄 Auto Next</label>
            <label><input type="checkbox" id="toggle-auto-stop" checked> 🗣️ Auto Stop</label>
        </div>

        <div class="visualizer-box" onclick="toggleVisMode()">
            <canvas id="visualizer"></canvas>
            <div class="vis-label" id="vis-label">WAVE</div>
        </div>
        
        <div id="vis-explanation" style="font-size: 0.8rem; color: var(--text); opacity: 0.8; margin-top: 5px; min-height: 3.6em; line-height: 1.4; background: rgba(128,128,128,0.1); padding: 5px; border-radius: 4px;">
            波形モード: 声の大きさの変化を表示します。
        </div>

        <div class="mic-level" id="mic-debug">Mic Ready</div>

        <div id="word-area">
            <div id="target-word" class="word-display">...</div>
            <div class="sub-text">vs <span id="opponent-word">...</span></div>
        </div>

        <div id="speaking-tools">
            <div id="phoneme-list" class="phoneme-container"></div>
            <div class="diagram-box">
                <div id="diagram-svg" class="mouth-diagram"></div>
                <div class="diagram-text">
                    <h4 id="diagram-title">Tip <span id="viseme-tag" style="font-size:0.7em; color:var(--accent); margin-left:5px;"></span></h4>
                    <p id="diagram-desc">Select phoneme</p>
                </div>
            </div>
        </div>

        <div id="controls-speaking" class="controls">
            <button class="action-btn btn-skip" onclick="skipQuestion()">Skip</button>
            <button class="action-btn btn-model" onclick="speakModel()">🔊 Model</button>
            <button id="rec-btn" class="action-btn btn-main" onclick="toggleRecord()">🎤 Start</button>
            <button id="next-btn-spk" class="action-btn btn-next" onclick="nextQuestion()" style="background-color:#2563eb; color:#ffffff;">Next ➡</button>
        </div>

        <div id="controls-listening" class="controls" style="display:none; grid-template-columns: 1fr 1fr;">
            <button id="choice-l" class="choice-btn" onclick="checkListening(true)">L</button>
            <button id="choice-r" class="choice-btn" onclick="checkListening(false)">R</button>
            <button class="action-btn btn-skip" onclick="skipQuestion()">Skip</button>
            <button class="action-btn btn-model" onclick="speakModel()">🔊 Replay</button>
            <button id="next-btn-lst" class="action-btn btn-next" onclick="nextQuestion()" style="grid-column: span 2; background-color:#2563eb; color:#ffffff;">Next ➡</button>
        </div>

        <div id="feedback-area" class="feedback">Ready</div>
        <button id="replay-user-btn" onclick="replayUserAudio()">▶️ Replay My Voice</button>

        <div class="history-container">
            <div style="font-size:0.8rem; font-weight:bold; color:var(--primary); margin-bottom:5px;">📜 History</div>
            <ul id="history-list" class="history-list"></ul>
        </div>
    </div>
    `, 

    // 2. スタート画面
    startOverlay: `
    <div id="start-overlay">
        <div style="font-size:3rem; margin-bottom:20px;">🎧</div>
        <h2>L/R Master</h2>
        <p>Tap to Unlock Audio</p>
        <button class="start-btn" onclick="unlockAudio()">START</button>
    </div>
    `, 

    // 3. 設定モーダル (修正: プロバイダー選択とOpenAIキー追加)
    settingsModal: `
    <div id="settings-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header"><h3>⚙️ Settings</h3><button class="btn-icon" onclick="closeSettings()">×</button></div>
            <div style="text-align:left; max-height:70vh; overflow-y:auto;">
                
                <div style="margin-bottom:20px; border-bottom:1px solid #ddd; padding-bottom:15px;">
                    <label style="font-size:0.9rem; font-weight:bold; color:var(--primary);">🎯 AI Provider</label>
                    <select id="ai-provider" style="width:100%; padding:10px; margin-top:5px; font-weight:bold;" onchange="toggleProviderSettings()">
                        <option value="gemini">Google Gemini (Recommended)</option>
                        <option value="openai">OpenAI (Whisper + GPT)</option>
                        <option value="web">Browser Native (Free/Fast)</option>
                    </select>
                </div>

                <div id="config-gemini" class="provider-config">
                    <div style="margin-bottom:15px;">
                        <label style="font-size:0.8rem; font-weight:bold; color:var(--text);">Gemini API Key</label>
                        <input type="password" id="api-key-gemini" placeholder="AIzaSy..." style="width:100%; padding:10px; margin-top:5px; box-sizing:border-box; border-radius:6px; border:1px solid rgba(128,128,128,0.3);">
                        <button onclick="fetchModels()" class="btn-small" style="width:100%; margin-top:5px;">🔄 Update Gemini Models</button>
                    </div>
                    <div style="margin-bottom:15px;">
                        <label style="font-size:0.8rem; font-weight:bold; color:var(--text);">Model</label>
                        <select id="model-select" style="width:100%; padding:10px; margin-top:5px;" disabled><option>Fetch first...</option></select>
                    </div>
                </div>

                <div id="config-openai" class="provider-config" style="display:none;">
                    <div style="margin-bottom:15px;">
                        <label style="font-size:0.8rem; font-weight:bold; color:var(--text);">OpenAI API Key</label>
                        <input type="password" id="api-key-openai" placeholder="sk-..." style="width:100%; padding:10px; margin-top:5px; box-sizing:border-box; border-radius:6px; border:1px solid rgba(128,128,128,0.3);">
                        <p style="font-size:0.7rem; color:var(--text); opacity:0.7;">Uses Whisper-1 (Speech) & GPT-4o-mini (Advice)</p>
                    </div>
                </div>

                <div id="config-web" class="provider-config" style="display:none;">
                    <p style="font-size:0.8rem; color:var(--text); padding:10px; background:rgba(128,128,128,0.1); border-radius:6px;">
                        🚀 <b>Web Speech API</b> uses the browser's built-in engine.<br>
                        • No API Key required<br>
                        • Completely Free<br>
                        • Very Fast<br>
                        (Note: AI advice will be generic)
                    </p>
                </div>

                <div style="margin-bottom:20px; margin-top:20px;">
                    <label style="font-size:0.8rem; font-weight:bold; color:var(--text);">🗣️ Playback Speed: <span id="rate-val">0.8</span>x</label>
                    <input type="range" id="speech-rate" min="0.5" max="1.5" step="0.1" value="0.8" style="width:100%; margin-top:5px;" oninput="document.getElementById('rate-val').innerText=this.value">
                </div>

                <button onclick="saveSettings()" class="btn-main" style="width:100%; padding:12px; border:none; border-radius:8px; cursor:pointer;">Save Settings</button>
            </div>
        </div>
    </div>
    `, 

    // 4. DBマネージャー (変更なし)
    dbManagerModal: `
    <div id="db-manager-modal" class="modal">
        <div class="modal-content" style="max-width: 800px; height: 80vh;">
            <div class="modal-header">
                <h3>📝 Word List Manager</h3>
                <button class="btn-icon" onclick="closeDbManager()">×</button>
            </div>
            
            <div style="display: flex; gap: 15px; height: 100%; overflow: hidden;">
                <div style="width: 200px; border-right: 1px solid rgba(128,128,128,0.2); overflow-y: auto; padding-right: 10px; flex-shrink: 0;">
                    <h4 style="margin:0 0 10px 0; font-size:0.9rem;">Levels</h4>
                    <ul id="db-level-list" class="db-list"></ul>
                    <button onclick="addNewLevel()" class="btn-small" style="width:100%; margin-top:10px; background:var(--accent);">+ New Level</button>
                    <div style="margin-top:20px; border-top:1px solid rgba(128,128,128,0.2); padding-top:10px;">
                        <button onclick="resetDb()" style="color:var(--err); background:none; border:none; text-decoration:underline; font-size:0.8rem; cursor:pointer;">Reset to Defaults</button>
                    </div>
                </div>

                <div style="flex-grow: 1; display: flex; flex-direction: column; overflow: hidden;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span id="current-level-title" style="font-weight: bold; font-size: 1.1rem; color: var(--primary);">Select a Level</span>
                        <div id="level-actions" style="display:none; gap:5px;">
                            <button onclick="triggerImport()" class="btn-small" style="background:var(--accent);">📂 Import JSON</button>
                            <button onclick="exportLevel()" class="btn-small" style="background:#0f172a;">💾 Export</button>
                            <button onclick="deleteLevel()" class="btn-small" style="background:var(--err);">🗑 Del Level</button>
                        </div>
                    </div>

                    <div id="word-table-container" style="flex-grow: 1; overflow-y: auto; background: rgba(128,128,128,0.05); border-radius: 8px; padding: 5px;">
                        <p style="text-align:center; opacity:0.5; margin-top:20px;">Select a level from the left to view words.</p>
                    </div>

                    <div id="word-actions" style="margin-top: 10px; display:none;">
                        <button onclick="addWordPair()" class="btn-main" style="width:100%; padding:10px;">+ Add New Word Pair</button>
                    </div>
                </div>
            </div>
            
            <input type="file" id="import-file" accept=".json" style="display:none" onchange="importLevel(this)">
        </div>
    </div>
    `
};