/**
 * util_ios_scroll_fix.js (v11: CSS移管・軽量版)
 * スタイル定義をstyle.cssに移管したため、
 * JSは「モーダル開閉時のクラス切り替え(ios-locked)」と「位置調整」のみを行います。
 */

(function() {
    let savedScrollY = 0;

    window.addEventListener('load', () => {
        // 監視対象のモーダル
        const modals = document.querySelectorAll('.modal, .modal-overlay');

        modals.forEach(modal => {
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

    // Body固定の切り替え
    function toggleScrollLock(shouldLock) {
        // どれか一つでも開いていればロックする
        const anyModalOpen = Array.from(document.querySelectorAll('.modal, .modal-overlay'))
            .some(m => m.style.display !== 'none' && m.style.display !== '');

        if (shouldLock || anyModalOpen) {
            // ロック開始
            if (!document.body.classList.contains('ios-locked')) {
                savedScrollY = window.scrollY; // 現在位置を記憶
                document.body.style.top = `-${savedScrollY}px`; // 位置ズレ防止
                document.body.classList.add('ios-locked');
            }
        } else {
            // ロック解除
            if (document.body.classList.contains('ios-locked')) {
                document.body.classList.remove('ios-locked');
                document.body.style.top = '';
                window.scrollTo(0, savedScrollY); // 元の位置に戻す
            }
        }
    }

    // 復帰時のケア
    window.addEventListener('pageshow', () => {
        document.body.classList.remove('ios-locked');
        document.body.style.top = '';
    });

})();