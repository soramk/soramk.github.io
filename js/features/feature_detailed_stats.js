/**
 * feature_detailed_stats.js
 * 詳細統計ダッシュボード機能
 * 総練習時間、総発音回数、平均スコアなどを表示
 */

(function() {
    const STORAGE_KEY = 'lr_detailed_stats_enabled';
    const STATS_DATA_KEY = 'lr_detailed_stats_data';

    let statsData = {
        totalPracticeTime: 0, // ミリ秒
        totalPronunciations: 0,
        totalCorrect: 0,
        totalWrong: 0,
        averageScore: 0,
        scores: [],
        practiceSessions: [],
        startTime: null
    };

    function loadStatsData() {
        try {
            const saved = localStorage.getItem(STATS_DATA_KEY);
            if (saved) {
                statsData = JSON.parse(saved);
            }
        } catch(e) {
            console.error("Failed to load stats data:", e);
        }
    }

    function saveStatsData() {
        try {
            localStorage.setItem(STATS_DATA_KEY, JSON.stringify(statsData));
        } catch(e) {
            console.error("Failed to save stats data:", e);
        }
    }

    function isEnabled() {
        return typeof window.getFeatureDefault === 'function'
            ? window.getFeatureDefault(STORAGE_KEY)
            : (localStorage.getItem(STORAGE_KEY) === 'true');
    }

    // 練習時間を記録
    function recordPracticeTime() {
        if (!isEnabled()) return;

        if (statsData.startTime) {
            const elapsed = Date.now() - statsData.startTime;
            statsData.totalPracticeTime += elapsed;
            statsData.startTime = Date.now();
        } else {
            statsData.startTime = Date.now();
        }
        saveStatsData();
    }

    // 発音結果を記録
    function recordPronunciation(isCorrect, score) {
        if (!isEnabled()) return;

        statsData.totalPronunciations++;
        if (isCorrect) {
            statsData.totalCorrect++;
        } else {
            statsData.totalWrong++;
        }

        if (typeof score === 'number') {
            statsData.scores.push(score);
            // 最新1000件のみ保持
            if (statsData.scores.length > 1000) {
                statsData.scores = statsData.scores.slice(-1000);
            }
            // 平均スコアを更新
            const sum = statsData.scores.reduce((a, b) => a + b, 0);
            statsData.averageScore = sum / statsData.scores.length;
        }

        saveStatsData();
    }

    // 既存のロジックをフック
    function hookCoreLogic() {
        // 録音開始時にタイマー開始
        const originalToggleRecord = window.toggleRecord;
        if (originalToggleRecord) {
            window.toggleRecord = async function() {
                const wasRecording = window.isRecording;
                const result = await originalToggleRecord.apply(this, arguments);
                // 録音が開始された時（以前は録音中でなかったが、今は録音中）
                if (!wasRecording && window.isRecording) {
                    recordPracticeTime();
                }
                return result;
            };
        }

        // 結果記録
        const originalCheckPronunciation = window.checkPronunciation;
        if (originalCheckPronunciation) {
            window.checkPronunciation = function(result) {
                originalCheckPronunciation(result);
                if (result) {
                    recordPronunciation(result.correct || false, result.score || 0);
                }
            };
        }

        const originalCheckListening = window.checkListening;
        if (originalCheckListening) {
            window.checkListening = function(userChoseL) {
                const isCorrect = originalCheckListening(userChoseL);
                recordPronunciation(isCorrect, isCorrect ? 100 : 0);
                return isCorrect;
            };
        }
    }

    // 統計ダッシュボード表示
    function showStatsDashboard() {
        if (!isEnabled()) {
            alert("詳細統計ダッシュボード機能が無効になっています。設定画面で有効にしてください。");
            return;
        }

        // 現在のセッション時間を更新
        if (statsData.startTime) {
            recordPracticeTime();
        }

        const modal = document.createElement('div');
        modal.id = 'detailed-stats-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); z-index: 10000; display: flex;
            align-items: center; justify-content: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--card); padding: 20px; border-radius: 16px;
            max-width: 800px; max-height: 90vh; overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        `;

        const hours = Math.floor(statsData.totalPracticeTime / 3600000);
        const minutes = Math.floor((statsData.totalPracticeTime % 3600000) / 60000);
        const accuracy = statsData.totalPronunciations > 0 
            ? ((statsData.totalCorrect / statsData.totalPronunciations) * 100).toFixed(1)
            : 0;

        let html = `
            <h2 style="margin-top:0; color:var(--primary);">📋 詳細統計ダッシュボード</h2>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:15px; margin:20px 0;">
                <div style="background:rgba(59,130,246,0.1); padding:15px; border-radius:8px; text-align:center;">
                    <div style="font-size:2rem; font-weight:bold; color:var(--primary);">${hours}h ${minutes}m</div>
                    <div style="font-size:0.9rem; color:var(--text-light);">総練習時間</div>
                </div>
                <div style="background:rgba(34,197,94,0.1); padding:15px; border-radius:8px; text-align:center;">
                    <div style="font-size:2rem; font-weight:bold; color:#22c55e;">${statsData.totalPronunciations}</div>
                    <div style="font-size:0.9rem; color:var(--text-light);">総発音回数</div>
                </div>
                <div style="background:rgba(34,197,94,0.1); padding:15px; border-radius:8px; text-align:center;">
                    <div style="font-size:2rem; font-weight:bold; color:#22c55e;">${statsData.totalCorrect}</div>
                    <div style="font-size:0.9rem; color:var(--text-light);">正解数</div>
                </div>
                <div style="background:rgba(239,68,68,0.1); padding:15px; border-radius:8px; text-align:center;">
                    <div style="font-size:2rem; font-weight:bold; color:#ef4444;">${statsData.totalWrong}</div>
                    <div style="font-size:0.9rem; color:var(--text-light);">不正解数</div>
                </div>
                <div style="background:rgba(245,158,11,0.1); padding:15px; border-radius:8px; text-align:center;">
                    <div style="font-size:2rem; font-weight:bold; color:#f59e0b;">${accuracy}%</div>
                    <div style="font-size:0.9rem; color:var(--text-light);">正答率</div>
                </div>
                <div style="background:rgba(139,92,246,0.1); padding:15px; border-radius:8px; text-align:center;">
                    <div style="font-size:2rem; font-weight:bold; color:#8b5cf6;">${statsData.averageScore.toFixed(1)}</div>
                    <div style="font-size:0.9rem; color:var(--text-light);">平均スコア</div>
                </div>
            </div>
            ${renderScoreDistribution()}
            <button class="btn-main" onclick="document.getElementById('detailed-stats-modal').remove();" style="width:100%; margin-top:15px;">閉じる</button>
        `;

        content.innerHTML = html;
        modal.appendChild(content);
        document.body.appendChild(modal);

        modal.onclick = function(e) {
            if (e.target === modal) modal.remove();
        };
    }

    function renderScoreDistribution() {
        if (statsData.scores.length === 0) {
            return '<p style="text-align:center; color:var(--text-light);">スコアデータがありません</p>';
        }

        const ranges = {
            '90-100': 0,
            '80-89': 0,
            '70-79': 0,
            '60-69': 0,
            '0-59': 0
        };

        statsData.scores.forEach(score => {
            if (score >= 90) ranges['90-100']++;
            else if (score >= 80) ranges['80-89']++;
            else if (score >= 70) ranges['70-79']++;
            else if (score >= 60) ranges['60-69']++;
            else ranges['0-59']++;
        });

        return `
            <div style="margin-top:20px;">
                <h3 style="color:var(--accent);">スコア分布</h3>
                <canvas id="score-distribution-chart" style="max-height:300px;"></canvas>
            </div>
            <script>
                if (typeof Chart !== 'undefined') {
                    new Chart(document.getElementById('score-distribution-chart'), {
                        type: 'bar',
                        data: {
                            labels: ['90-100点', '80-89点', '70-79点', '60-69点', '0-59点'],
                            datasets: [{
                                label: '回数',
                                data: [${ranges['90-100']}, ${ranges['80-89']}, ${ranges['70-79']}, ${ranges['60-69']}, ${ranges['0-59']}],
                                backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#dc2626']
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            scales: {
                                y: {
                                    beginAtZero: true
                                }
                            }
                        }
                    });
                }
            </script>
        `;
    }

    // 設定画面にトグルを追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-detailed-stats-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-detailed-stats-wrapper';
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
        checkbox.id = 'toggle-detailed-stats';
        checkbox.style.marginRight = '10px';
        checkbox.checked = isEnabled();

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            const btn = document.getElementById('detailed-stats-btn');
            if (btn) btn.style.display = checkbox.checked ? 'inline-block' : 'none';
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("📋 詳細統計ダッシュボードを有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "総練習時間、総発音回数、平均スコアなどの詳細な統計を表示します。";
        wrapper.appendChild(desc);

        const coachingSection = document.getElementById('setting-coaching-wrapper');
        if (coachingSection) {
            coachingSection.parentNode.insertBefore(wrapper, coachingSection.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    // ボタンを追加
    function injectButton() {
        const tools = document.querySelector('.header-tools');
        if (!tools || document.getElementById('detailed-stats-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'detailed-stats-btn';
        btn.className = 'btn-icon';
        btn.innerHTML = '📋';
        btn.title = "詳細統計";
        btn.onclick = showStatsDashboard;
        btn.style.display = isEnabled() ? 'inline-block' : 'none';

        tools.appendChild(btn);
    }

    window.addEventListener('load', () => {
        loadStatsData();
        hookCoreLogic();
        setTimeout(() => {
            injectSettingsToggle();
            injectButton();
        }, 1000);
    });
})();

