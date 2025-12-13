/**
 * feature_pronunciation_trend.js
 * 各単語の発音スコアの推移をグラフ化する機能
 * 苦手単語の特定と改善度の可視化
 */

(function() {
    const STORAGE_KEY = 'lr_pronunciation_trend_enabled';
    const TREND_DATA_KEY = 'lr_pronunciation_trend_data';

    let trendData = {};

    function loadTrendData() {
        try {
            const saved = localStorage.getItem(TREND_DATA_KEY);
            if (saved) {
                trendData = JSON.parse(saved);
            }
        } catch(e) {
            console.error("Failed to load trend data:", e);
        }
    }

    function saveTrendData() {
        try {
            localStorage.setItem(TREND_DATA_KEY, JSON.stringify(trendData));
        } catch(e) {
            console.error("Failed to save trend data:", e);
        }
    }

    // スコアを記録
    function recordScore(word, score, category) {
        if (!isEnabled()) return;

        const wordKey = `${category}:${word}`;
        if (!trendData[wordKey]) {
            trendData[wordKey] = [];
        }

        trendData[wordKey].push({
            timestamp: Date.now(),
            score: score,
            date: new Date().toISOString().split('T')[0]
        });

        // 最新100件のみ保持
        if (trendData[wordKey].length > 100) {
            trendData[wordKey] = trendData[wordKey].slice(-100);
        }

        saveTrendData();
    }

    // 既存のスコアリング機能をフック
    function hookScoring() {
        // feature_scoring.jsがcheckPronunciationをフックしているので、それより後に実行されるようにする
        // または、handleResultをフックする
        const originalHandleResult = window.handleResult;
        if (originalHandleResult) {
            window.handleResult = function(result) {
                originalHandleResult(result);
                
                // resultにscoreプロパティがある場合（feature_scoring.jsが追加したもの）
                if (result && typeof result.score === 'number' && window.targetObj && window.targetObj.w && window.currentCategory) {
                    recordScore(window.targetObj.w, result.score, window.currentCategory);
                }
            };
        }
    }

    function isEnabled() {
        return typeof window.getFeatureDefault === 'function'
            ? window.getFeatureDefault(STORAGE_KEY)
            : (localStorage.getItem(STORAGE_KEY) === 'true');
    }

    // トレンド表示モーダル
    function showTrendModal() {
        if (!isEnabled()) {
            alert("発音トレンド分析機能が無効になっています。設定画面で有効にしてください。");
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'trend-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); z-index: 10000; display: flex;
            align-items: center; justify-content: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--card); padding: 20px; border-radius: 16px;
            max-width: 90%; max-height: 90vh; overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        `;

        let html = `
            <h2 style="margin-top:0; color:var(--primary);">📈 発音トレンド分析</h2>
            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px;">単語を選択:</label>
                <select id="trend-word-select" style="width:100%; padding:8px; border-radius:8px; background:var(--bg); color:var(--text); border:1px solid rgba(128,128,128,0.3);">
                    <option value="">-- 単語を選択 --</option>
                </select>
            </div>
            <div id="trend-chart-container" style="min-height:300px; margin:20px 0;">
                <p style="text-align:center; color:var(--text-light);">単語を選択するとグラフが表示されます</p>
            </div>
            <button class="btn-main" onclick="document.getElementById('trend-modal').remove();" style="width:100%;">閉じる</button>
        `;

        content.innerHTML = html;
        modal.appendChild(content);
        document.body.appendChild(modal);

        // 単語リストを生成
        const select = document.getElementById('trend-word-select');
        const words = Object.keys(trendData).sort();
        words.forEach(wordKey => {
            const option = document.createElement('option');
            option.value = wordKey;
            const [category, word] = wordKey.split(':');
            option.textContent = `${word} (${category})`;
            select.appendChild(option);
        });

        select.onchange = function() {
            if (!this.value) return;
            renderTrendChart(this.value);
        };

        modal.onclick = function(e) {
            if (e.target === modal) modal.remove();
        };
    }

    function renderTrendChart(wordKey) {
        const container = document.getElementById('trend-chart-container');
        if (!container || !trendData[wordKey] || trendData[wordKey].length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-light);">データがありません</p>';
            return;
        }

        const data = trendData[wordKey];
        const dates = [...new Set(data.map(d => d.date))].sort();
        const scoresByDate = {};
        
        dates.forEach(date => {
            const dayData = data.filter(d => d.date === date);
            const avgScore = dayData.reduce((sum, d) => sum + d.score, 0) / dayData.length;
            scoresByDate[date] = avgScore;
        });

        const canvas = document.createElement('canvas');
        canvas.id = 'trend-chart';
        container.innerHTML = '';
        container.appendChild(canvas);

        if (typeof Chart !== 'undefined') {
            new Chart(canvas, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: '平均スコア',
                        data: dates.map(d => scoresByDate[d]),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '点';
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return 'スコア: ' + context.parsed.y.toFixed(1) + '点';
                                }
                            }
                        }
                    }
                }
            });
        } else {
            container.innerHTML = '<p style="color:var(--text-light);">Chart.jsが読み込まれていません</p>';
        }
    }

    // 設定画面にトグルを追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-trend-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-trend-wrapper';
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
        checkbox.id = 'toggle-trend';
        checkbox.style.marginRight = '10px';
        checkbox.checked = isEnabled();

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("📈 発音トレンド分析を有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "各単語の発音スコアの推移をグラフで確認できます。";
        wrapper.appendChild(desc);

        // 学習支援系カテゴリに追加
        const katakanaSection = document.getElementById('setting-katakana-wrapper');
        if (katakanaSection) {
            katakanaSection.parentNode.insertBefore(wrapper, katakanaSection.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    // ボタンを追加
    function injectButton() {
        const tools = document.querySelector('.header-tools');
        if (!tools || document.getElementById('trend-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'trend-btn';
        btn.className = 'btn-icon';
        btn.innerHTML = '📈';
        btn.title = "発音トレンド分析";
        btn.onclick = showTrendModal;
        btn.style.display = isEnabled() ? 'inline-block' : 'none';

        tools.appendChild(btn);
    }

    window.addEventListener('load', () => {
        loadTrendData();
        hookScoring();
        setTimeout(() => {
            injectSettingsToggle();
            injectButton();
        }, 1000);
    });

    // 設定変更時にボタン表示を更新
    const originalSaveSettings = window.saveSettings;
    if (originalSaveSettings) {
        window.saveSettings = function() {
            originalSaveSettings();
            const btn = document.getElementById('trend-btn');
            if (btn) btn.style.display = isEnabled() ? 'inline-block' : 'none';
        };
    }
})();

