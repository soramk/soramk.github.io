/**
 * js/loader.js
 * すべてのJavaScriptファイルを正しい順序で読み込むためのローダー。
 * URLパラメータにバージョンを付与することで、キャッシュ問題を回避します。
 */

(function() {
    // 1. キャッシュ対策用のバージョン番号 (変更があればここを変えるだけで全ファイル更新されます)
    const APP_VERSION = 'v1.1.0'; 

    // 2. 読み込むファイルのリスト (順番が重要です)
    const scripts = [
        // --- Data Files ---
        'data/basic.js',
        'data/intermediate.js',
        'data/advanced.js',
        'data/business.js',

        // --- Core & UI ---
        'js/html_templates.js',
        'js/6_dom_events.js',
        'js/3_core_logic.js',

        // --- Logic Modules ---
        'js/2_db_manager.js',
        'js/1_audio_visuals.js',
        'js/4_api_client.js',
        'js/5_app_flow.js',
        
        // --- External Libraries ---
        'https://cdn.jsdelivr.net/npm/chart.js', // CDNはそのまま

        // --- Extensions ---
        'js/7_extensions.js',
        'js/8_scoring.js',
        'js/9_overlay_playback.js',
        'js/10_help_link.js'
    ];

    // 3. 順次読み込み処理 (Recursion to ensure execution order)
    function loadScript(index) {
        if (index >= scripts.length) {
            console.log("All scripts loaded successfully.");
            return;
        }

        const src = scripts[index];
        const script = document.createElement('script');
        
        // CDNなど外部URLでない場合のみバージョンを付与
        if (!src.startsWith('http')) {
            script.src = src + '?v=' + APP_VERSION;
        } else {
            script.src = src;
        }

        // 読み込み完了後に次を読み込む (同期的な実行順序を保証)
        script.onload = function() {
            loadScript(index + 1);
        };
        
        script.onerror = function() {
            console.error("Failed to load script:", src);
            // エラーでも次へ進むか、ここで止めるかは要件次第（今回は止まらず進む）
            loadScript(index + 1);
        };

        document.body.appendChild(script);
    }

    // 開始
    loadScript(0);
})();