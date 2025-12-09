# L/R Master
L/R Master は、日本人英語学習者にとって最も困難とされる「L」と「R」の発音・聞き分けを克服するために開発された、AI搭載型のWebアプリケーションです。

Google Gemini、OpenAI (Whisper + GPT)、またはブラウザ標準の音声認識を選択して利用可能で、Web Audio APIによる「声紋（スペクトログラム）」の可視化機能も搭載しています。

🚀 新機能 & アップデート (v29)
1. 🤖 選べる3つのAIプロバイダー
設定画面から、用途や予算に合わせて判定エンジンを切り替えられるようになりました。

Google Gemini (推奨)

特徴: 高速かつ高精度。マルチモーダルな理解力を活かし、的確なアドバイスを提供。

コスト: 無料枠（Free Tier）で十分実用可能。

OpenAI (Whisper + GPT-4o-mini)

特徴: 世界最高峰の音声認識モデル「Whisper」による正確な文字起こしと、GPTによる自然なアドバイス。

コスト: API利用料が発生（従量課金）。

Web Speech API (Browser Native)

特徴: ブラウザ内蔵エンジンを使用。APIキー不要・完全無料・爆速。

注意: 簡易的な判定となり、アドバイスは汎用的なものになります。

2. 🏗️ モジュラー構成へのリファクタリング
保守性を高めるため、JavaScriptのロジックを責務ごとに分割しました（Core, API, UI Flowなど）。

🌟 主な機能
1. 🗣️ Speaking Mode (発音練習)
AI発音判定: 録音した音声をAIが解析し、正誤を判定。

AIコーチング: 発音が間違っていた場合、「舌の位置」や「唇の形」について、日本語で具体的なアドバイスをフィードバックします。

SRS (間隔反復学習): 苦手な単語を自動的に優先出題し、記憶定着を促します。

2. 📊 Audio Visualizer (音声可視化)
発音時の音声をリアルタイム、および録音後に静止画として分析できます。タップで3つのモードを切り替え可能です。

WAVE (波形): 音のリズムや強弱を確認。

SPECTROGRAM (声紋): **L/R識別の鍵となる第3フォルマント（F3）**の変化を視覚的に確認できます。

SPECTRUM (周波数分布): 声の高さの成分分布を表示。

3. 📝 Word Database Manager
カスタマイズ可能: 独自の単語ペアを追加・編集・削除可能。

インポート/エクスポート: JSON形式でデータのバックアップや共有が可能。

4. 📱 PWA (Progressive Web App) 対応
スマートフォンの「ホーム画面に追加」に対応。ネイティブアプリのようなフルスクリーン体験を提供します。

📂 ディレクトリ構成
機能ごとにJSファイルを分割し、可読性とメンテナンス性を向上させました。

Plaintext

.
├── index.html          # エントリーポイント（スクリプト読み込み構成）
├── style.css           # スタイルシート
├── data/               # 単語データセット (basic.js, advanced.js etc.)
└── js/
    ├── 1_audio_visuals.js  # 音声可視化 (Canvas, Web Audio API)
    ├── 2_db_manager.js     # DB操作・設定管理
    ├── 3_core_logic.js     # アプリの状態管理・初期化・SRSロジック
    ├── 4_api_client.js     # API通信 (Gemini, OpenAI, Web Speech)
    ├── 5_app_flow.js       # UIインタラクション・録音フロー制御
    ├── html_templates.js   # HTMLテンプレート文字列定義
    └── ui_components.js    # DOM生成・注入ロジック
🛠️ 技術スタック
Frontend: HTML5, CSS3, Vanilla JavaScript (ES6 Modules like structure)

AI API:

Google Gemini API (Flash / Pro)

OpenAI API (Whisper-1, GPT-4o-mini)

Browser APIs:

Web Audio API (Spectral Analysis)

Web Speech API (Recognition & TTS)

Storage: LocalStorage

⚙️ セットアップと使用方法
デプロイ:

静的ファイルのみで構成されているため、GitHub PagesやNetlify等にアップロードするだけで動作します。

APIキーの設定:

アプリ右上の「⚙️ (設定)」ボタンを開きます。

AI Provider を選択し、利用するサービスのAPIキーを入力します。

Gemini: Google AI Studio で取得。

OpenAI: OpenAI Platform で取得。

Web Speech: キー入力不要ですぐに使えます。

モデルの更新:

Gemini選択時は「🔄 Update Models」を押してモデルリストを取得してください。

📄 ライセンス
This project is open source and available under the MIT License.