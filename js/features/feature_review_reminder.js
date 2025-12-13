/**
 * feature_review_reminder.js
 * 復習リマインダー機能
 * 間違えた単語を一定時間後に自動で再出題
 */

(function() {
    const STORAGE_KEY = 'lr_review_reminder_enabled';
    const REMINDER_DATA_KEY = 'lr_review_reminder_data';

    let reminderData = {
        wrongWords: [],
        reviewInterval: 24 * 60 * 60 * 1000 // 24時間（ミリ秒）
    };

    function loadReminderData() {
        try {
            const saved = localStorage.getItem(REMINDER_DATA_KEY);
            if (saved) {
                reminderData = JSON.parse(saved);
            }
        } catch(e) {
            console.error("Failed to load reminder data:", e);
        }
    }

    function saveReminderData() {
        try {
            localStorage.setItem(REMINDER_DATA_KEY, JSON.stringify(reminderData));
        } catch(e) {
            console.error("Failed to save reminder data:", e);
        }
    }

    function isEnabled() {
        return typeof window.getFeatureDefault === 'function'
            ? window.getFeatureDefault(STORAGE_KEY)
            : (localStorage.getItem(STORAGE_KEY) === 'true');
    }

    // 間違えた単語を記録
    function recordWrongWord(word, category) {
        if (!isEnabled()) return;

        const wordKey = `${category}:${word}`;
        const existing = reminderData.wrongWords.find(w => w.key === wordKey);

        if (existing) {
            existing.lastWrong = Date.now();
            existing.count++;
        } else {
            reminderData.wrongWords.push({
                key: wordKey,
                word: word,
                category: category,
                lastWrong: Date.now(),
                nextReview: Date.now() + reminderData.reviewInterval,
                count: 1
            });
        }

        saveReminderData();
    }

    // 復習が必要な単語を取得
    function getWordsToReview() {
        if (!isEnabled()) return [];

        const now = Date.now();
        return reminderData.wrongWords.filter(w => w.nextReview <= now);
    }

    // 既存のロジックをフック
    function hookCoreLogic() {
        const originalCheckPronunciation = window.checkPronunciation;
        if (originalCheckPronunciation) {
            window.checkPronunciation = function(result) {
                originalCheckPronunciation(result);
                if (result && !result.correct && window.targetObj && window.targetObj.w && window.currentCategory) {
                    recordWrongWord(window.targetObj.w, window.currentCategory);
                }
            };
        }

        const originalCheckListening = window.checkListening;
        if (originalCheckListening) {
            window.checkListening = function(userChoseL) {
                const isCorrect = originalCheckListening(userChoseL);
                if (!isCorrect && window.targetObj && window.targetObj.w && window.currentCategory) {
                    recordWrongWord(window.targetObj.w, window.currentCategory);
                }
                return isCorrect;
            };
        }
    }

    // 復習リマインダー表示
    function showReviewReminder() {
        const wordsToReview = getWordsToReview();
        if (wordsToReview.length === 0) return;

        const modal = document.createElement('div');
        modal.id = 'review-reminder-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); z-index: 10000; display: flex;
            align-items: center; justify-content: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--card); padding: 20px; border-radius: 16px;
            max-width: 500px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        `;

        const wordsList = wordsToReview.slice(0, 10).map(w => w.word).join(', ');

        content.innerHTML = `
            <h2 style="margin-top:0; color:var(--primary);">🔔 復習リマインダー</h2>
            <p>復習が必要な単語が <strong>${wordsToReview.length}個</strong> あります。</p>
            <div style="margin:15px 0; padding:10px; background:rgba(59,130,246,0.1); border-radius:8px;">
                <strong>復習単語:</strong> ${wordsList}${wordsToReview.length > 10 ? '...' : ''}
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn-main" onclick="window.startReviewSession()" style="flex:1;">復習を開始</button>
                <button class="btn-main" onclick="document.getElementById('review-reminder-modal').remove();" style="flex:1;">後で</button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        modal.onclick = function(e) {
            if (e.target === modal) modal.remove();
        };
    }

    window.startReviewSession = function() {
        const wordsToReview = getWordsToReview();
        if (wordsToReview.length === 0) return;

        // カスタムセッションとして開始
        const wordList = wordsToReview.map(w => {
            return { l: { w: w.word, b: [] }, r: { w: w.word, b: [] } };
        });

        if (!window.db) window.db = {};
        window.db['復習セッション'] = wordList;

        if (typeof populateCategorySelect === 'function') populateCategorySelect();

        const select = document.getElementById('category-select');
        if (select) {
            select.value = '復習セッション';
            if (typeof changeCategory === 'function') changeCategory();
        }

        if (typeof setMode === 'function') setMode('speaking');

        document.getElementById('review-reminder-modal').remove();
    };

    // 定期的にリマインダーをチェック
    function checkReminder() {
        if (!isEnabled()) return;

        const wordsToReview = getWordsToReview();
        if (wordsToReview.length > 0 && !document.getElementById('review-reminder-modal')) {
            // ページがアクティブな時のみ表示
            if (!document.hidden) {
                showReviewReminder();
            }
        }
    }

    // 設定画面にトグルを追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-reminder-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-reminder-wrapper';
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
        checkbox.id = 'toggle-reminder';
        checkbox.style.marginRight = '10px';
        checkbox.checked = isEnabled();

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("🔔 復習リマインダーを有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "間違えた単語を一定時間後に自動で再出題します。";
        wrapper.appendChild(desc);

        const detailedStatsSection = document.getElementById('setting-detailed-stats-wrapper');
        if (detailedStatsSection) {
            detailedStatsSection.parentNode.insertBefore(wrapper, detailedStatsSection.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    window.addEventListener('load', () => {
        loadReminderData();
        hookCoreLogic();
        setTimeout(() => {
            injectSettingsToggle();
            // 5分ごとにリマインダーをチェック
            setInterval(checkReminder, 5 * 60 * 1000);
            // ページが表示された時にもチェック
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    checkReminder();
                }
            });
        }, 1000);
    });
})();

