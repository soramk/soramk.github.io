/**
 * js/ui/templates.js
 * アプリ内で使用するモーダルや共通HTMLパーツを生成・注入します。
 * ローダーで早い段階に読み込まれる必要があります。
 */

(function() {
    // 1. Word List Manager (DB Manager) HTML
    const DB_MANAGER_HTML = `
    <div id="db-manager-modal" class="modal">
        <div class="modal-content db-manager-layout">
            <div class="modal-header">
                <h3>📚 Word List Manager</h3>
                <button class="btn-close" onclick="closeDBManager()">×</button>
            </div>
            
            <div class="modal-body">
                <div class="sidebar">
                    <div class="sidebar-header">
                        <h4>Levels / Categories</h4>
                    </div>
                    <ul id="db-level-list" class="db-list">
                        </ul>
                    <div id="level-actions" style="margin-top:10px; display:flex; gap:5px; justify-content:center;">
                        <button class="btn-small" onclick="createNewCategory()">+ New</button>
                        <button class="btn-small btn-danger" onclick="resetAllData()">Reset</button>
                    </div>
                </div>

                <div class="main-panel">
                    <div class="panel-header">
                        <h4 id="current-level-title" style="margin:0;">Select a Level</h4>
                        <div id="word-actions" style="display:none; gap:5px;">
                            <button class="btn-small" onclick="addWordRow()">+ Add Word</button>
                            <button class="btn-small btn-main" onclick="saveCurrentLevel()">💾 Save</button>
                            <button class="btn-small btn-danger" onclick="deleteCurrentLevel()">🗑 Delete</button>
                        </div>
                    </div>
                    <div id="word-table-container" class="scrollable-table">
                        <p style="opacity:0.6; text-align:center; margin-top:50px;">
                            Select a category from the left sidebar to edit words.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    // 2. Settings Modal HTML
    const SETTINGS_MODAL_HTML = `
    <div id="settings-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>⚙️ Settings</h3>
                <button class="btn-close" onclick="closeSettings()">×</button>
            </div>
            <div style="overflow-y:auto; flex:1; padding-right:5px;">
                <div style="margin-bottom:20px;">
                    <label style="font-weight:bold;">AI Provider:</label>
                    <select id="ai-provider" style="width:100%; margin-top:5px; padding:8px;">
                        <option value="gemini">Google Gemini (Recommended)</option>
                        <option value="openai">OpenAI (GPT-4o/Mini)</option>
                        <option value="local">Web Browser Native (Offline)</option>
                    </select>
                </div>

                <div id="config-gemini" class="provider-config">
                    <label style="font-size:0.9rem;">Gemini API Key:</label>
                    <input type="password" id="api-key-gemini" placeholder="AIzaSy..." style="width:100%; padding:8px; margin-top:5px; border:1px solid #ccc; border-radius:4px;">
                </div>

                <div id="config-openai" class="provider-config" style="display:none;">
                    <label style="font-size:0.9rem;">OpenAI API Key:</label>
                    <input type="password" id="api-key-openai" placeholder="sk-..." style="width:100%; padding:8px; margin-top:5px; border:1px solid #ccc; border-radius:4px;">
                </div>

                <div id="config-web" class="provider-config" style="display:none;">
                    <p style="font-size:0.8rem; opacity:0.8;">
                        Uses your browser's built-in speech recognition and synthesis. <br>
                        No API key required, but accuracy may vary.
                    </p>
                </div>

                <hr style="margin:20px 0; border:0; border-top:1px solid rgba(128,128,128,0.2);">

                <div style="margin-bottom:20px;">
                    <label style="font-weight:bold;">Playback Speed:</label>
                    <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">
                        <span style="font-size:0.8rem;">Slow</span>
                        <input type="range" id="speech-rate" min="0.5" max="1.5" step="0.1" value="1.0" style="flex:1;">
                        <span style="font-size:0.8rem;">Fast</span>
                    </div>
                </div>

                <button class="btn-main" onclick="saveSettings()" style="width:100%; margin-top:10px;">Save Settings</button>
            </div>
        </div>
    </div>
    `;

    // 3. HTML Injection Logic
    function injectTemplates() {
        // DB Manager注入
        if (!document.getElementById('db-manager-modal')) {
            document.body.insertAdjacentHTML('beforeend', DB_MANAGER_HTML);
        }
        // Settings注入
        if (!document.getElementById('settings-modal')) {
            document.body.insertAdjacentHTML('beforeend', SETTINGS_MODAL_HTML);
        }
    }

    // 即時実行、または読み込み完了待ち
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectTemplates);
    } else {
        injectTemplates();
    }

})();