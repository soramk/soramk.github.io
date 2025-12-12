/**
 * 20_ios_scroll_fix.js (v4: 揺れ完全防止版)
 * スクロール許可エリア以外でのタッチ移動を徹底的にブロックし、
 * iPhoneでの「フワフワ感」を根絶するパッチ。
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        body.ios-locked {
            position: fixed;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        .modal-overlay, .modal {
            touch-action: none; /* 基本的にタッチ無効 */
        }
        /* スクロール許可対象 */
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
    // スクロールを許可する要素のセレクタ
    const allowSelectors = '.scrollable-table, .db-list, .history-list, div[style*="overflow"]';

    window.addEventListener('load', () => {
        const settingsModal = document.getElementById('settings-modal');
        const dbModal = document.getElementById('db-manager-modal');
        // 他のモーダル(拡張機能用)もあれば対象に
        const allModals = document.querySelectorAll('.modal, .modal-overlay');

        allModals.forEach(modal => {
            // ★重要: モーダル上のタッチ移動は、許可リスト内以外全てブロック
            modal.addEventListener('touchmove', (e) => {
                const isScrollable = e.target.closest(allowSelectors);
                // スクロール可能エリアでない、またはスクロール可能エリアだが中身が溢れていない場合はブロック
                if (!isScrollable) {
                    e.preventDefault();
                } else {
                    // 中身が溢れていないならスクロールさせる必要なし(バウンス防止)
                    if (isScrollable.scrollHeight <= isScrollable.clientHeight) {
                         e.preventDefault();
                    }
                }
            }, { passive: false });

            // 開閉検知
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'style') {
                        const isOpened = modal.style.display !== 'none';
                        toggleScrollLock(isOpened);
                        
                        if (isOpened) {
                            const scrollBoxes = modal.querySelectorAll(allowSelectors);
                            scrollBoxes.forEach(box => applyBounceFix(box));
                        }
                    }
                });
            });
            observer.observe(modal, { attributes: true });
        });
    });

    function toggleScrollLock(shouldLock) {
        // どれか一つのモーダルでも開いていればロック維持
        const anyModalOpen = Array.from(document.querySelectorAll('.modal, .modal-overlay'))
            .some(m => m.style.display !== 'none' && m.style.display !== '');

        if (shouldLock || anyModalOpen) {
            if (document.body.classList.contains('ios-locked')) return;
            savedScrollY = window.scrollY;
            document.body.style.top = `-${savedScrollY}px`;
            document.body.classList.add('ios-locked');
        } else {
            if (!document.body.classList.contains('ios-locked')) return;
            document.body.classList.remove('ios-locked');
            document.body.style.top = '';
            window.scrollTo(0, savedScrollY);
        }
    }

    function applyBounceFix(element) {
        if (element.dataset.iosFixApplied) return;
        element.dataset.iosFixApplied = "true";

        element.addEventListener('touchstart', (e) => {
            const top = element.scrollTop;
            const totalScroll = element.scrollHeight;
            const currentScroll = top + element.offsetHeight;

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