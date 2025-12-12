/**
 * js/core/events.js
 * DOM要素へのイベントリスナー登録を一括管理。
 * initAppEvents() はHTML生成後に呼ばれる必要があります。
 */

(function() {
    window.initAppEvents = function() {
        console.log("Initializing App Events...");

        // 1. Header Buttons
        // Word List Manager Button
        const dbBtn = document.getElementById('db-btn');
        if (dbBtn) {
            dbBtn.onclick = function() {
                if (typeof window.openDBManager === 'function') {
                    window.openDBManager();
                } else {
                    console.error("openDBManager is not defined.");
                }
            };
        }

        // Settings Button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.onclick = function() {
                const modal = document.getElementById('settings-modal');
                if (modal) {
                    modal.style.display = 'flex';
                }
            };
        }

        // 2. Main Controls
        // Record Button
        const recBtn = document.getElementById('rec-btn');
        if (recBtn) {
            recBtn.onclick = function() {
                if (typeof window.toggleRecord === 'function') {
                    window.toggleRecord();
                }
            };
        }

        // Next Button
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            nextBtn.onclick = function() {
                if (typeof window.nextQuestion === 'function') {
                    window.nextQuestion();
                }
            };
        }

        // Mode Toggles (Speak / Listen)
        const tabSpeak = document.getElementById('tab-speak');
        const tabListen = document.getElementById('tab-listen');
        
        if (tabSpeak) {
            tabSpeak.onclick = function() {
                if (typeof window.setMode === 'function') window.setMode('speaking');
            };
        }
        if (tabListen) {
            tabListen.onclick = function() {
                if (typeof window.setMode === 'function') window.setMode('listening');
            };
        }

        // Settings Modal: Save Button
        // (HTML内のonclick="saveSettings()"で定義されているが、JS側でバインドも可)
        window.closeSettings = function() {
            const modal = document.getElementById('settings-modal');
            if (modal) modal.style.display = 'none';
        };

        // ...他に必要なイベントがあればここに追加
    };
})();