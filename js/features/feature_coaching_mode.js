/**
 * feature_coaching_mode.js
 * AIが発音の弱点を分析し、個別の練習プランを提案する機能
 */

(function() {
    const STORAGE_KEY = 'lr_coaching_mode_enabled';
    const COACHING_DATA_KEY = 'lr_coaching_data';

    let coachingData = {
        weakWords: [],
        practicePlan: [],
        lastAnalysis: null
    };

    function loadCoachingData() {
        try {
            const saved = localStorage.getItem(COACHING_DATA_KEY);
            if (saved) {
                coachingData = JSON.parse(saved);
            }
        } catch(e) {
            console.error("Failed to load coaching data:", e);
        }
    }

    function saveCoachingData() {
        try {
            localStorage.setItem(COACHING_DATA_KEY, JSON.stringify(coachingData));
        } catch(e) {
            console.error("Failed to save coaching data:", e);
        }
    }

    function isEnabled() {
        return typeof window.getFeatureDefault === 'function'
            ? window.getFeatureDefault(STORAGE_KEY)
            : (localStorage.getItem(STORAGE_KEY) === 'true');
    }

    // 弱点分析
    function analyzeWeaknesses() {
        if (!isEnabled()) return;

        // トレンドデータから弱点を分析
        const trendDataKey = 'lr_pronunciation_trend_data';
        const trendData = JSON.parse(localStorage.getItem(trendDataKey) || '{}');

        const wordScores = {};
        Object.keys(trendData).forEach(wordKey => {
            const scores = trendData[wordKey];
            if (scores && scores.length > 0) {
                const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
                wordScores[wordKey] = avgScore;
            }
        });

        // スコアが低い単語を抽出（70点以下）
        coachingData.weakWords = Object.entries(wordScores)
            .filter(([word, score]) => score < 70)
            .sort((a, b) => a[1] - b[1])
            .slice(0, 20)
            .map(([wordKey, score]) => {
                const [category, word] = wordKey.split(':');
                return { word, category, score: Math.round(score) };
            });

        // 練習プランを生成
        generatePracticePlan();

        coachingData.lastAnalysis = Date.now();
        saveCoachingData();
    }

    function generatePracticePlan() {
        coachingData.practicePlan = [];

        // LとRに分けて練習プランを作成
        const lWords = coachingData.weakWords.filter(w => w.word.toLowerCase().includes('l') && !w.word.toLowerCase().includes('r'));
        const rWords = coachingData.weakWords.filter(w => w.word.toLowerCase().includes('r') && !w.word.toLowerCase().includes('l'));
        const mixedWords = coachingData.weakWords.filter(w => 
            w.word.toLowerCase().includes('l') && w.word.toLowerCase().includes('r')
        );

        if (lWords.length > 0) {
            coachingData.practicePlan.push({
                phase: 1,
                title: 'L音の基礎練習',
                description: 'L音を含む単語を集中的に練習します',
                words: lWords.slice(0, 10),
                target: 'L音の発音を安定させる'
            });
        }

        if (rWords.length > 0) {
            coachingData.practicePlan.push({
                phase: 2,
                title: 'R音の基礎練習',
                description: 'R音を含む単語を集中的に練習します',
                words: rWords.slice(0, 10),
                target: 'R音の発音を安定させる'
            });
        }

        if (mixedWords.length > 0) {
            coachingData.practicePlan.push({
                phase: 3,
                title: 'L/R混在練習',
                description: 'LとRが混在する単語で実践練習します',
                words: mixedWords.slice(0, 10),
                target: 'LとRを正確に聞き分け、発音できるようにする'
            });
        }

        saveCoachingData();
    }

    // コーチングモーダル表示（グローバルに公開）
    window.showCoachingModal = function() {
        if (!isEnabled()) {
            alert("発音コーチングモードが無効になっています。設定画面で有効にしてください。");
            return;
        }

        analyzeWeaknesses();

        const modal = document.createElement('div');
        modal.id = 'coaching-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); z-index: 10000; display: flex;
            align-items: center; justify-content: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--card); padding: 20px; border-radius: 16px;
            max-width: 700px; max-height: 90vh; overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        `;

        let html = `
            <h2 style="margin-top:0; color:var(--primary);">🎓 発音コーチングモード</h2>
            <div style="margin-bottom:20px; padding:15px; background:rgba(59,130,246,0.1); border-radius:8px;">
                <h3 style="margin-top:0;">弱点分析結果</h3>
                <p>苦手な単語: <strong>${coachingData.weakWords.length}個</strong></p>
                ${coachingData.lastAnalysis ? 
                    `<p style="font-size:0.9rem; color:var(--text-light);">
                        最終分析: ${new Date(coachingData.lastAnalysis).toLocaleString('ja-JP')}
                    </p>` : ''}
            </div>
            <div id="practice-plan-list">
                ${renderPracticePlan()}
            </div>
            <button class="btn-main" onclick="document.getElementById('coaching-modal').remove();" style="width:100%; margin-top:15px;">閉じる</button>
        `;

        content.innerHTML = html;
        modal.appendChild(content);
        document.body.appendChild(modal);

        modal.onclick = function(e) {
            if (e.target === modal) modal.remove();
        };
    };

    function renderPracticePlan() {
        if (coachingData.practicePlan.length === 0) {
            return '<p style="text-align:center; color:var(--text-light);">練習プランがありません。まずは練習を始めて弱点を分析しましょう。</p>';
        }

        return coachingData.practicePlan.map(plan => {
            const wordsList = plan.words.map(w => w.word).join(', ');
            return `
                <div style="border:1px solid rgba(128,128,128,0.3); border-radius:8px; padding:15px; margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
                        <div>
                            <h3 style="margin:0; color:var(--accent);">Phase ${plan.phase}: ${plan.title}</h3>
                            <p style="margin:5px 0; color:var(--text-light);">${plan.description}</p>
                            <p style="margin:5px 0; font-size:0.9rem;"><strong>目標:</strong> ${plan.target}</p>
                        </div>
                        <button onclick="window.startCoachingPhase(${plan.phase})" 
                            style="padding:8px 15px; border-radius:5px; background:var(--primary); color:white; border:none; cursor:pointer; white-space:nowrap;">
                            開始
                        </button>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-light);">
                        <strong>練習単語:</strong> ${wordsList}
                    </div>
                </div>
            `;
        }).join('');
    }

    window.startCoachingPhase = function(phase) {
        const plan = coachingData.practicePlan.find(p => p.phase === phase);
        if (!plan) return;

        // カスタムセッションとして開始
        const wordList = plan.words.map(w => {
            return { l: { w: w.word, b: [] }, r: { w: w.word, b: [] } };
        });

        if (!window.db) window.db = {};
        window.db[`Coaching: ${plan.title}`] = wordList;

        if (typeof populateCategorySelect === 'function') populateCategorySelect();

        const select = document.getElementById('category-select');
        if (select) {
            select.value = `Coaching: ${plan.title}`;
            if (typeof changeCategory === 'function') changeCategory();
        }

        if (typeof setMode === 'function') setMode('speaking');

        document.getElementById('coaching-modal').remove();
    };

    // 設定画面にトグルを追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-coaching-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-coaching-wrapper';
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
        checkbox.id = 'toggle-coaching';
        checkbox.style.marginRight = '10px';
        checkbox.checked = isEnabled();

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            const btn = document.getElementById('coaching-btn');
            if (btn) btn.style.display = checkbox.checked ? 'inline-block' : 'none';
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("🎓 発音コーチングモードを有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "AIが発音の弱点を分析し、個別の練習プランを提案します。";
        wrapper.appendChild(desc);

        const customSessionSection = document.getElementById('setting-custom-session-wrapper');
        if (customSessionSection) {
            customSessionSection.parentNode.insertBefore(wrapper, customSessionSection.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    // ボタンを追加（「その他」メニューに含まれるため、アイコンは追加しない）
    function injectButton() {
        // util_header_menu.jsが自動的に「その他」メニューに追加するため、ここでは何もしない
    }

    window.addEventListener('load', () => {
        loadCoachingData();
        setTimeout(() => {
            injectSettingsToggle();
            injectButton();
        }, 1000);
    });
})();

