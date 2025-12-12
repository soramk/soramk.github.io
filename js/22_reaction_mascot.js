/**
 * 22_reaction_mascot.js
 * 成績に応じてリアクションするSVGマスコットを表示するプラグイン。
 * 設定画面でオン/オフが可能。
 */

(function() {
    const STORAGE_KEY = 'lr_mascot_enabled';
    let mascotContainer = null;
    let blinkInterval = null;

    // SVG定義 (Simple Dog Face)
    const SVG_BASE = `
        <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <g id="face">
                <path d="M10,30 Q0,50 10,70 L20,50 Z" fill="#d97706" />
                <path d="M90,30 Q100,50 90,70 L80,50 Z" fill="#d97706" />
                <circle cx="50" cy="50" r="40" fill="#f59e0b" stroke="#b45309" stroke-width="3"/>
                <ellipse cx="50" cy="65" rx="12" ry="8" fill="#fffbe7"/>
                <ellipse cx="50" cy="62" rx="4" ry="3" fill="#333"/>
                <path id="mouth" d="M45,75 Q50,80 55,75" stroke="#333" stroke-width="2" fill="none"/>
            </g>
            <g id="eyes">
                <circle cx="35" cy="45" r="4" fill="#333" class="eye"/>
                <circle cx="65" cy="45" r="4" fill="#333" class="eye"/>
            </g>
        </svg>
    `;

    const EYE_HAPPY = `<path d="M30,45 Q35,40 40,45" stroke="#333" stroke-width="3" fill="none"/><path d="M60,45 Q65,40 70,45" stroke="#333" stroke-width="3" fill="none"/>`;
    const EYE_SAD = `<path d="M30,48 Q35,42 40,48" stroke="#333" stroke-width="3" fill="none"/><path d="M60,48 Q65,42 70,48" stroke="#333" stroke-width="3" fill="none"/>`;
    const EYE_BLINK = `<line x1="30" y1="45" x2="40" y2="45" stroke="#333" stroke-width="3"/><line x1="60" y1="45" x2="70" y2="45" stroke="#333" stroke-width="3"/>`;

    window.addEventListener('load', () => {
        setTimeout(() => {
            injectSettingsToggle();
            applyState();
            hookResult();
        }, 800);
    });

    // 1. 設定
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-mascot-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-mascot-wrapper';
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
        checkbox.id = 'toggle-mascot-feature';
        checkbox.style.marginRight = '10px';
        
        const saved = localStorage.getItem(STORAGE_KEY);
        // デフォルトはオフ (邪魔にならないように)
        checkbox.checked = saved === null ? false : (saved === 'true');

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            applyState();
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("🐶 リアクション・マスコットを表示する"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "成績に応じて喜んだり悲しんだりするマスコットを画面右下に表示します。";
        wrapper.appendChild(desc);

        // 挿入位置: Rankの後ろ
        const rankSetting = document.getElementById('setting-rank-wrapper');
        if(rankSetting) {
            rankSetting.parentNode.insertBefore(wrapper, rankSetting.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    // 2. 表示制御
    function applyState() {
        const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
        
        if (isEnabled) {
            if (!mascotContainer) createMascot();
            mascotContainer.style.display = 'block';
            startBlinking();
        } else {
            if (mascotContainer) {
                mascotContainer.style.display = 'none';
                stopBlinking();
            }
        }
    }

    function createMascot() {
        mascotContainer = document.createElement('div');
        mascotContainer.id = 'mascot-container';
        mascotContainer.style.position = 'fixed';
        mascotContainer.style.bottom = '10px';
        mascotContainer.style.right = '10px';
        mascotContainer.style.width = '80px';
        mascotContainer.style.height = '80px';
        mascotContainer.style.zIndex = '100';
        mascotContainer.style.pointerEvents = 'none'; // タッチ透過
        mascotContainer.style.transition = 'transform 0.2s';
        
        mascotContainer.innerHTML = SVG_BASE;
        document.body.appendChild(mascotContainer);
    }

    // 3. リアクションロジック
    function hookResult() {
        const originalHandleResult = window.handleResult;
        
        window.handleResult = function(result) {
            if(originalHandleResult) originalHandleResult(result);
            
            const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
            if (!isEnabled || !mascotContainer) return;

            const isCorrect = result.isCorrect;
            const score = result.score || 0;

            if (isCorrect) {
                setExpression('happy');
                // スコアが高いとジャンプ
                if (score >= 90) jumpMascot();
            } else {
                setExpression('sad');
            }

            // 3秒後に戻る
            setTimeout(() => setExpression('normal'), 3000);
        };
    }

    function setExpression(type) {
        if (!mascotContainer) return;
        const eyes = mascotContainer.querySelector('#eyes');
        const mouth = mascotContainer.querySelector('#mouth');
        
        if (type === 'happy') {
            eyes.innerHTML = EYE_HAPPY;
            mouth.setAttribute('d', 'M40,70 Q50,85 60,70'); // Smile
        } else if (type === 'sad') {
            eyes.innerHTML = EYE_SAD;
            mouth.setAttribute('d', 'M45,80 Q50,75 55,80'); // Frown
        } else if (type === 'blink') {
            eyes.innerHTML = EYE_BLINK;
        } else {
            eyes.innerHTML = `<circle cx="35" cy="45" r="4" fill="#333"/><circle cx="65" cy="45" r="4" fill="#333"/>`;
            mouth.setAttribute('d', 'M45,75 Q50,80 55,75');
        }
    }

    function jumpMascot() {
        mascotContainer.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            mascotContainer.style.transform = 'translateY(0)';
        }, 200);
    }

    // 瞬きアニメーション
    function startBlinking() {
        if (blinkInterval) clearInterval(blinkInterval);
        blinkInterval = setInterval(() => {
            if(Math.random() > 0.7) { // ランダムに瞬き
                setExpression('blink');
                setTimeout(() => setExpression('normal'), 150);
            }
        }, 3000);
    }

    function stopBlinking() {
        if (blinkInterval) clearInterval(blinkInterval);
    }

})();