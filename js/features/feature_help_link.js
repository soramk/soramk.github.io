/**
 * feature_help_link.js
 * ヘッダーに機能説明ページ(help.html)へのリンクボタンを追加するプラグイン。
 */

(function() {
    function injectHelpButton() {
        // ヘッダーのツールバーを探す
        const tools = document.querySelector('.header-tools');
        if (!tools) return;

        // 既にボタンがある場合は何もしない
        if (document.getElementById('help-btn')) return;

        // ヘルプボタンを作成
        const btn = document.createElement('button');
        btn.id = 'help-btn';
        btn.className = 'btn-icon'; // 既存のデザインクラスを使用
        btn.innerHTML = '❓';       // 分かりやすいアイコン
        btn.title = "機能ガイドを見る";
        
        // クリック時の動作
        btn.onclick = function() {
            window.location.href = 'help.html';
        };

        // 設定ボタン(⚙️)などの最後に追加
        tools.appendChild(btn);
    }

    // 読み込み完了後に実行
    window.addEventListener('load', () => {
        setTimeout(injectHelpButton, 500);
    });
})();