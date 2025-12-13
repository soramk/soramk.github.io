/**
 * js/loader.js
 * すべてのJavaScriptファイルを正しい順序で読み込むためのローダー。
 * URLパラメータにバージョンを付与することで、キャッシュ問題を回避します。
 */

(function() {
    // 1. キャッシュ対策用のバージョン番号 (変更があればここを変えるだけで全ファイル更新されます)
    const APP_VERSION = 'v2.4.0';
    
    // 2. 拡張機能のデフォルト設定 (true=デフォルトON, false=デフォルトOFF, null=未設定時のみ適用)
    window.LR_FEATURE_DEFAULTS = {
        // ビジュアル・可視化系
        'lr_mirror_enabled': false,        // ミラーモード
        'lr_f3game_enabled': false,        // F3ゲーム
        
        // ゲーム・チャレンジ系
        'lr_blitz_enabled': false,         // Blitzモード
        'lr_twister_enabled': false,       // 早口言葉
        'lr_sentence_enabled': false,      // センテンスモード
        
        // UI・演出系
        'lr_rank_enabled': false,          // ランクシステム
        'lr_celebration_enabled': true,    // 祝賀演出
        'lr_mascot_enabled': false,        // マスコット
        
        // 学習支援系
        'lr_katakana_enabled': true,       // カタカナヒント
        
        // API・デバッグ系
        'lr_api_usage_enabled': null,      // API使用量表示 (null=プロバイダーに応じて自動)
        'lr_api_debug_enabled': false      // APIデバッグログ
    };
    
    // 3. デフォルト設定を取得するヘルパー関数
    window.getFeatureDefault = function(storageKey) {
        const defaultValue = window.LR_FEATURE_DEFAULTS[storageKey];
        const saved = localStorage.getItem(storageKey);
        
        // 既に保存されている場合はそれを返す
        if (saved !== null) {
            return saved === 'true';
        }
        
        // 保存されていない場合、デフォルト値を返す
        if (defaultValue !== null && defaultValue !== undefined) {
            return defaultValue;
        }
        
        // デフォルト値もnullの場合はfalse
        return false;
    };
    
    // 4. デフォルト設定を適用するヘルパー関数（初回のみ）
    window.applyFeatureDefault = function(storageKey) {
        const saved = localStorage.getItem(storageKey);
        if (saved === null) {
            const defaultValue = window.LR_FEATURE_DEFAULTS[storageKey];
            if (defaultValue !== null && defaultValue !== undefined) {
                localStorage.setItem(storageKey, defaultValue);
            }
        }
    }; 

    // 2. 読み込むファイルのリスト (順番が重要です)
    const scripts = [
        // --- Data Files ---
        'data/basic.js',
        'data/intermediate.js',
        'data/advanced.js',
        'data/business.js',

        // --- Core Modules ---
        'js/core/core_templates.js',         // HTMLテンプレート定義
        'js/core/core_dom_events.js',        // DOMイベントハンドラ
        'js/core/core_logic.js',             // アプリの状態管理・初期化
        'js/core/core_db_manager.js',        // データベース管理
        'js/core/core_audio_visuals.js',     // 音声可視化
        'js/core/core_api_client.js',        // API通信 (Gemini, OpenAI, Web Speech)
        'js/core/core_app_flow.js',          // アプリフロー制御
        'js/core/core_ui_components.js',     // UIコンポーネント
        
        // --- External Libraries ---
        'https://cdn.jsdelivr.net/npm/chart.js', // CDNはそのまま

        // --- Feature Extensions ---
        'js/features/feature_extensions.js',           // 学習記録の自動保存とグラフ化機能
        'js/features/feature_scoring.js',              // AIによる100点満点スコアリング機能
        'js/features/feature_api_usage.js',            // API使用量表示機能（トークン数・リクエスト数）
        'js/features/feature_api_debug.js',            // APIデバッグログ表示機能（モデル名・プロンプト内容）
        'js/features/feature_overlay_playback.js',     // 「自分の声とモデル音声の重ね合わせ再生（オーバーレイ再生）」機能
        'js/features/feature_help_link.js',            // ヘルプリンクの追加
        'js/features/feature_formant_game.js',         // フォルマント（F3）の可視化ゲーム機能
        'js/features/feature_mirror_mode.js',          // Webカメラによる「リアルタイム・ミラーリング」機能
        'js/features/feature_blitz_mode.js',           // 高速モード（Blitz Mode）ミニマル・ペア・ブリッツ（聴覚特訓）機能
        'js/features/feature_tongue_twister.js',       // 早口言葉（Tongue Twister）チャレンジ機能
        'js/features/feature_celebration.js',          // 高得点や連勝時に紙吹雪を舞わせる演出機能
        'js/features/feature_rank_system.js',          // RPG風ランクシステム機能
        'js/features/feature_katakana_hint.js',        // L/R対応カタカナ自動生成プラグイン
        'js/features/feature_sentence_mode.js',        // センテンス（短文）シャドーイング機能
        'js/features/feature_reaction_mascot.js',      // 反応するマスコット機能

        // --- Utilities ---
        'js/utils/util_settings_organizer.js',      // 設定画面の整理整頓機能（カテゴリ分け）
        'js/utils/util_ios_mic_fix.js',             // iOS向けマイク解放パッチ
        'js/utils/util_ios_scroll_fix.js'           // iOS向けスクロール固定パッチ
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