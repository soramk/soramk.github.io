/**
 * 20_ios_scroll_fix.js (v5: CSS物理ロック版)
 * iOS特有のスクロールバウンス（揺れ）をCSSとJSの両面から物理的にロックします。
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        body.ios-locked {
            position: fixed;
            width: 100%;
            height: 100%;
            overflow: hidden;
            overscroll-behavior: none; /* バウンス禁止 */
        }
        /* モーダル背景は一切の操作を禁止 */
        .modal-overlay, .modal {
            touch-action: none; 
            overscroll-behavior: none;
        }
        /* 中身のスクロールエリアだけ操作許可 */
        .modal-content div[style*="overflow"],
        .scrollable-table,
        .db-list,
        .history-list {
            touch-action: pan-y;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-y: contain; /* 親要素への伝播禁止 */
        }
    `;
    document.head.appendChild(style);

    let savedScrollY = 0;
    const allowSelectors = '.scrollable-table, .db-list, .history-list, div[style*="overflow"]';

    window.addEventListener('load', () => {
        const modals = document.querySelectorAll('.modal, .modal-overlay');

        modals.forEach(modal => {
            // タッチ移動の強力ブロック
            modal.addEventListener('touchmove', (e) => {
                const scrollBox = e.target.closest(allowSelectors);
                
                // スクロールエリア外なら即ブロック
                if (!scrollBox) {
                    e.preventDefault();
                    e.stopImmediatePropagation(); // 念押し
                    return;
                }

                // スクロールエリア内でも、端っこでのバウンスを防ぐ
                const isAtTop = scrollBox.scrollTop <= 0;
                const isAtBottom = scrollBox.scrollTop + scrollBox.clientHeight >= scrollBox.scrollHeight;
                
                // 上に引っ張ろうとした時 or 下に引っ張ろうとした時
                // (ただし中身が溢れていない場合は常にブロック)
                if (scrollBox.scrollHeight <= scrollBox.clientHeight) {
                    e.preventDefault();
                }
            }, { passive: false });

            // 開閉検知
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'style') {
                        const isOpened = modal.style.display !== 'none';
                        toggleScrollLock(isOpened);
                    }
                });
            });
            observer.observe(modal, { attributes: true });
        });
    });

    function toggleScrollLock(shouldLock) {
        // どれか一つのモーダルでも開いていればロック
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
})();