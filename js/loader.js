/**
 * js/loader.js
 * 構成定義(Manifest)に基づき、依存関係順にリソースを読み込むローダー。
 */

(function() {
    const APP_VERSION = 'v4.0.0'; // Refactoring Structure

    // ==========================================
    // 1. Manifest: 読み込みファイル定義
    // ==========================================
    const Manifest = {
        // 外部ライブラリ
        libs: [
            'https://cdn.jsdelivr.net/npm/chart.js'
        ],
        // 辞書データ (ルートの data/ フォルダ)
        dictionaries: [
            'data/basic.js',
            'data/intermediate.js',
            'data/advanced.js',
            'data/business.js'
        ],
        // アプリケーションモジュール (依存順)
        modules: [
            // [Level 0] 環境修正・パッチ
            'js/0_utils/ios-fix.js',

            // [Level 1] UI基盤 (HTML生成) - 最優先
            'js/4_ui/templates.js',

            // [Level 2] データ管理・ロジック基盤
            'js/1_data/db-manager.js',
            'js/1_data/scoring.js',

            // [Level 3] アプリコア (機能の中枢)
            'js/2_core/recorder.js',
            'js/2_core/api-client.js',
            'js/2_core/app-flow.js',
            'js/2_core/events.js',  // HTML生成後にイベント登録

            // [Level 4] 音声・演出
            'js/3_audio/visualizer.js',
            'js/3_audio/playback.js',

            // [Level 5] 拡張機能・ゲーム (独立モジュール)
            'js/5_features/chart.js',
            'js/5_features/f3-game.js',
            'js/5_features/blitz.js',
            'js/5_features/twister.js',
            'js/5_features/sentence.js',
            'js/5_features/mirror.js',
            'js/5_features/rank.js',
            'js/5_features/confetti.js',
            'js/5_features/mascot.js',

            // [Level 6] UI仕上げ
            'js/4_ui/help.js',
            'js/4_ui/katakana.js',
            'js/4_ui/settings.js'
        ]
    };

    // ==========================================
    // 2. Loading Logic: 実行エンジン
    // ==========================================
    
    // 全リストを一本化 (順番は維持)
    const loadQueue = [
        ...Manifest.libs,
        ...Manifest.dictionaries,
        ...Manifest.modules
    ];

    let currentIndex = 0;

    function loadNext() {
        // 全て完了したらアプリ起動
        if (currentIndex >= loadQueue.length) {
            console.log(`%c All Scripts Loaded (${APP_VERSION}) `, 'background: #22c55e; color: #fff; padding: 2px 5px; border-radius: 3px;');
            if (typeof initApp === 'function') {
                initApp();
            } else {
                console.error("FATAL: initApp() not found. Check js/2_core/app-flow.js");
            }
            return;
        }

        const src = loadQueue[currentIndex];
        const script = document.createElement('script');

        // バージョン付与 (外部URL以外)
        if (!src.startsWith('http')) {
            script.src = src + '?v=' + APP_VERSION;
        } else {
            script.src = src;
        }

        // 同期的に読み込むための再帰処理
        script.onload = () => {
            currentIndex++;
            loadNext();
        };

        script.onerror = () => {
            console.error(`❌ Failed to load: ${src}`);
            alert(`System Error: Failed to load resource.\n${src}`);
            // エラーでも止まらず次へ (致命傷でなければ動く可能性があるため)
            currentIndex++;
            loadNext();
        };

        document.body.appendChild(script);
    }

    // 処理開始
    console.log("🚀 Starting System Loader...");
    loadNext();

})();