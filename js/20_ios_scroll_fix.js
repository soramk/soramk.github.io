/**
 * 20_ios_scroll_fix.js (v9: シンプル・ロバスト版)
 * 複雑なイベント制御（preventDefault）を廃止し、
 * 「CSSでのバウンス抑制」と「Bodyの完全固定」のみで制御する方式。
 * これにより、スクロール不能バグを回避しつつ、揺れを防ぎます。
 */

(function() {
    // 1. スクロール制御用のCSS
    const style = document.createElement('style');
    style.innerHTML = `
        /* HTML/Bodyレベルでの揺れ防止 */
        html {
            height: 100%;
            overscroll-behavior-y: none;
            -webkit-text-size-adjust: 100%;
        }
        body {
            min-height: 100%;
            width: 100%;
            overscroll-behavior-y: none;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }

        /* モーダルが開いた時のBody固定 (背景スクロールロック) */
        body.ios-locked {
            position: fixed;
            width: 100%;
            height: 100%;
            overflow: hidden;
            left: 0;
            top: 0; 
            /* topはJSで制御するが、初期値として */
        }

        /* モーダル内のスクロールエリア */
        .modal-content div[style*="overflow"],
        .scrollable-table,
        .db-list,
        .history-list {
            /* 滑らかなスクロール */
            -webkit-overflow-scrolling: touch;
            /* 内部スクロールが端に達しても、親(画面全体)を揺らさない */
            overscroll-behavior-y: contain; 
        }
    `;
    document.head.appendChild(style);

    let savedScrollY = 0;

    window.addEventListener('load', () => {
        // 設定画面やDBマネージャーなどのモーダルを監視
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

    // Body固定の切り替え (iOS特有のスクロール位置ズレ対策込み)
    function toggleScrollLock(shouldLock) {
        // どれか一つでも開いていればロックする
        const anyModalOpen = Array.from(document.querySelectorAll('.modal, .modal-overlay'))
            .some(m => m.style.display !== 'none' && m.style.display !== '');

        if (shouldLock || anyModalOpen) {
            // まだロックされていない場合のみ実行
            if (!document.body.classList.contains('ios-locked')) {
                savedScrollY = window.scrollY; // 現在位置を記憶
                document.body.style.top = `-${savedScrollY}px`; // その位置で固定
                document.body.classList.add('ios-locked');
            }
        } else {
            // 全てのモーダルが閉じた場合のみ解除
            if (document.body.classList.contains('ios-locked')) {
                document.body.classList.remove('ios-locked');
                document.body.style.top = '';
                window.scrollTo(0, savedScrollY); // 元の位置に復元
            }
        }
    }

    // 復帰時のケア (ロックが残りっぱなしになるのを防ぐ)
    window.addEventListener('pageshow', () => {
        document.body.classList.remove('ios-locked');
        document.body.style.top = '';
    });

})();