/**
 * util_header_menu.js
 * ヘッダーのアイコンボタンを整理し、「その他」メニューにまとめる機能
 */

(function() {
    // 主要機能（常に表示）
    const PRIMARY_BUTTONS = ['settings-btn', 'db-manager-btn', 'dark-mode-btn'];
    
    // その他メニューに移動する機能
    const SECONDARY_BUTTONS = [
        { id: 'trend-btn', icon: '📈', title: '発音トレンド分析' },
        { id: 'custom-session-btn', icon: '🎯', title: 'カスタム練習セッション' },
        { id: 'coaching-btn', icon: '🎓', title: '発音コーチング' },
        { id: 'detailed-stats-btn', icon: '📋', title: '詳細統計' },
        { id: 'help-btn', icon: '❓', title: '機能ガイド' }
    ];

    // Study Progressボタンもその他メニューに追加（feature_extensions.jsで追加される）
    // ただし、IDがない可能性があるので、onclickで判定

    let moreMenuOpen = false;

    function createMoreMenu() {
        const tools = document.querySelector('.header-tools');
        if (!tools || document.getElementById('more-menu-btn')) return;

        // 「その他」ボタンを作成
        const moreBtn = document.createElement('button');
        moreBtn.id = 'more-menu-btn';
        moreBtn.className = 'btn-icon';
        moreBtn.innerHTML = '⋯';
        moreBtn.title = 'その他';
        moreBtn.style.cssText = `
            font-size: 1.5rem;
            line-height: 1;
            padding: 6px 10px;
        `;
        moreBtn.onclick = toggleMoreMenu;

        // ドロップダウンメニューを作成
        const menu = document.createElement('div');
        menu.id = 'more-menu-dropdown';
        menu.style.cssText = `
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 8px;
            background: var(--card);
            border: 1px solid rgba(128,128,128,0.3);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            min-width: 200px;
            z-index: 1000;
            display: none;
            flex-direction: column;
            padding: 8px;
            gap: 4px;
        `;

        // メニューアイテムを追加
        SECONDARY_BUTTONS.forEach(btn => {
            const menuItem = document.createElement('button');
            menuItem.className = 'more-menu-item';
            menuItem.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                border: none;
                background: transparent;
                color: var(--text);
                cursor: pointer;
                border-radius: 6px;
                text-align: left;
                font-size: 0.9rem;
                transition: background 0.2s;
            `;
            menuItem.innerHTML = `<span style="font-size:1.2rem;">${btn.icon}</span><span>${btn.title}</span>`;
            menuItem.onmouseover = function() {
                this.style.background = 'rgba(128,128,128,0.1)';
            };
            menuItem.onmouseout = function() {
                this.style.background = 'transparent';
            };
            menuItem.onclick = function() {
                const originalBtn = document.getElementById(btn.id);
                if (originalBtn && originalBtn.onclick) {
                    originalBtn.onclick();
                }
                toggleMoreMenu();
            };

            menu.appendChild(menuItem);
        });

        // ヘッダーバーに相対配置のコンテナを作成
        const headerBar = document.querySelector('.header-bar');
        if (headerBar) {
            headerBar.style.position = 'relative';
            headerBar.appendChild(menu);
        }

        tools.appendChild(moreBtn);
    }

    function toggleMoreMenu() {
        const menu = document.getElementById('more-menu-dropdown');
        if (!menu) return;

        moreMenuOpen = !moreMenuOpen;
        menu.style.display = moreMenuOpen ? 'flex' : 'none';
    }

    function organizeButtons() {
        const tools = document.querySelector('.header-tools');
        if (!tools) return;

        // 既存のボタンを整理
        const buttons = Array.from(tools.querySelectorAll('.btn-icon'));
        
        buttons.forEach(btn => {
            const btnId = btn.id;
            
            // 「その他」ボタン自体はスキップ
            if (btnId === 'more-menu-btn') return;
            
            // 主要機能はそのまま表示
            const isPrimary = PRIMARY_BUTTONS.some(id => {
                if (btnId === id) return true;
                const onclick = btn.getAttribute('onclick');
                if (onclick) {
                    if (id === 'settings-btn' && onclick.includes('openSettings')) return true;
                    if (id === 'db-manager-btn' && onclick.includes('openDbManager')) return true;
                    if (id === 'dark-mode-btn' && onclick.includes('toggleDarkMode')) return true;
                }
                return false;
            });
            
            if (isPrimary) {
                btn.style.display = 'inline-flex';
                return;
            }

            // その他メニューに移動する機能は非表示
            if (SECONDARY_BUTTONS.some(b => b.id === btnId)) {
                btn.style.display = 'none';
            }
            
            // Study Progressボタンも非表示（onclickで判定）
            const onclick = btn.getAttribute('onclick');
            if (onclick && onclick.includes('openStatsModal') && !btnId) {
                btn.style.display = 'none';
                // メニューに追加
                const menu = document.getElementById('more-menu-dropdown');
                if (menu && !menu.querySelector('[data-study-progress]')) {
                    const menuItem = document.createElement('button');
                    menuItem.className = 'more-menu-item';
                    menuItem.setAttribute('data-study-progress', 'true');
                    menuItem.style.cssText = `
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 10px;
                        border: none;
                        background: transparent;
                        color: var(--text);
                        cursor: pointer;
                        border-radius: 6px;
                        text-align: left;
                        font-size: 0.9rem;
                        transition: background 0.2s;
                    `;
                    menuItem.innerHTML = '<span style="font-size:1.2rem;">📊</span><span>学習記録</span>';
                    menuItem.onmouseover = function() {
                        this.style.background = 'rgba(128,128,128,0.1)';
                    };
                    menuItem.onmouseout = function() {
                        this.style.background = 'transparent';
                    };
                    menuItem.onclick = function() {
                        if (btn.onclick) btn.onclick();
                        toggleMoreMenu();
                    };
                    menu.appendChild(menuItem);
                }
            }
        });
    }

    // クリック外部でメニューを閉じる
    document.addEventListener('click', function(e) {
        const menu = document.getElementById('more-menu-dropdown');
        const moreBtn = document.getElementById('more-menu-btn');
        
        if (menu && moreBtn && moreMenuOpen) {
            if (!menu.contains(e.target) && !moreBtn.contains(e.target)) {
                toggleMoreMenu();
            }
        }
    });

    window.addEventListener('load', () => {
        setTimeout(() => {
            createMoreMenu();
            organizeButtons();
        }, 1500);
    });

    // ボタンが追加された後に再整理
    const observer = new MutationObserver(() => {
        organizeButtons();
    });

    window.addEventListener('load', () => {
        const tools = document.querySelector('.header-tools');
        if (tools) {
            observer.observe(tools, { childList: true });
        }
    });
})();

