/**
 * 20_ios_scroll_fix.js (v7: 復帰時再ロック・完全固定版)
 * iPhoneでホーム画面から戻った際や、タブを切り替えた際にも
 * スクロールロックが外れないよう、イベント監視を強化したパッチ。
 */

(function() {
    // 1. 強力なCSSロック
    const style = document.createElement('style');
    style.innerHTML = `
        html {
            overscroll-behavior: none;
            height: 100%;
            overflow: hidden; /* HTMLレベルでスクロールを殺す */
        }
        
        body {
            overscroll-behavior: none;
            height: 100%;
            overflow: hidden; /* Bodyも殺す */
            position: relative; /* 子要素の基準点 */
            width: 100%;
            -webkit-tap-highlight-color: transparent;
        }

        /* アプリの中身全体を包むコンテナ（もしあれば）用 */
        .container {
            overscroll-behavior: none;
        }

        /* モーダルが開いている時のBody固定用（念のため維持） */
        body.ios-locked {
            position: fixed;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        /* モーダル背景 */
        .modal-overlay, .modal {
            touch-action: none; 
            overscroll-behavior: none;
        }

        /* スクロール許可エリア（ここだけ動ける） */
        .modal-content div[style*="overflow"],
        .scrollable-table,
        .db-list,
        .history-list {
            touch-action: pan-y;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-y: contain;
            overflow-y: auto;
        }
    `;
    document.head.appendChild(style);

    const allowSelectors = '.scrollable-table, .db-list, .history-list, div[style*="overflow"]';

    // --- メイン処理 ---
    function initScrollFix() {
        // A. Body直下のタッチ移動をブロック (スクロール許可エリア以外)
        document.body.addEventListener('touchmove', (e) => {
            // モーダルが開いているかチェック
            const anyModalOpen = document.querySelector('.modal[style*="display: block"], .modal[style*="display: flex"]');
            
            if (anyModalOpen) {
                // モーダル内: 許可エリア以外はブロック
                const scrollBox = e.target.closest(allowSelectors);
                if (!scrollBox) {
                    e.preventDefault();
                } else {
                    // 端っこバウンス防止
                    preventBounce(e, scrollBox);
                }
            } else {
                // メイン画面: 基本的にスクロール不要なアプリなのでブロック
                // もしメイン画面にスクロールが必要な箇所があるなら、そこにクラスをつけて除外設定が必要
                // 今回のアプリは1画面収まり型なので全ブロックでOK
                e.preventDefault(); 
            }
        }, { passive: false });

        // B. モーダル開閉監視
        const modals = document.querySelectorAll('.modal, .modal-overlay');
        modals.forEach(modal => {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'style') {
                        const isOpened = modal.style.display !== 'none';
                        if (isOpened) {
                            // 開いた瞬間にスクロール位置リセット等のケア
                            const scrollBoxes = modal.querySelectorAll(allowSelectors);
                            scrollBoxes.forEach(box => {
                                // 1pxハック（初期位置ズラし）
                                if(box.scrollTop === 0) box.scrollTop = 1;
                            });
                        }
                    }
                });
            });
            observer.observe(modal, { attributes: true });
        });
    }

    // 端っこでのバウンス防止ロジック
    function preventBounce(e, el) {
        const isAtTop = el.scrollTop <= 0;
        const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight;

        // 上に引っ張る動作
        if (isAtTop && e.touches[0].clientY > (e.lastY || 0)) {
            // e.preventDefault(); // ここで止めるとスクロールできなくなることがあるので1pxハックに委ねる
        }
        // 下に引っ張る動作
        // ...
        
        // タッチ開始位置を保存しておくと方向判定ができるが、
        // シンプルに「中身が溢れていないなら止める」のが最強
        if (el.scrollHeight <= el.clientHeight) {
            e.preventDefault();
        }
    }

    // --- 実行 ---
    window.addEventListener('load', initScrollFix);

    // --- ★追加: 復帰時の再適用 ---
    // ホームから戻った時や、タブを切り替えて戻った時に発火
    function reapplyFix() {
        console.log("iOS Scroll Fix: Re-applying locks...");
        window.scrollTo(0, 0); // 画面位置を強制リセット
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    }

    window.addEventListener('pageshow', reapplyFix);
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            reapplyFix();
        }
    });
    window.addEventListener('resize', reapplyFix); // アドレスバーの伸縮対策

})();