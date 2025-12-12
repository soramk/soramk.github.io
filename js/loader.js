/**
 * js/loader.js
 * 機能別に整理された新しいファイル構成に対応したローダー。
 */

(function() {
    const APP_VERSION = 'v3.3.1'; // Template Fix

    const scripts = [
        // 1. Data (Dictionaries)
        'data/basic.js',
        'data/intermediate.js',
        'data/advanced.js',
        'data/business.js',
        'https://cdn.jsdelivr.net/npm/chart.js',

        // 2. Utils
        'js/utils/ios-fix.js',

        // 3. UI Templates (★最優先: HTML生成)
        'js/ui/templates.js',

        // 4. Data Logic
        'js/data/db-manager.js',
        'js/data/scoring.js',

        // 5. Core
        'js/core/recorder.js',
        'js/core/api-client.js',
        'js/core/app-flow.js',
        'js/core/events.js', // ここでイベント登録関数を定義

        // 6. Audio
        'js/audio/visualizer.js',
        'js/audio/playback.js',

        // 7. Features
        'js/features/stats-chart.js',
        'js/features/game-f3.js',
        'js/features/game-blitz.js',
        'js/features/game-twister.js',
        'js/features/mode-sentence.js',
        'js/features/mirror.js',
        'js/features/rank-system.js',
        'js/features/effect-confetti.js',
        'js/features/mascot.js',

        // 8. UI Enhancements
        'js/ui/help-button.js',
        'js/ui/katakana-guide.js',
        'js/ui/settings-ui.js'
    ];

    let loadedCount = 0;
    const totalScripts = scripts.length;

    function loadScript(index) {
        if (index >= totalScripts) {
            console.log("All scripts loaded.");
            // 最後にアプリを起動
            if (typeof initApp === 'function') initApp();
            return;
        }

        const src = scripts[index];
        const script = document.createElement('script');
        if (!src.startsWith('http')) {
            script.src = src + '?v=' + APP_VERSION;
        } else {
            script.src = src;
        }
        script.onload = () => loadScript(index + 1);
        script.onerror = () => {
            console.error("Failed:", src);
            loadScript(index + 1);
        };
        document.body.appendChild(script);
    }

    loadScript(0);
})();