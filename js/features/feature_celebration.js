/**
 * feature_celebration.js (v2: 設定連動版)
 * 高得点や連勝時に、画面に紙吹雪（コンフェッティ）を舞わせる演出プラグイン。
 * 設定画面でオン/オフが可能。
 */

(function() {
    const STORAGE_KEY = 'lr_celebration_enabled';
    let confettiLoaded = false;

    // CDNからライブラリをロード
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js";
    script.onload = () => {
        confettiLoaded = true;
        console.log("Celebration: Engine Loaded.");
    };
    document.body.appendChild(script);

    window.addEventListener('load', () => {
        setTimeout(() => {
            injectSettingsToggle();
            hookResultProcessing();
        }, 800);
    });

    // 1. 設定画面にスイッチを追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-celebration-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-celebration-wrapper';
        wrapper.style.marginBottom = '15px';
        wrapper.style.padding = '10px';
        wrapper.style.background = 'rgba(128,128,128,0.05)';
        wrapper.style.borderRadius = '8px';

        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.cursor = 'pointer';
        label.style.fontWeight = 'bold';
        label.style.fontSize = '0.9rem';
        label.style.color = 'var(--text)';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'toggle-celebration';
        checkbox.style.marginRight = '10px';
        
        // デフォルト値はloader.jsで設定
        checkbox.checked = typeof window.getFeatureDefault === 'function'
            ? window.getFeatureDefault(STORAGE_KEY)
            : (localStorage.getItem(STORAGE_KEY) === 'true');

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("🎉 祝賀エフェクト (紙吹雪) を有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "高得点や連勝時に、画面に紙吹雪を舞わせます。";
        wrapper.appendChild(desc);

        // 挿入位置: F3ゲーム設定の後ろあたり
        const f3Setting = document.getElementById('setting-f3game-wrapper');
        if(f3Setting) {
            f3Setting.parentNode.insertBefore(wrapper, f3Setting.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    function hookResultProcessing() {
        const originalHandleResult = window.handleResult;

        window.handleResult = function(result) {
            if (originalHandleResult) originalHandleResult(result);

            // 設定がオフなら何もしない
            const isEnabled = localStorage.getItem(STORAGE_KEY);
            if (isEnabled !== null && isEnabled === 'false') return;

            if (!confettiLoaded) return;

            const score = result.score || 0;
            const isCorrect = result.isCorrect;
            const currentStreak = window.streak || 0;

            // 条件1: スコアが90点以上
            if (score >= 90) {
                fireConfetti('high-score');
            }
            // 条件2: 5連勝ごと
            else if (isCorrect && currentStreak > 0 && currentStreak % 5 === 0) {
                fireConfetti('streak');
            }
        };
    }

    function fireConfetti(type) {
        if (typeof confetti === 'undefined') return;

        if (type === 'high-score') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#22c55e', '#facc15', '#3b82f6']
            });
        } else if (type === 'streak') {
            const end = Date.now() + 1000;
            (function frame() {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#f472b6', '#c084fc']
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#f472b6', '#c084fc']
                });
                if (Date.now() < end) requestAnimationFrame(frame);
            }());
        }
    }
})();