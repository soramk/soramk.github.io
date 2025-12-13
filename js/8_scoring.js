/**
 * 8_scoring.js (v2.1: データマッピング修正版)
 * 発音の採点機能（0-100点）を追加するプラグイン。
 * サーバー混雑時(Overloaded)の自動リトライ機能を搭載。
 */

// --- 1. スコア表示用のスタイル ---
if (!document.getElementById('score-style')) {
    const style = document.createElement('style');
    style.id = 'score-style';
    style.innerHTML = `
        .score-badge {
            display: inline-block;
            background: #0f172a;
            color: #fff;
            font-size: 1.2rem;
            font-weight: 800;
            padding: 5px 12px;
            border-radius: 50px;
            margin-left: 10px;
            vertical-align: middle;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .score-high { background: linear-gradient(135deg, #22c55e, #16a34a); }
        .score-mid { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .score-low { background: linear-gradient(135deg, #ef4444, #b91c1c); }
    `;
    document.head.appendChild(style);
}

// --- 2. リトライ付きのGemini送信処理 ---

window.sendToGemini = async function(blob, mime) {
    const isL = (typeof isTargetL !== 'undefined') ? isTargetL : true;
    const current = (typeof currentPair !== 'undefined') ? currentPair : {l:{w:'test'}, r:{w:'test'}};
    const targetObj = isL ? current.l : current.r;

    const k = document.getElementById('api-key-gemini').value;
    const m = document.getElementById('model-select').value || 'gemini-1.5-flash';
    
    // Base64変換
    const b64 = await new Promise(r=>{const fr=new FileReader(); fr.onloadend=()=>r(fr.result.split(',')[1]); fr.readAsDataURL(blob);});
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`;
    
    // プロンプト：JSON形式を厳格に指定
    const promptText = `
    Input: Audio of a user trying to pronounce the English word "${targetObj.w}".
    Task:
    1. Identify the heard word.
    2. Rate the pronunciation on a scale of 0 to 100.
    3. If score is under 100, provide specific advice in JAPANESE.
    
    Output Format (JSON Only):
    {
      "heard": "word",
      "correct": true/false,
      "score": 85, 
      "advice": "Japanese advice"
    }
    `;

    const payload = {
        contents:[{parts:[{text:promptText},{inline_data:{mime_type:mime.split(';')[0],data:b64}}]}],
        generationConfig: { response_mime_type: "application/json" }
    };

    // ★リトライロジック (最大3回)
    const MAX_RETRIES = 3;
    let attempt = 0;

    const tryFetch = async () => {
        attempt++;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            // サーバーエラー系 (503 Service Unavailable / 429 Too Many Requests) なら例外を投げてリトライさせる
            if (res.status === 503 || res.status === 429) {
                throw new Error(`Server Busy (Status: ${res.status})`);
            }

            const d = await res.json();
            
            // エラーレスポンスの確認
            if (d.error) {
                if (d.error.message && d.error.message.includes('overloaded')) {
                    throw new Error("Model is overloaded");
                }
                throw new Error(d.error.message);
            }
            
            // 成功時の処理
            let rawText = d.candidates[0].content.parts[0].text;
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawText);
            
            // ここでチェック関数へ渡す
            window.checkPronunciation(result); 

        } catch (e) {
            console.warn(`Gemini Attempt ${attempt} failed: ${e.message}`);
            
            // リトライ条件
            if (attempt < MAX_RETRIES && (e.message.includes('overloaded') || e.message.includes('Busy') || e.message.includes('Failed to fetch'))) {
                const btn = document.getElementById('rec-btn');
                if(btn) btn.innerText = `Retry (${attempt}/${MAX_RETRIES})...`;
                
                await new Promise(resolve => setTimeout(resolve, 1500));
                return tryFetch();
            } else {
                handleError(new Error(`Gemini Error: ${e.message}. Please try changing the Model in settings.`));
            }
        }
    };

    // 実行開始
    tryFetch();
};


// --- 3. Web Speech API (ブラウザ標準) の採点フォールバック ---

window.startWebSpeech = function() {
    const isL = (typeof isTargetL !== 'undefined') ? isTargetL : true;
    const current = (typeof currentPair !== 'undefined') ? currentPair : {l:{w:'test'}, r:{w:'test'}};
    const targetObj = isL ? current.l : current.r;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition) { alert("Web Speech API not supported."); return; }

    if(window.webRecognition) {
        try { window.webRecognition.abort(); } catch(e){}
        window.webRecognition = null;
    }

    window.webRecognition = new SpeechRecognition();
    window.webRecognition.lang = 'en-US';
    window.webRecognition.interimResults = false; 
    window.webRecognition.maxAlternatives = 1;

    window.webRecognition.onstart = () => {
        const fb = document.getElementById('feedback-area');
        if(fb) fb.innerText = "Listening (Browser)...";
        if(typeof sfx !== 'undefined' && sfx.start) sfx.start();
    };

    window.webRecognition.onresult = (event) => {
        if (typeof stopRecordingInternal === 'function') stopRecordingInternal(); 

        const heard = event.results[0][0].transcript.toLowerCase();
        const target = targetObj.w.toLowerCase();
        const distractor = (isL?current.r:current.l).w.toLowerCase();
        
        let isOk = false;
        let advice = "";
        let score = 0; 

        if(heard.split(/[\s\.\?!]+/).includes(target)) {
            isOk = true;
            score = 100;
        } else {
            isOk = false;
            score = 40;
            if(heard.includes(distractor)) {
                advice = `"${distractor}" に聞こえました。`;
            } else {
                advice = `"${heard}" と聞こえました。`;
            }
        }
        // ここでもチェック関数へ渡す
        window.checkPronunciation({ heard: heard, correct: isOk, advice: advice, score: score });
    };

    window.webRecognition.onerror = (event) => {
        if (event.error === 'aborted' || event.error === 'not-allowed') return;
        console.error("Web Speech Error:", event.error);
        const fb = document.getElementById('feedback-area');
        if(fb) fb.innerText = "Error: " + event.error;
        if (typeof stopRecordingInternal === 'function') stopRecordingInternal(); 
    };

    window.webRecognition.onend = () => {
        if(typeof updateRecordButtonUI === 'function') updateRecordButtonUI();
        window.webRecognition = null;
    };

    try { window.webRecognition.start(); } 
    catch(e) { console.error("Start Failed", e); if(typeof updateRecordButtonUI === 'function') updateRecordButtonUI(); }
};

// --- ★追加: データの正規化を行う関数 ---
// Gemini (heard/correct) と handleResult (transcript/isCorrect) の橋渡し
window.checkPronunciation = function(data) {
    const standardized = {
        // Geminiは 'heard', Web Speech APIなどは 'transcript' の場合があるため両対応
        transcript: data.heard || data.transcript || "",
        
        // Geminiは 'correct', handleResultは 'isCorrect' を期待
        isCorrect: (data.correct !== undefined) ? data.correct : (data.isCorrect !== undefined ? data.isCorrect : false),
        
        // スコアとアドバイスはそのまま
        score: (data.score !== undefined) ? data.score : 0,
        advice: data.advice || ""
    };

    // UI更新関数へ渡す
    window.handleResult(standardized);
};


// --- 4. 結果表示（handleResult） ---

window.addToHistory = function(target, heard, isOk, score) {
    const list = document.getElementById('history-list');
    if(!list) return;
    const li = document.createElement('li');
    li.className = 'history-item';
    const scoreStr = (score !== undefined) ? ` <span style="font-size:0.8em; border:1px solid #ccc; border-radius:4px; padding:0 4px;">${score}pts</span>` : '';
    li.innerHTML = `<span class="${isOk?'res-ok':'res-ng'}">${isOk?'OK':'NG'}</span> <span>Target: ${target} / ${heard}${scoreStr}</span>`;
    list.prepend(li);
};

window.handleResult = function(result) {
    // ここで受け取る result は checkPronunciation で正規化済み
    const inp = result.transcript;
    const isOk = result.isCorrect; 
    const score = result.score; 
    
    const fb = document.getElementById('feedback-area');
    const autoFlow = document.getElementById('toggle-auto-flow').checked;
    const cont = document.querySelector('.container');
    
    if (typeof updateRecordButtonUI === 'function') updateRecordButtonUI();
    const btn = document.getElementById('rec-btn');
    if(btn) btn.style.display = isOk ? 'none' : 'block';

    if(typeof updateWordStats === 'function') updateWordStats(isOk); 
    
    const targetText = document.getElementById('target-word').innerText;
    window.addToHistory(targetText, inp, isOk, score);

    // スコアバッジの生成
    let scoreBadge = '';
    if (score !== undefined) {
        let scoreClass = 'score-low';
        if (score >= 90) scoreClass = 'score-high';
        else if (score >= 70) scoreClass = 'score-mid';
        scoreBadge = `<span class="score-badge ${scoreClass}">${score}</span>`;
    }

    if(isOk){
        if(typeof sfx !== 'undefined') sfx.correct(); 
        if(cont) {
            cont.classList.remove('shake-anim');
            cont.classList.add('pop-anim');
            setTimeout(()=>cont.classList.remove('pop-anim'), 500);
        }

        if(fb) {
            fb.innerHTML = `🎉 Correct! ${scoreBadge}<br><small style="color:var(--text); opacity:0.8;">Heard: "${inp}"</small>`; 
            fb.className = "feedback correct";
        }
        
        if(typeof streak !== 'undefined') window.streak++; 
        
        if(autoFlow) {
            setTimeout(() => { if(typeof nextQuestion === 'function') nextQuestion(); }, 2000); 
        } else {
            const nextBtn = document.getElementById('next-btn-spk');
            if(nextBtn) nextBtn.style.display = 'block';
        }
    } else {
        if(typeof sfx !== 'undefined') sfx.wrong(); 
        if(cont) {
            cont.classList.remove('pop-anim');
            cont.classList.add('shake-anim');
            setTimeout(()=>cont.classList.remove('shake-anim'), 500);
        }

        const adviceText = result.advice || "Try again!";
        if(fb) {
            fb.innerHTML = `⚠️ ${inp} ${scoreBadge}<br><small style="font-size:0.8rem; color:var(--text); font-weight:bold;">💡 ${adviceText}</small>`; 
            fb.className = "feedback incorrect";
        }
        
        if(typeof streak !== 'undefined') window.streak = 0;
    }
    
    if(typeof updateStreakDisplay === 'function') updateStreakDisplay();
};

console.log("Scoring Plugin Loaded: Fixed data mapping for score display.");
