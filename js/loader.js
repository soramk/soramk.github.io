/**
 * js/loader.js
 * 番号付きフォルダ構成 (0_utils, 1_data...) に対応したローダー。
 * 辞書ファイルも js/1_data/ フォルダ内から読み込みます。
 */

(function() {
    const APP_VERSION = 'v4.3.0'; // Numbered Folders Fixed

    // ==========================================
    // 1. Manifest: 読み込みファイル定義
    // ==========================================
    const Manifest = {
        // 外部ライブラリ
        libs: [
            'https://cdn.jsdelivr.net/npm/chart.js'
        ],
        
        // 辞書データ (js/1_data/ に移動済み)
        dictionaries: [
            'js/1_data/basic.js',
            'js/1_data/intermediate.js',
            'js/1_data/advanced.js',
            'js/1_data/business.js'
        ],

        // アプリケーションモジュール (フォルダ番号順に読み込む)
        modules: [
            // [0_utils] 環境パッチ
            'js/0_utils/ios-fix.js',

            // [4_ui] HTML生成 (最優先で箱を作る)
            // ※ UIフォルダは "4" ですが、templates.js はロジックより先に必要なのでここで読みます
            'js/4_ui/templates.js',

            // [1_data] データ管理ロジック
            'js/1_data/db-manager.js',
            'js/1_data/scoring.js',

            // [2_core] アプリ中枢
            'js/2_core/recorder.js',
            'js/2_core/api-client.js',
            'js/2_core/app-flow.js',
            'js/2_core/events.js',  // HTML生成後に実行

            // [3_audio] 音声処理
            'js/3_audio/visualizer.js',
            'js/3_audio/playback.js',

            // [5_features] 拡張機能・ゲーム
            'js/5_features/chart.js',
            'js/5_features/f3-game.js',
            'js/5_features/blitz.js',
            'js/5_features/twister.js',
            'js/5_features/sentence.js',
            'js/5_features/mirror.js',
            'js/5_features/rank.js',
            'js/5_features/confetti.js',
            'js/5_features/mascot.js',

            // [4_ui] 表示仕上げ
            'js/4_ui/help.js',
            'js/4_ui/katakana.js',
            'js/4_ui/settings.js'
        ]
    };

    // ==========================================
    // 2. Loading Logic
    // ==========================================
    
    // 全リストを一本化
    const loadQueue = [
        ...Manifest.libs,
        ...Manifest.dictionaries,
        ...Manifest.modules
    ];

    let currentIndex = 0;

    function loadNext() {
        // 全て完了したらアプリ起動
        if (currentIndex >= loadQueue.length) {
            console.log(`%c System Loaded (${APP_VERSION}) `, 'background: #2563eb; color: #fff; padding: 2px 5px; border-radius: 3px;');
            if (typeof initApp === 'function') {
                initApp();
            } else {
                console.error("FATAL: initApp() not found. Check js/2_core/app-flow.js");
            }
            return;
        }

        const src = loadQueue[currentIndex];
        const script = document.createElement('script');

        // 外部URL以外にはバージョンパラメータを付与
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
            console.error(`❌ Load Error: ${src}`);
            // エラー表示
            const errBanner = document.createElement('div');
            errBanner.style.cssText = "position:fixed; top:0; left:0; width:100%; background:red; color:white; padding:10px; z-index:9999; font-weight:bold;";
            errBanner.innerText = `⚠️ Failed to load: ${src}`;
            document.body.appendChild(errBanner);
            
            // 止まらず次へ
            currentIndex++;
            loadNext();
        };

        document.body.appendChild(script);
    }

    // Start
    loadNext();

})();