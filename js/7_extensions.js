/**
 * 7_extensions.js
 * 既存のコードを一切変更せずに、機能を追加するためのプラグインファイル。
 * 機能: 学習記録の自動保存とグラフ化
 */

const AppExtension = {
    // 記録用キー
    STORAGE_KEY: 'lr_history_log_v1',
    
    // データ保持用
    statsData: {},

    // 初期化処理
    init: async function() {
        console.log("Extension: Initializing...");
        this.loadData();
        this.injectButton();
        this.injectModal();
        this.hookCoreLogic();
    },

    // 1. 過去のデータをロード
    loadData: function() {
        const json = localStorage.getItem(this.STORAGE_KEY);
        if (json) {
            this.statsData = JSON.parse(json);
        }
    },

    // 2. データを保存
    saveData: function() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.statsData));
    },

    // 3. 既存のロジックをフック（横取り）して記録処理を追加
    hookCoreLogic: function() {
        // 元の関数を退避
        const originalUpdateStats = window.updateWordStats;

        // 新しい関数で上書き
        window.updateWordStats = function(isCorrect) {
            // 1. 元の処理を必ず実行（これで既存機能は壊れない）
            if (originalUpdateStats) originalUpdateStats(isCorrect);

            // 2. 拡張機能：今日の日付で記録をつける
            AppExtension.logDailyStats(isCorrect);
        };
        console.log("Extension: Logic hooked successfully.");
    },

    // 今日の成績を記録
    logDailyStats: function(isCorrect) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式
        
        if (!this.statsData[today]) {
            this.statsData[today] = { correct: 0, wrong: 0, total: 0 };
        }

        this.statsData[today].total++;
        if (isCorrect) {
            this.statsData[today].correct++;
        } else {
            this.statsData[today].wrong++;
        }

        this.saveData();
    },

    // 4. UI: グラフボタンを追加
    injectButton: function() {
        // ヘッダーのツールバーを探す
        const tools = document.querySelector('.header-tools');
        if (!tools) return;

        const btn = document.createElement('button');
        btn.className = 'btn-icon';
        btn.innerHTML = '📊';
        btn.title = "学習記録";
        btn.onclick = () => this.openStatsModal();
        
        // 設定ボタン(⚙️)の前に挿入、あるいは最後に追加
        tools.insertBefore(btn, tools.firstChild);
    },

    // 5. UI: モーダルHTMLを追加
    injectModal: function() {
        const modalHtml = `
        <div id="ext-stats-modal" class="modal">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>📊 Study Progress</h3>
                    <button class="btn-icon" onclick="document.getElementById('ext-stats-modal').style.display='none'">×</button>
                </div>
                <div style="padding: 10px;">
                    <canvas id="studyChart" width="400" height="250"></canvas>
                </div>
                <div style="text-align: center; margin-top: 10px; font-size: 0.9rem; color: var(--text); opacity: 0.8;">
                    <span id="total-days">0</span> Days Active | Total <span id="total-count">0</span> Words
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    // 6. グラフ表示処理
    openStatsModal: function() {
        const modal = document.getElementById('ext-stats-modal');
        if(modal) modal.style.display = 'flex';
        
        this.renderChart();
    },

    renderChart: function() {
        const ctx = document.getElementById('studyChart');
        if (!ctx) return;
        
        // Chart.jsが読み込まれているか確認
        if (typeof Chart === 'undefined') {
            alert("Chart.jsが読み込まれていません。index.htmlを確認してください。");
            return;
        }

        // データを配列に変換（過去7日分などを表示するのが一般的だが、今回は全データ）
        const labels = Object.keys(this.statsData).sort();
        const dataCorrect = labels.map(date => this.statsData[date].correct);
        const dataWrong = labels.map(date => this.statsData[date].wrong);
        
        // 集計表示
        let grandTotal = 0;
        labels.forEach(d => grandTotal += this.statsData[d].total);
        document.getElementById('total-days').innerText = labels.length;
        document.getElementById('total-count').innerText = grandTotal;

        // 既存のチャートがあれば破棄（再描画のため）
        if (window.myStudyChart) window.myStudyChart.destroy();

        // グラフ描画設定
        window.myStudyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '正解',
                        data: dataCorrect,
                        backgroundColor: '#22c55e',
                    },
                    {
                        label: '不正解',
                        data: dataWrong,
                        backgroundColor: '#ef4444',
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true }
                },
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
};

// アプリ読み込み後に拡張機能を起動
window.addEventListener('load', () => {
    // DOM生成を少し待ってから実行
    setTimeout(() => AppExtension.init(), 500);
});