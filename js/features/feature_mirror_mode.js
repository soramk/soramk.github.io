/**
 * feature_mirror_mode.js (v3: 日本語化)
 * 口の形の図解（Diagram）の横に、Webカメラの映像を表示する「ミラーモード」を追加するプラグイン。
 * 設定画面でオン/オフを切り替え可能。
 */

(function() {
    let videoStream = null;
    const STORAGE_KEY = 'lr_mirror_enabled';

    // 初期化
    window.addEventListener('load', () => {
        setTimeout(() => {
            injectSettingsToggle(); // 設定画面にスイッチ追加
            applyState();           // 現在の設定に合わせて表示/非表示
        }, 800);
    });

    // 1. 設定画面にチェックボックスを注入
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody) return;

        // 既にスイッチがあるなら何もしない
        if (document.getElementById('setting-mirror-wrapper')) return;

        // スイッチUI作成
        const wrapper = document.createElement('div');
        wrapper.id = 'setting-mirror-wrapper';
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
        checkbox.id = 'toggle-mirror-feature';
        checkbox.style.marginRight = '10px';
        
        // 保存された設定を読み込む（デフォルト値はloader.jsで設定）
        checkbox.checked = typeof window.getFeatureDefault === 'function' 
            ? window.getFeatureDefault(STORAGE_KEY)
            : (localStorage.getItem(STORAGE_KEY) === 'true');

        // 切り替え時の動作
        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            applyState();
        };

        label.appendChild(checkbox);
        // ★日本語化
        label.appendChild(document.createTextNode("📷 ミラーモード (Webカメラ) を有効にする"));
        wrapper.appendChild(label);
        
        // 説明文
        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        // ★日本語化
        desc.innerText = "口の形の図解の横に自分のカメラ映像を表示し、フォームを確認できます。";
        wrapper.appendChild(desc);

        // 「Playback Speed」設定の前あたりに挿入
        const speedSetting = document.getElementById('speech-rate').closest('div');
        if(speedSetting) {
            settingsBody.insertBefore(wrapper, speedSetting);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    // 2. 現在の設定に基づいてボタンの表示/非表示を切り替え
    function applyState() {
        const isEnabled = typeof window.getFeatureDefault === 'function'
            ? window.getFeatureDefault(STORAGE_KEY)
            : (localStorage.getItem(STORAGE_KEY) === 'true');
        const btn = document.getElementById('mirror-toggle-btn');
        const container = document.getElementById('mirror-container');

        if (isEnabled) {
            if (!btn) injectMirrorButton();
            if (btn) btn.style.display = 'inline-block';
        } else {
            if (btn) btn.style.display = 'none';
            if (container && container.style.display !== 'none') {
                const video = document.getElementById('mirror-video');
                if(video) stopCamera(video);
                container.style.display = 'none';
                if(btn) {
                    btn.innerText = '🪞 Mirror';
                    btn.style.background = '#334155';
                }
            }
        }
    }

    // 3. ミラーボタンとエリアの生成
    function injectMirrorButton() {
        const diagramBox = document.querySelector('.diagram-box');
        if (!diagramBox) return;

        if (!document.getElementById('mirror-container')) {
            const mirrorContainer = document.createElement('div');
            mirrorContainer.id = 'mirror-container';
            mirrorContainer.style.display = 'none';
            mirrorContainer.style.width = '120px';
            mirrorContainer.style.height = '120px';
            mirrorContainer.style.marginLeft = '10px';
            mirrorContainer.style.borderRadius = '8px';
            mirrorContainer.style.overflow = 'hidden';
            mirrorContainer.style.background = '#000';
            mirrorContainer.style.border = '2px solid var(--accent)';
            mirrorContainer.style.position = 'relative';

            const video = document.createElement('video');
            video.id = 'mirror-video';
            video.autoplay = true;
            video.muted = true;
            video.playsInline = true;
            video.style.transform = 'scaleX(-1)';
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            // 口元を中央に表示するように位置調整（上から60%の位置を中央に）
            video.style.objectPosition = 'center 60%';

            mirrorContainer.appendChild(video);
            diagramBox.appendChild(mirrorContainer);
        }

        if (!document.getElementById('mirror-toggle-btn')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'mirror-toggle-btn';
            toggleBtn.innerText = '🪞 Mirror';
            toggleBtn.className = 'btn-small';
            toggleBtn.style.marginLeft = 'auto';
            toggleBtn.style.background = '#334155';
            toggleBtn.style.color = 'white';
            
            toggleBtn.onclick = function() {
                const container = document.getElementById('mirror-container');
                const video = document.getElementById('mirror-video');
                toggleMirror(container, video, toggleBtn);
            };

            const diagramText = document.querySelector('.diagram-text');
            if(diagramText) {
                diagramText.appendChild(document.createElement('br'));
                diagramText.appendChild(toggleBtn);
            }
        }
    }

    async function toggleMirror(container, video, btn) {
        if (container.style.display === 'none') {
            try {
                // フロントカメラを使用し、口元が映りやすい解像度を指定
                const constraints = {
                    video: {
                        facingMode: 'user', // フロントカメラ
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    },
                    audio: false
                };
                videoStream = await navigator.mediaDevices.getUserMedia(constraints);
                video.srcObject = videoStream;
                container.style.display = 'block';
                btn.innerText = '🪞 OFF';
                btn.style.background = 'var(--accent)';
            } catch (err) {
                alert("カメラの起動に失敗しました: " + err.message);
            }
        } else {
            stopCamera(video);
            container.style.display = 'none';
            btn.innerText = '🪞 Mirror';
            btn.style.background = '#334155';
        }
    }

    function stopCamera(video) {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }
        if (video) {
            video.srcObject = null;
        }
    }
})();