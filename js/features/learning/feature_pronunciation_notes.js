/**
 * feature_pronunciation_notes.js
 * 発音ノート機能
 * 各単語にメモを追加できる機能
 */

(function() {
    const STORAGE_KEY = 'lr_pronunciation_notes_enabled';
    const NOTES_DATA_KEY = 'lr_pronunciation_notes_data';

    let notesData = {};

    function loadNotesData() {
        try {
            const saved = localStorage.getItem(NOTES_DATA_KEY);
            if (saved) {
                notesData = JSON.parse(saved);
            }
        } catch(e) {
            console.error("Failed to load notes data:", e);
        }
    }

    function saveNotesData() {
        try {
            localStorage.setItem(NOTES_DATA_KEY, JSON.stringify(notesData));
        } catch(e) {
            console.error("Failed to save notes data:", e);
        }
    }

    function isEnabled() {
        return typeof window.getFeatureDefault === 'function'
            ? window.getFeatureDefault(STORAGE_KEY)
            : (localStorage.getItem(STORAGE_KEY) === 'true');
    }

    function getNoteKey(word, category) {
        return `${category}:${word}`;
    }

    function getNote(word, category) {
        const key = getNoteKey(word, category);
        const noteObj = notesData[key];
        if (!noteObj) return '';
        // 旧形式（文字列）の場合はそのまま返す
        if (typeof noteObj === 'string') return noteObj;
        // 新形式（オブジェクト）の場合は結合して返す
        let result = '';
        if (noteObj.userNote) {
            result += noteObj.userNote;
        }
        if (noteObj.aiAdvice) {
            if (result) result += '\n\n';
            result += '💡 AIアドバイス: ' + noteObj.aiAdvice;
        }
        return result;
    }

    function getNoteObject(word, category) {
        const key = getNoteKey(word, category);
        const noteObj = notesData[key];
        if (!noteObj) return { userNote: '', aiAdvice: '' };
        // 旧形式（文字列）の場合は変換
        if (typeof noteObj === 'string') {
            return { userNote: noteObj, aiAdvice: '' };
        }
        return noteObj;
    }

    function saveNote(word, category, note) {
        const key = getNoteKey(word, category);
        const currentNote = getNoteObject(word, category);
        
        if (note.trim()) {
            // ユーザーメモとAIアドバイスを分離
            const parts = note.split(/\n\n💡 AIアドバイス:\s*/);
            const userNote = parts[0].trim();
            const aiAdvice = parts[1] ? parts[1].trim() : currentNote.aiAdvice;
            
            notesData[key] = {
                userNote: userNote,
                aiAdvice: aiAdvice
            };
        } else {
            delete notesData[key];
        }
        saveNotesData();
    }

    // AIアドバイスを自動追記
    function appendAIAdvice(word, category, advice) {
        if (!isEnabled() || !advice || !advice.trim()) return;
        
        const key = getNoteKey(word, category);
        const currentNote = getNoteObject(word, category);
        
        // AIアドバイスを更新（2回目以降は上書き）
        notesData[key] = {
            userNote: currentNote.userNote, // ユーザーメモは保持
            aiAdvice: advice.trim() // AIアドバイスは最新のものに更新
        };
        
        saveNotesData();
        updateNoteDisplay();
    }

    // ノート表示エリアを追加
    function injectNoteArea() {
        if (!isEnabled()) return;

        const feedbackArea = document.getElementById('feedback-area');
        if (!feedbackArea || document.getElementById('pronunciation-note-area')) return;

        const noteArea = document.createElement('div');
        noteArea.id = 'pronunciation-note-area';
        noteArea.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            background: rgba(59, 130, 246, 0.1);
            border-radius: 8px;
            border-left: 3px solid var(--primary);
        `;

        const noteDisplay = document.createElement('div');
        noteDisplay.id = 'pronunciation-note-display';
        noteDisplay.style.cssText = `
            font-size: 0.9rem;
            color: var(--text);
            margin-bottom: 8px;
            min-height: 20px;
        `;

        const noteInput = document.createElement('textarea');
        noteInput.id = 'pronunciation-note-input';
        noteInput.placeholder = 'この単語についてのメモを入力...';
        noteInput.style.cssText = `
            width: 100%;
            min-height: 60px;
            padding: 8px;
            border-radius: 6px;
            border: 1px solid rgba(128,128,128,0.3);
            background: var(--bg);
            color: var(--text);
            font-size: 0.9rem;
            resize: vertical;
            display: none;
        `;

        const noteButtons = document.createElement('div');
        noteButtons.style.cssText = 'display: flex; gap: 8px; margin-top: 8px;';

        const editBtn = document.createElement('button');
        editBtn.innerText = '📝 メモを編集';
        editBtn.className = 'btn-small';
        editBtn.onclick = function() {
            noteDisplay.style.display = 'none';
            noteInput.style.display = 'block';
            editBtn.style.display = 'none';
            saveBtn.style.display = 'inline-block';
            cancelBtn.style.display = 'inline-block';
        };

        const saveBtn = document.createElement('button');
        saveBtn.innerText = '💾 保存';
        saveBtn.className = 'btn-small';
        saveBtn.style.display = 'none';
        saveBtn.onclick = function() {
            if (window.targetObj && window.targetObj.w && window.currentCategory) {
                saveNote(window.targetObj.w, window.currentCategory, noteInput.value);
                updateNoteDisplay();
                noteInput.style.display = 'none';
                noteDisplay.style.display = 'block';
                editBtn.style.display = 'inline-block';
                saveBtn.style.display = 'none';
                cancelBtn.style.display = 'none';
            }
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'キャンセル';
        cancelBtn.className = 'btn-small';
        cancelBtn.style.display = 'none';
        cancelBtn.onclick = function() {
            noteInput.style.display = 'none';
            noteDisplay.style.display = 'block';
            editBtn.style.display = 'inline-block';
            saveBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
            updateNoteDisplay();
        };

        noteButtons.appendChild(editBtn);
        noteButtons.appendChild(saveBtn);
        noteButtons.appendChild(cancelBtn);

        noteArea.appendChild(noteDisplay);
        noteArea.appendChild(noteInput);
        noteArea.appendChild(noteButtons);

        feedbackArea.parentNode.insertBefore(noteArea, feedbackArea.nextSibling);

        // 単語が変わった時にノートを更新
        const originalNextQuestion = window.nextQuestion;
        if (originalNextQuestion) {
            window.nextQuestion = function() {
                originalNextQuestion();
                setTimeout(updateNoteDisplay, 100);
            };
        }

        updateNoteDisplay();
    }

    function updateNoteDisplay() {
        if (!isEnabled()) return;

        const noteDisplay = document.getElementById('pronunciation-note-display');
        const noteInput = document.getElementById('pronunciation-note-input');
        if (!noteDisplay || !noteInput) return;

        if (window.targetObj && window.targetObj.w && window.currentCategory) {
            const note = getNote(window.targetObj.w, window.currentCategory);
            const noteObj = getNoteObject(window.targetObj.w, window.currentCategory);
            
            if (note) {
                let html = '<strong>📝 メモ:</strong><br>';
                if (noteObj.userNote) {
                    html += noteObj.userNote.replace(/\n/g, '<br>');
                }
                if (noteObj.aiAdvice) {
                    if (noteObj.userNote) html += '<br><br>';
                    html += '<span style="color:var(--accent);">💡 AIアドバイス:</span> ' + noteObj.aiAdvice.replace(/\n/g, '<br>');
                }
                noteDisplay.innerHTML = html;
                noteInput.value = note;
            } else {
                noteDisplay.innerHTML = '';
                noteInput.value = '';
            }
        } else {
            noteDisplay.innerHTML = '';
            noteInput.value = '';
        }
    }

    // 既存のロジックをフックしてAIアドバイスを自動追記
    function hookResultHandling() {
        const originalHandleResult = window.handleResult;
        if (originalHandleResult) {
            window.handleResult = function(result) {
                originalHandleResult(result);
                
                // 間違えた場合にAIアドバイスを自動追記
                if (result && !result.isCorrect && result.advice && 
                    window.targetObj && window.targetObj.w && window.currentCategory) {
                    appendAIAdvice(window.targetObj.w, window.currentCategory, result.advice);
                }
            };
        }
    }

    // 設定画面にトグルを追加
    function injectSettingsToggle() {
        const settingsBody = document.querySelector('#settings-modal .modal-content div[style*="overflow"]');
        if (!settingsBody || document.getElementById('setting-notes-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'setting-notes-wrapper';
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
        checkbox.id = 'toggle-notes';
        checkbox.style.marginRight = '10px';
        checkbox.checked = isEnabled();

        checkbox.onchange = function() {
            localStorage.setItem(STORAGE_KEY, checkbox.checked);
            if (checkbox.checked) {
                setTimeout(injectNoteArea, 500);
            } else {
                const noteArea = document.getElementById('pronunciation-note-area');
                if (noteArea) noteArea.remove();
            }
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode("📝 発音ノート機能を有効にする"));
        wrapper.appendChild(label);

        const desc = document.createElement('p');
        desc.style.fontSize = '0.8rem';
        desc.style.margin = '5px 0 0 25px';
        desc.style.opacity = '0.7';
        desc.innerText = "各単語にメモを追加して、自分なりの発音のコツを記録できます。";
        wrapper.appendChild(desc);

        const reminderSection = document.getElementById('setting-reminder-wrapper');
        if (reminderSection) {
            reminderSection.parentNode.insertBefore(wrapper, reminderSection.nextSibling);
        } else {
            settingsBody.appendChild(wrapper);
        }
    }

    window.addEventListener('load', () => {
        loadNotesData();
        hookResultHandling();
        setTimeout(() => {
            injectSettingsToggle();
            if (isEnabled()) {
                setTimeout(injectNoteArea, 1500);
            }
        }, 1000);
    });
})();

