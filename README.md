# L/R Master (v28)
L/R Master は、日本人英語学習者にとって最も困難とされる「L」と「R」の発音・聞き分けを克服するために開発された、AI搭載型のWebアプリケーションです。

Google Gemini APIによるリアルタイムの発音判定・コーチング機能と、Web Audio APIによる音声可視化（スペクトログラム等）を組み合わせ、理論と実践の両面から発音改善をサポートします。

🚀 主な機能
1. 🗣️ Speaking Mode (発音練習)
AI発音判定: 録音した音声をGemini APIに送信し、正しく発音できているかを判定します。

AIコーチング: 発音が間違っていた場合、AIが「舌の位置」や「唇の形」について、日本語で具体的なアドバイスをフィードバックします。

SRS (間隔反復学習): 苦手な単語（間違いが続いた単語）を自動的に優先して出題し、効率的な記憶定着を促します。

2. 👂 Listening Mode (聞き分け練習)
LとRのミニマルペア（例: Light vs Right）を聞き分けるクイズモードです。

ネイティブに近い合成音声（Web Speech API）を使用。

3. 📊 Audio Visualizer (音声可視化)
発音時の音声をリアルタイム、および録音後に静止画として分析できます。タップで3つのモードを切り替え可能です。

WAVE (波形): 音のリズムや強弱を確認。

SPECTROGRAM (声紋): 周波数成分の時間変化を可視化。L/Rの識別に重要な第3フォルマント（F3）の動きを目で見て確認できます。

SPECTRUM (周波数分布): 声の高さの成分分布を表示。

4. 📝 Word Database Manager
カスタマイズ可能: デフォルトの単語リストに加え、独自の単語ペアを追加・編集・削除できます。

インポート/エクスポート: 作成した単語リストをJSON形式でバックアップ、または共有できます。

5. 📱 PWA (Progressive Web App) 対応
スマートフォン（iOS/Android）の「ホーム画面に追加」を行うことで、ネイティブアプリのようにフルスクリーンで動作します。

🛠️ 技術スタック
サーバーレスなSPA（Single Page Application）として構築されており、静的ホスティング環境であればどこでも動作します。

Frontend: HTML5, CSS3, Vanilla JavaScript (ES6+)

フレームワーク不使用の軽量設計

AI API: Google Gemini API (Flash / Pro models)

Audio: Web Audio API (Analysis), Web Speech API (TTS)

Storage: LocalStorage (設定、学習履歴、単語DBの保存)

📂 ディレクトリ構成
保守性を高めるため、HTMLテンプレートとロジックを分離しています。

.
├── index.html          # エントリーポイント（スクリプト読み込みのみ）
├── style.css           # スタイルシート
├── data/               # 単語データセット
│   ├── basic.js
│   ├── intermediate.js
│   └── ...
└── js/
    ├── 1_audio_visuals.js  # 音声処理・可視化ロジック
    ├── 2_db_manager.js     # DB管理・設定ロジック
    ├── 3_main.js           # アプリのコアロジック・Gemini連携
    ├── html_templates.js   # HTMLテンプレート文字列定義
    └── ui_components.js    # UI描画・注入ロジック
⚙️ セットアップと使用方法
デプロイ:

GitHub Pages、Netlify、Vercelなどの静的ホスティングサービスにリポジトリをアップロードするだけで動作します。

ローカルで動かす場合は、VS Codeの「Live Server」などを利用してください。

APIキーの設定:

アプリ起動後、右上の「⚙️ (設定)」ボタンを押し、Google Gemini API Key を入力してください。

Google AI Studio から無料でキーを取得可能です。

モデルの選択:

APIキー入力後、「🔄 Update Models」を押して利用可能なモデルリスト（Gemini 1.5 Flash等）を取得し、選択して保存します。

📄 ライセンス
This project is open source and available under the MIT License.