/**
 * 16_rank_system.js (v4: レイアウト修正版)
 * 累計正解数(XP)に基づいて称号を与えるRPG風ランクシステム。
 * iPhoneでの表示崩れを防ぐため、ランクバーをヘッダーの下に独立して配置。
 * デフォルトはOFF。
 */

(function() {
    const STORAGE_KEY = 'lr_rank_enabled';
    const XP_KEY = 'lr_user_xp';
    
    const RANKS = [
        { xp: 0,   title: "🌱 Beginner (初心者)", color: "#94a3b8" },
        { xp: 100,  title: "🥚 Novice (見習い)",   color: "#60a5fa" },
        { xp: 300,  title: "🛡️ Soldier (戦士)",    color: "#34d399" },
        { xp: 1000,  title: "⚔️ Knight (騎士)",     color: "#f59e0b" },
        { xp: 5000, title: "🧙‍♂️ Wizard (魔導士)",   color: "#a855f7" },
        { xp: 10000, title: "👑 Master (達人)",     color: "#f43f5e" },
        { xp: 30000, title: "🐲 Legend (伝説)",     color: "#ec4899" },
        { xp: 100000, title: "🌌 God (発音神)",      color: "#fbbf24" }
    ];

    let currentXP = 0;

    window.addEventListener('load', () => {
        loadXP();
        setTimeout(() => {
            injectSettingsToggle();
            applyState();
            hookXPLogic();
        }, 600);
    });

    function loadXP() {
        const saved = localStorage.getItem(XP_KEY);
        currentXP = saved ? parseInt(saved) : 0;
    }

    function saveXP() {
        localStorage.setItem(XP_KEY, currentXP);
    }

    function getRank(xp) {
        return RANKS.slice().reverse().find(r => xp >= r.xp) || RANKS[0];
    }

    function getNextRank(xp) {
        return RANKS.find(r => r.xp > xp);
    }

    // 1. 設定画面
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-rank-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-rank-wrapper';
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
        checkbox.id = 'toggle-rank';
        checkbox.style.marginRight = '10px';
        
        // デフォルトOFF
        const saved = localStorage.getItem(STORAGE_KEY);
        checkbox.checked = saved === null ? false : (saved === 'true');

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            applyState();
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("👑 ランクシステム (RPG風) を有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "正解数に応じて称号が上がるランクバーを表示します。";
        wrapper.appendChild(desc);

        const celebSetting = document.getElementById('setting-celebration-wrapper');
        if(celebSetting) {
            celebSetting.parentNode.insertBefore(wrapper, celebSetting.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    // 2. 表示切り替え
    function applyState() {
        const isEnabled = localStorage.getItem(STORAGE_KEY);
        const shouldShow = isEnabled === null ? false : (isEnabled === 'true'); // デフォルトOFF

        const container = document.getElementById('rank-container');
        
        if (shouldShow) {
            if (!container) injectRankDisplay();
            if (container) container.style.display = 'block';
        } else {
            if (container) container.style.display = 'none';
        }
    }

    // 3. ランクバーの注入 (★レイアウト修正箇所)
    function injectRankDisplay() {
        if(document.getElementById('rank-container')) return;

        const header = document.querySelector('.header-bar');
        if (!header) return;

        const rankContainer = document.createElement('div');
        rankContainer.id = 'rank-container';
        // スタイル調整: 独立した行として表示
        rankContainer.style.width = '100%';
        rankContainer.style.marginTop = '5px';
        rankContainer.style.marginBottom = '15px'; // 下の要素との間隔
        rankContainer.style.cursor = 'pointer';
        rankContainer.onclick = showRankDetails;

        const rankData = getRank(currentXP);
        
        rankContainer.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-end; font-size:0.8rem; margin-bottom:4px;">
                <span id="rank-title" style="font-weight:bold; color:${rankData.color};">${rankData.title}</span>
                <span id="rank-xp" style="opacity:0.6;">XP: ${currentXP}</span>
            </div>
            <div style="background:rgba(128,128,128,0.2); height:8px; border-radius:4px; overflow:hidden;">
                <div id="rank-progress" style="background:${rankData.color}; height:100%; width:0%; transition: width 0.5s;"></div>
            </div>
        `;

        // ★修正: header-barの中ではなく、「header-barの直後（sub-headerの前）」に挿入
        header.parentNode.insertBefore(rankContainer, header.nextSibling);
        
        updateProgressUI();
    }

    function updateProgressUI() {
        const rank = getRank(currentXP);
        const next = getNextRank(currentXP);
        const titleEl = document.getElementById('rank-title');
        const xpEl = document.getElementById('rank-xp');
        const barEl = document.getElementById('rank-progress');

        if(titleEl) {
            titleEl.innerText = rank.title;
            titleEl.style.color = rank.color;
        }
        if(xpEl) xpEl.innerText = `XP: ${currentXP}`;
        if(barEl) {
            barEl.style.background = rank.color;
            if (next) {
                const prevRankXP = rank.xp;
                const progress = (currentXP - prevRankXP) / (next.xp - prevRankXP) * 100;
                barEl.style.width = `${progress}%`;
            } else {
                barEl.style.width = '100%';
            }
        }
    }

    function hookXPLogic() {
        const originalUpdateStats = window.updateWordStats;
        window.updateWordStats = function(isCorrect) {
            if(originalUpdateStats) originalUpdateStats(isCorrect);
            
            if(isCorrect) {
                const oldRank = getRank(currentXP);
                currentXP += 1; 
                saveXP();
                
                const newRank = getRank(currentXP);
                
                const isEnabled = localStorage.getItem(STORAGE_KEY);
                const shouldShow = isEnabled === null ? false : (isEnabled === 'true');

                if (shouldShow && newRank.xp > oldRank.xp) {
                    showLevelUp(newRank);
                }
                
                if (shouldShow) updateProgressUI();
            }
        };
    }

    function showLevelUp(rank) {
        if(window.confetti) {
            window.confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
        }
        alert(`🆙 LEVEL UP!\n\nおめでとうございます！\nあなたは「${rank.title}」に昇格しました！`);
    }

    function showRankDetails() {
        const next = getNextRank(currentXP);
        let msg = `現在のXP: ${currentXP}\n`;
        if (next) {
            msg += `次のランク「${next.title}」まで: あと ${next.xp - currentXP} XP`;
        } else {
            msg += "あなたは最高ランクに到達しています！";
        }
        alert(msg);
    }
})();