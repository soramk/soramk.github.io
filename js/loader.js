/**
 * js/loader.js
 * すべてのJavaScriptファイルを正しい順序で読み込むためのローダー。
 * URLパラメータにバージョンを付与することで、キャッシュ問題を回避します。
 */

(function() {
    // 1. キャッシュ対策用のバージョン番号 (変更があればここを変えるだけで全ファイル更新されます)
    const APP_VERSION = 'v1.8.1'; 

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
        'js/7_extensions.js',           // 学習記録の自動保存とグラフ化機能
        'js/8_scoring.js',              // AIによる100点満点スコアリング機能
        'js/9_overlay_playback.js',     // 「自分の声とモデル音声の重ね合わせ再生（オーバーレイ再生）」機能
        'js/10_help_link.js',           // ヘルプリンクの追加
        'js/11_formant_game.js',        // フォルマント（F3）の可視化ゲーム機能
        'js/12_mirror_mode.js',         // Webカメラによる「リアルタイム・ミラーリング」機能
        'js/13_blitz_mode.js',          // 高速モード（Blitz Mode）ミニマル・ペア・ブリッツ（聴覚特訓）機能
        'js/14_tongue_twister.js',      // 早口言葉（Tongue Twister）チャレンジ機能
        'js/15_celebration.js',         // 高得点や連勝時に紙吹雪を舞わせる演出機能
        'js/16_rank_system.js',         // RPG風ランクシステム機能
        'js/17_settings_organizer.js',  // 設定画面の整理整頓機能
        'js/18_ios_mic_fix.js',         // iOS向けマイク解放パッチ
        'js/19_katakana_hint.js'        // L/R対応カタカナ自動生成プラグイン
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