/**
 * 20_ios_scroll_fix.js (v2: 強力固定版)
 * iPhone (iOS) で設定画面を開いた時に、中身がバウンスしたり
 * 全体が浮遊する現象を、イベント制御で物理的に阻止するパッチ。
 */

(function() {
    // 1. スクロール制御用のCSS
    const style = document.createElement('style');
    style.innerHTML = `
        /* 背景(body)を完全に固定 */
        body.ios-locked {
            position: fixed;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        /* モーダルのオーバーレイ（黒い背景）はタッチ操作を無効化 */
        .modal-overlay, .modal {
            touch-action: none; 
        }

        /* 中身のスクロール領域だけタッチ操作を許可 */
        .modal-content, .modal-content div[style*="overflow"] {
            touch-action: pan-y; /* 縦スクロールのみ許可 */
            -webkit-overflow-scrolling: touch;
        }
    `;
    document.head.appendChild(style);

    let savedScrollY = 0;

    window.addEventListener('load', () => {
        const settingsModal = document.getElementById('settings-modal');
        const dbModal = document.getElementById('db-manager-modal');

        [settingsModal, dbModal].forEach(modal => {
            if (modal) {
                // モーダル背景（黒い部分）を触った時のスクロールを禁止
                modal.addEventListener('touchmove', (e) => {
                    // タッチされた場所がスクロール可能な領域の中でなければ無効化
                    const isScrollable = e.target.closest('div[style*="overflow"]');
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
                                // 開いた直後にスクロール領域にバウンス対策を適用
                                const scrollBox = modal.querySelector('div[style*="overflow"]');
                                if (scrollBox) applyBounceFix(scrollBox);
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
            if (!document.body.classList.contains('ios-locked')) return;
            document.body.classList.remove('ios-locked');
            document.body.style.top = '';
            window.scrollTo(0, savedScrollY);
        }
    }

    // 3. ★重要: iOS特有のバウンス（中身の浮遊）を防ぐ「1pxハック」
    // 一番上にいる時に上に引っ張ると全体が動くので、強制的に1pxだけスクロールさせる
    function applyBounceFix(element) {
        // 重複登録を防ぐためのフラグ
        if (element.dataset.iosFixApplied) return;
        element.dataset.iosFixApplied = "true";

        element.addEventListener('touchstart', (e) => {
            const top = element.scrollTop;
            const totalScroll = element.scrollHeight;
            const currentScroll = top + element.offsetHeight;

            // 一番上にいるなら、1px下にずらす（これで上に引っ張れなくなる）
            if (top === 0) {
                element.scrollTop = 1;
            }
            // 一番下にいるなら、1px上にずらす（これで下に引っ張れなくなる）
            else if (currentScroll === totalScroll) {
                element.scrollTop = top - 1;
            }
        }, { passive: false });
    }

})();