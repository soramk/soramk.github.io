/**
 * feature_time_attack.js
 * タイムアタックモード機能
 * 制限時間内に何問正解できるか挑戦
 */

(function() {
    const STORAGE_KEY = 'lr_time_attack_enabled';
    const TIME_LIMIT_KEY = 'lr_time_attack_limit';
    const BEST_SCORE_KEY = 'lr_time_attack_best';

    let timeAttackActive = false;
    let timeRemaining = 0;
    let timeAttackTimer = null;
    let correctCount = 0;
    let totalCount = 0;
    let timeLimit = 60; // デフォルト60秒

    function isEnabled() {
        return typeof window.getFeatureDefault === 'function'
            ? window.getFeatureDefault(STORAGE_KEY)
            : (localStorage.getItem(STORAGE_KEY) === 'true');
    }

    function getTimeLimit() {
        const saved = localStorage.getItem(TIME_LIMIT_KEY);
        return saved ? parseInt(saved, 10) : 60;
    }

    function setTimeLimit(seconds) {
        timeLimit = seconds;
        localStorage.setItem(TIME_LIMIT_KEY, seconds.toString());
    }

    function getBestScore() {
        const saved = localStorage.getItem(BEST_SCORE_KEY);
        return saved ? JSON.parse(saved) : { score: 0, timeLimit: 60 };
    }

    function saveBestScore(score, limit) {
        const best = getBestScore();
        if (score > best.score || (score === best.score && limit < best.timeLimit)) {
            localStorage.setItem(BEST_SCORE_KEY, JSON.stringify({ score, timeLimit: limit }));
        }
    }

    // タイムアタック開始
    function startTimeAttack() {
        if (timeAttackActive) return;

        timeAttackActive = true;
        timeRemaining = timeLimit;
        correctCount = 0;
        totalCount = 0;

        updateTimeAttackDisplay();
        injectTimeAttackUI();

        // タイマー開始
        timeAttackTimer = setInterval(() => {
            timeRemaining--;
            updateTimeAttackDisplay();

            if (timeRemaining <= 0) {
                endTimeAttack();
            }
        }, 1000);

        // 次の問題に進む
        if (typeof window.nextQuestion === 'function') {
            window.nextQuestion();
        }
    }

    // タイムアタック終了
    function endTimeAttack() {
        if (!timeAttackActive) return;

        timeAttackActive = false;
        if (timeAttackTimer) {
            clearInterval(timeAttackTimer);
            timeAttackTimer = null;
        }

        const accuracy = totalCount > 0 ? ((correctCount / totalCount) * 100).toFixed(1) : 0;
        saveBestScore(correctCount, timeLimit);
        const best = getBestScore();

        const modal = document.createElement('div');
        modal.id = 'time-attack-result-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); z-index: 10000; display: flex;
            align-items: center; justify-content: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--card); padding: 30px; border-radius: 16px;
            max-width: 400px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            text-align: center;
        `;

        content.innerHTML = `
            <h2 style="margin-top:0; color:var(--primary);">⏱️ タイムアタック結果</h2>
            <div style="font-size:3rem; font-weight:bold; color:var(--accent); margin:20px 0;">
                ${correctCount}問正解
            </div>
            <div style="margin:15px 0;">
                <p>総問題数: ${totalCount}問</p>
                <p>正答率: ${accuracy}%</p>
                <p>制限時間: ${timeLimit}秒</p>
            </div>
            <div style="margin:20px 0; padding:15px; background:rgba(59,130,246,0.1); border-radius:8px;">
                <p style="margin:0; font-size:0.9rem; color:var(--text-light);">最高記録</p>
                <p style="margin:5px 0 0 0; font-size:1.5rem; font-weight:bold; color:var(--primary);">
                    ${best.score}問 (${best.timeLimit}秒)
                </p>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn-main" onclick="window.startTimeAttackMode()" style="flex:1;">もう一度</button>
                <button class="btn-main" onclick="document.getElementById('time-attack-result-modal').remove(); window.endTimeAttackMode();" style="flex:1;">閉じる</button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.remove();
                endTimeAttackMode();
            }
        };

        removeTimeAttackUI();
    }

    // タイムアタックUIを追加
    function injectTimeAttackUI() {
        if (document.getElementById('time-attack-display')) return;

        const container = document.querySelector('.container');
        if (!container) return;

        const display = document.createElement('div');
        display.id = 'time-attack-display';
        display.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--card);
            padding: 15px 20px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
            border: 2px solid var(--primary);
        `;

        display.innerHTML = `
            <div style="font-size:0.9rem; color:var(--text-light); margin-bottom:5px;">⏱️ タイムアタック</div>
            <div id="time-attack-timer" style="font-size:1.5rem; font-weight:bold; color:var(--primary);">${timeRemaining}</div>
            <div style="font-size:0.85rem; color:var(--text-light); margin-top:5px;">
                正解: <span id="time-attack-correct">0</span>問 / 総数: <span id="time-attack-total">0</span>問
            </div>
        `;

        document.body.appendChild(display);
        updateTimeAttackDisplay();
    }

    function updateTimeAttackDisplay() {
        const timer = document.getElementById('time-attack-timer');
        const correct = document.getElementById('time-attack-correct');
        const total = document.getElementById('time-attack-total');

        if (timer) {
            timer.innerText = timeRemaining;
            timer.style.color = timeRemaining <= 10 ? '#ef4444' : 'var(--primary)';
        }
        if (correct) correct.innerText = correctCount;
        if (total) total.innerText = totalCount;
    }

    function removeTimeAttackUI() {
        const display = document.getElementById('time-attack-display');
        if (display) display.remove();
    }

    // 結果を記録
    function hookResultHandling() {
        const originalHandleResult = window.handleResult;
        if (originalHandleResult) {
            window.handleResult = function(result) {
                originalHandleResult(result);

                if (timeAttackActive && result) {
                    totalCount++;
                    if (result.isCorrect) {
                        correctCount++;
                    }
                    updateTimeAttackDisplay();

                    // 正解したら自動で次へ
                    if (result.isCorrect && timeRemaining > 0) {
                        setTimeout(() => {
                            if (timeAttackActive && typeof window.nextQuestion === 'function') {
                                window.nextQuestion();
                            }
                        }, 500);
                    }
                }
            };
        }
    }

    // グローバル関数として公開
    window.startTimeAttackMode = function() {
        if (!isEnabled()) {
            alert("タイムアタックモードが無効になっています。設定画面で有効にしてください。");
            return;
        }
        startTimeAttack();
    };

    window.endTimeAttackMode = function() {
        endTimeAttack();
    };

    // タイムアタックボタンを追加
    function injectTimeAttackButton() {
        if (!isEnabled()) return;

        const subHeader = document.querySelector('.sub-header');
        if (!subHeader || document.getElementById('time-attack-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'time-attack-btn';
        btn.innerText = '⏱️ タイムアタック';
        btn.style.cssText = `
            padding: 6px 12px;
            border-radius: 16px;
            border: 1px solid #f59e0b;
            background: #fef3c7;
            color: #d97706;
            font-weight: bold;
            font-size: 0.8rem;
            cursor: pointer;
            margin-left: 10px;
        `;
        btn.onclick = startTimeAttack;

        subHeader.appendChild(btn);
    }

    // 設定画面にトグルと時間設定を追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-time-attack-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-time-attack-wrapper';
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
        checkbox.id = 'toggle-time-attack';
        checkbox.style.marginRight = '10px';
        checkbox.checked = isEnabled();

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            if (checkbox.checked) {
                setTimeout(injectTimeAttackButton, 500);
            } else {
                const btn = document.getElementById('time-attack-btn');
                if (btn) btn.remove();
            }
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("⏱️ タイムアタックモードを有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "制限時間内に何問正解できるか挑戦できます。";
        wrapper.appendChild(desc);

        // 時間設定
        const timeWrapper = document.createElement('div');
        timeWrapper.style.marginTop = '10px';
        timeWrapper.style.marginLeft = '25px';

        const timeLabel = document.createElement('label');
        timeLabel.style.display = 'block';
        timeLabel.style.fontSize = '0.85rem';
        timeLabel.style.marginBottom = '5px';
        timeLabel.innerText = '制限時間 (秒):';

        const timeInput = document.createElement('input');
        timeInput.type = 'number';
        timeInput.min = '10';
        timeInput.max = '300';
        timeInput.value = getTimeLimit();
        timeInput.style.cssText = `
            width: 100px;
            padding: 5px;
            border-radius: 6px;
            border: 1px solid rgba(128,128,128,0.3);
            background: var(--bg);
            color: var(--text);
        `;
        timeInput.onchange = function() {
            const seconds = Math.max(10, Math.min(300, parseInt(this.value, 10) || 60));
            setTimeLimit(seconds);
        };

        timeLabel.appendChild(timeInput);
        timeWrapper.appendChild(timeLabel);
        wrapper.appendChild(timeWrapper);

        const rhythmSection = document.getElementById('setting-rhythm-wrapper');
        if (rhythmSection) {
            rhythmSection.parentNode.insertBefore(wrapper, rhythmSection.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    window.addEventListener('load', () => {
        timeLimit = getTimeLimit();
        hookResultHandling();
        setTimeout(() => {
            injectSettingsToggle();
            if (isEnabled()) {
                setTimeout(injectTimeAttackButton, 1500);
            }
        }, 1000);

        // 問題が変わった時にもボタンを再追加
        const originalNext = window.nextQuestion;
        if (originalNext) {
            window.nextQuestion = function() {
                originalNext();
                if (isEnabled()) {
                    setTimeout(injectTimeAttackButton, 500);
                }
            };
        }
    });
})();

