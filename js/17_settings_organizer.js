/**
 * 17_settings_organizer.js (v3: 保存ボタン固定化版)
 * 設定項目を整理し、保存ボタンをスクロール領域の外に出して
 * 常に画面最下部に固定表示されるようにします。
 */

(function() {
    window.addEventListener('load', () => {
        // 全てのプラグインが読み込まれた後に実行
        setTimeout(organizeSettingsLayout, 1500);
    });

    function organizeSettingsLayout() {
        const modalContent = document.querySelector('#settings-modal .modal-content');
        if (!modalContent) return;

        // スクロール領域 (overflow-y:auto が指定されているdiv)
        const scrollableBody = modalContent.querySelector('div[style*="overflow"]');
        if (!scrollableBody) return;

        // --- 1. 要素の特定 ---
        const providerSection = document.querySelector('#ai-provider') ? document.querySelector('#ai-provider').closest('div') : null;
        const configGemini = document.getElementById('config-gemini');
        const configOpenAI = document.getElementById('config-openai');
        const configWeb = document.getElementById('config-web');
        const speedSection = document.getElementById('speech-rate') ? document.getElementById('speech-rate').closest('div') : null;
        
        // 保存ボタンを特定
        const saveBtn = scrollableBody.querySelector('.btn-main');

        const katakanaSection = document.getElementById('setting-katakana-wrapper');

        const extensionOrder = [
            'setting-mirror-wrapper',
            'setting-f3game-wrapper',
            'setting-blitz-wrapper',
            'setting-twister-wrapper',
            'setting-rank-wrapper',
            'setting-celebration-wrapper'
        ];

        // --- 2. グループコンテナ作成 ---
        const basicGroup = document.createElement('div');
        basicGroup.innerHTML = '<h4 style="margin:0 0 10px; color:var(--primary); border-bottom:2px solid rgba(128,128,128,0.1); padding-bottom:5px;">🎧 基本設定 (Basic)</h4>';
        basicGroup.style.marginBottom = '25px';

        const extGroup = document.createElement('div');
        extGroup.innerHTML = '<h4 style="margin:0 0 10px; color:var(--accent); border-bottom:2px solid rgba(128,128,128,0.1); padding-bottom:5px;">🧩 拡張機能 (Extensions)</h4>';
        extGroup.style.marginBottom = '10px';
        extGroup.style.display = 'grid';
        extGroup.style.gap = '12px';

        // --- 3. 配置 (Basic) ---
        if(providerSection) basicGroup.appendChild(providerSection);
        if(configGemini) basicGroup.appendChild(configGemini);
        if(configOpenAI) basicGroup.appendChild(configOpenAI);
        if(configWeb) basicGroup.appendChild(configWeb);
        if(speedSection) {
            speedSection.style.marginTop = "15px"; 
            speedSection.style.marginBottom = "15px"; 
            basicGroup.appendChild(speedSection);
        }
        if(katakanaSection) {
            katakanaSection.style.margin = "0";
            basicGroup.appendChild(katakanaSection);
        }

        // --- 4. 配置 (Extensions) ---
        extensionOrder.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.margin = '0';
                extGroup.appendChild(el);
            }
        });

        // --- 5. DOM再構築 ---
        
        // スクロール領域の中身を整理 (Basic -> Ext の順に先頭に追加)
        // 既存の要素が残っていても、appendChildで移動するので問題なし
        scrollableBody.insertBefore(extGroup, scrollableBody.firstChild);
        scrollableBody.insertBefore(basicGroup, scrollableBody.firstChild);

        // --- 6. 保存ボタンの固定フッター化 (Fix Footer) ---
        if (saveBtn) {
            // スクロール領域の高さを少し制限して、フッター分のスペースを空ける
            // (元が max-height:70vh なので、少し減らす)
            scrollableBody.style.maxHeight = '60vh'; 
            
            // フッター用のコンテナを作成
            let footer = modalContent.querySelector('.settings-footer');
            if (!footer) {
                footer = document.createElement('div');
                footer.className = 'settings-footer';
                // スタイル: 上に境界線を引き、余白を取る
                footer.style.borderTop = '1px solid rgba(128,128,128,0.2)';
                footer.style.paddingTop = '15px';
                footer.style.marginTop = '10px';
                footer.style.textAlign = 'center';
                
                // モーダルのコンテンツの最後（スクロール領域の外）に追加
                modalContent.appendChild(footer);
            }

            // ボタンをスクロール領域からフッターへ移動
            saveBtn.style.width = '100%';
            saveBtn.style.margin = '0';
            footer.appendChild(saveBtn);
        }

        console.log("Settings Organizer: Save button fixed to bottom.");
    }
})();