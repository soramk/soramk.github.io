/**
 * 20_ios_scroll_fix.js (v6: 全画面・完全固定版)
 * アプリのホーム画面（Speak/Listen）を含む、画面全体のバウンス（揺れ）を
 * CSSの標準機能とJSイベントの両方で強力に防止します。
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* 1. アプリ全体の枠組み（HTML/BODY）のバウンスを禁止 */
        html {
            overscroll-behavior-y: none; /* 縦方向の引っ張りを無効化 */
            height: 100%;                /* 高さ固定 */
            -webkit-text-size-adjust: 100%; /* 文字サイズ自動調整の無効化 */
        }
        
        body {
            overscroll-behavior-y: none; /* Bodyの引っ張りも無効化 */
            min-height: 100%;            /* コンテンツが少なくても高さを確保 */
            
            /* iPhoneでタップ時のグレー背景を消す（アプリっぽくする） */
            -webkit-tap-highlight-color: transparent; 
        }

        /* 2. モーダルが開いている時のBody固定用 */
        body.ios-locked {
            position: fixed;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        /* 3. モーダル背景の操作禁止 */
        .modal-overlay, .modal {
            touch-action: none; 
            overscroll-behavior: none;
        }

        /* 4. スクロール許可エリア（設定画面やリスト） */
        .modal-content div[style*="overflow"],
        .scrollable-table,
        .db-list,
        .history-list {
            touch-action: pan-y;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-y: contain; /* 親（Body）へ揺れを伝えない */
        }
    `;
    document.head.appendChild(style);

    let savedScrollY = 0;
    const allowSelectors = '.scrollable-table, .db-list, .history-list, div[style*="overflow"]';

    window.addEventListener('load', () => {
        const modals = document.querySelectorAll('.modal, .modal-overlay');

        modals.forEach(modal => {
            // モーダル内のタッチ制御
            modal.addEventListener('touchmove', (e) => {
                const scrollBox = e.target.closest(allowSelectors);
                
                // スクロールエリア外なら即ブロック
                if (!scrollBox) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    return;
                }

                // スクロールエリア内でも、端っこでのバウンスを防ぐ (1pxハックの簡易版)
                const isAtTop = scrollBox.scrollTop <= 0;
                const isAtBottom = scrollBox.scrollTop + scrollBox.clientHeight >= scrollBox.scrollHeight;
                
                // 中身が溢れていない場合は常にブロック
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
        
        // ★追加: メイン画面（Body）に対してもバウンス防止イベントを適用
        // (CSSのoverscroll-behaviorが効かない古いiOS向けの保険)
        document.body.addEventListener('touchmove', (e) => {
            // モーダルが開いていない時のみチェック
            if (!document.body.classList.contains('ios-locked')) {
                // Body自体がスクロール不要なサイズ（画面に収まっている）なら、スクロール操作を禁止
                if (document.body.scrollHeight <= window.innerHeight) {
                    e.preventDefault();
                }
            }
        }, { passive: false });
    });

    function toggleScrollLock(shouldLock) {
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