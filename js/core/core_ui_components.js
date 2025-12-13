// ★ HTMLを画面に注入する処理だけのファイル

// 画面にHTMLを注入する関数
function injectUI() {
    // HTML_TEMPLATES変数が読み込まれている前提で動作します
    if (typeof HTML_TEMPLATES === 'undefined') {
        console.error("HTML_TEMPLATES not found. Make sure js/core/core_templates.js is loaded.");
        return;
    }

    // メインUIを最初に追加 (bodyの先頭へ)
    document.body.insertAdjacentHTML('afterbegin', HTML_TEMPLATES.mainInterface);
    
    // モーダル類を追加 (bodyの最後へ)
    document.body.insertAdjacentHTML('beforeend', HTML_TEMPLATES.startOverlay);
    document.body.insertAdjacentHTML('beforeend', HTML_TEMPLATES.settingsModal);
    document.body.insertAdjacentHTML('beforeend', HTML_TEMPLATES.dbManagerModal);
}