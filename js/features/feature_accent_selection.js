/**
 * feature_accent_selection.js
 * アクセント選択機能
 * アメリカ英語 / イギリス英語 / オーストラリア英語など
 */

(function() {
    const STORAGE_KEY = 'lr_accent_selection_enabled';
    const ACCENT_KEY = 'lr_selected_accent';

    const ACCENTS = {
        'en-US': { name: 'アメリカ英語', code: 'en-US', flag: '🇺🇸' },
        'en-GB': { name: 'イギリス英語', code: 'en-GB', flag: '🇬🇧' },
        'en-AU': { name: 'オーストラリア英語', code: 'en-AU', flag: '🇦🇺' },
        'en-CA': { name: 'カナダ英語', code: 'en-CA', flag: '🇨🇦' }
    };

    function isEnabled() {
        return typeof window.getFeatureDefault === 'function'
            ? window.getFeatureDefault(STORAGE_KEY)
            : (localStorage.getItem(STORAGE_KEY) === 'true');
    }

    function getSelectedAccent() {
        const saved = localStorage.getItem(ACCENT_KEY);
        return saved && ACCENTS[saved] ? saved : 'en-US';
    }

    function setSelectedAccent(accentCode) {
        localStorage.setItem(ACCENT_KEY, accentCode);
    }

    // 音声合成の言語を変更
    function hookSpeakModel() {
        const originalSpeakModel = window.speakModel;
        if (originalSpeakModel) {
            window.speakModel = function() {
                if (!window.targetObj || !window.targetObj.w) return;

                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const u = new SpeechSynthesisUtterance(window.targetObj.w);
                    u.lang = getSelectedAccent();
                    u.rate = window.speechRate || 0.8;
                    window.speechSynthesis.speak(u);
                }
            };
        }
    }

    // アクセント選択UIを追加
    function injectAccentSelector() {
        if (!isEnabled()) return;

        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('accent-selector-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'accent-selector-wrapper';
        wrapper.style.marginBottom = '15px';
        wrapper.style.padding = '10px';
        wrapper.style.background = 'rgba(128,128,128,0.05)';
        wrapper.style.borderRadius = '8px';

        const label = document.createElement('label');
        label.style.display = 'block';
        label.style.fontWeight = 'bold';
        label.style.fontSize = '0.9rem';
        label.style.color = 'var(--text)';
        label.style.marginBottom = '8px';
        label.innerText = '🌍 アクセント選択';

        const select = document.createElement('select');
        select.id = 'accent-select';
        select.style.cssText = `
            width: 100%;
            padding: 8px;
            border-radius: 8px;
            background: var(--bg);
            color: var(--text);
            border: 1px solid rgba(128,128,128,0.3);
            font-size: 0.9rem;
        `;

        Object.entries(ACCENTS).forEach(([code, accent]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = `${accent.flag} ${accent.name}`;
            if (code === getSelectedAccent()) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        select.onchange = function() {
            setSelectedAccent(this.value);
        };

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '8px 0 0 0';
        desc.style.opacity = '0.7';
        desc.innerText = "お手本音声のアクセントを選択できます。";

        wrapper.appendChild(label);
        wrapper.appendChild(select);
        wrapper.appendChild(desc);

        // 基本設定セクションに追加（カタカナヒントの後）
        const katakanaSection = document.getElementById('setting-katakana-wrapper');
        if (katakanaSection) {
            katakanaSection.parentNode.insertBefore(wrapper, katakanaSection.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    // 設定画面にトグルを追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-accent-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-accent-wrapper';
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
        checkbox.id = 'toggle-accent';
        checkbox.style.marginRight = '10px';
        checkbox.checked = isEnabled();

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            if (checkbox.checked) {
                setTimeout(injectAccentSelector, 500);
                hookSpeakModel();
            } else {
                const accentSelector = document.getElementById('accent-selector-wrapper');
                if (accentSelector) accentSelector.remove();
            }
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("🌍 アクセント選択機能を有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "アメリカ英語、イギリス英語、オーストラリア英語など、お手本音声のアクセントを選択できます。";
        wrapper.appendChild(desc);

        const notesSection = document.getElementById('setting-notes-wrapper');
        if (notesSection) {
            notesSection.parentNode.insertBefore(wrapper, notesSection.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    window.addEventListener('load', () => {
        hookSpeakModel();
        setTimeout(() => {
            injectSettingsToggle();
            if (isEnabled()) {
                setTimeout(injectAccentSelector, 1500);
            }
        }, 1000);
    });
})();

