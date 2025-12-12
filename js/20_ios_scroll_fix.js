/**
 * 20_ios_scroll_fix.js (v3: DBマネージャー対応版)
 * iPhone (iOS) でのスクロール制御パッチ。
 * 設定画面だけでなく、Word List Managerのスクロールも許可するように修正。
 */

(function() {
    // 1. スクロール制御用のCSS
    const style = document.createElement('style');
    style.innerHTML = `
        body.ios-locked {
            position: fixed;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        .modal-overlay, .modal {
            touch-action: none; 
        }
        /* スクロール許可対象のクラス */
        .modal-content div[style*="overflow"],
        .scrollable-table,
        .db-list,
        .history-list {
            touch-action: pan-y;
            -webkit-overflow-scrolling: touch;
        }
    `;
    document.head.appendChild(style);

    let savedScrollY = 0;

    // スクロールを許可する要素のセレクタリスト
    // ★ここが修正ポイント: DB管理画面のクラス(.scrollable-table, .db-list)を追加
    const allowSelectors = '.scrollable-table, .db-list, .history-list, div[style*="overflow"]';

    window.addEventListener('load', () => {
        const settingsModal = document.getElementById('settings-modal');
        const dbModal = document.getElementById('db-manager-modal');

        [settingsModal, dbModal].forEach(modal => {
            if (modal) {
                // タッチ制御
                modal.addEventListener('touchmove', (e) => {
                    // タッチされた場所が「スクロール許可リスト」に入っていなければ無効化
                    const isScrollable = e.target.closest(allowSelectors);
                    if (!isScrollable) {
                        e.preventDefault();
                    }
                }, { passive: false });

                // 開閉検知
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.attributeName === 'style') {
                            const isOpened = modal.style.display !== 'none';
                            toggleScrollLock(isOpened);
                            
                            if (isOpened) {
                                // 開いた直後に、内部のスクロール要素全てにバウンス対策を適用
                                const scrollBoxes = modal.querySelectorAll(allowSelectors);
                                scrollBoxes.forEach(box => applyBounceFix(box));
                            }
                        }
                    });
                });
                observer.observe(modal, { attributes: true });
            }
        });
    });

    // 2. Body固定ロジック
    function toggleScrollLock(shouldLock) {
        if (shouldLock) {
            if (document.body.classList.contains('ios-locked')) return;
            savedScrollY = window.scrollY;
            document.body.style.top = `-${savedScrollY}px`;
            document.body.classList.add('ios-locked');
        } else {
            // 他のモーダルが開いている場合は解除しない
            const settingsOpen = document.getElementById('settings-modal').style.display !== 'none';
            const dbOpen = document.getElementById('db-manager-modal').style.display !== 'none';
            if (settingsOpen || dbOpen) return;

            if (!document.body.classList.contains('ios-locked')) return;
            document.body.classList.remove('ios-locked');
            document.body.style.top = '';
            window.scrollTo(0, savedScrollY);
        }
    }

    // 3. バウンス（全体浮遊）防止の1pxハック
    function applyBounceFix(element) {
        if (element.dataset.iosFixApplied) return;
        element.dataset.iosFixApplied = "true";

        element.addEventListener('touchstart', (e) => {
            const top = element.scrollTop;
            const totalScroll = element.scrollHeight;
            const currentScroll = top + element.offsetHeight;

            // スクロール可能な状態（中身が溢れている）の時だけ調整
            if (element.scrollHeight > element.offsetHeight) {
                if (top === 0) {
                    element.scrollTop = 1;
                }
                else if (currentScroll === totalScroll) {
                    element.scrollTop = top - 1;
                }
            }
        }, { passive: false });
    }

})();