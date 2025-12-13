/**
 * core_api_client.js
 * Gemini, OpenAI, Web Speech API との通信ロジック
 */

// --- 共通ヘルパー: 結果処理のブリッジ ---
function checkPronunciation(result) {
    if (typeof handleResult === 'function') {
        handleResult({
            transcript: result.heard || result.transcript, // 表記ゆれ吸収
            isCorrect: result.correct || result.isCorrect,
            advice: result.advice
        });
    } else {
        console.log("Result:", result);
    }
}

function handleError(e) {
    console.error(e);
    const fb = document.getElementById('feedback-area');
    if (fb) fb.innerText = "エラー: " + (e.message || e);
    
    // 録音UIのリセット
    if (typeof updateRecordButtonUI === 'function') {
        window.isRecording = false; 
        updateRecordButtonUI();
    }
}

// 共通エントリポイント
async function sendToAI(audioBlob) {
    const provider = document.getElementById('ai-provider').value;
    const mimeType = 'audio/webm'; 

    if (provider === 'gemini') {
        await sendToGemini(audioBlob, mimeType);
    } else if (provider === 'openai') {
        await sendToOpenAI(audioBlob, mimeType);
    } else if (provider === 'web') {
        startWebSpeech(); 
    }
}


// --- 1. Gemini Implementation ---

async function fetchModels(silent=false, savedModel=null) {
    const k = document.getElementById('api-key-gemini').value;
    const sel = document.getElementById('model-select');
    if(!k) {
        if(!silent) alert("Gemini APIキーが設定されていません。");
        return;
    }
    
    // 保存されたモデル選択を取得（引数がない場合はlocalStorageから）
    if(!savedModel) {
        savedModel = localStorage.getItem('gemini_model');
    }
    
    try {
        const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${k}`);
        
        // HTTPステータスコードのチェック
        if(!r.ok) {
            const errorData = await r.json().catch(() => ({}));
            const errorMsg = errorData.error?.message || `HTTP ${r.status}: ${r.statusText}`;
            throw new Error(errorMsg);
        }
        
        const d=await r.json();
        
        // エラーレスポンスのチェック
        if(d.error) {
            throw new Error(d.error.message || 'Unknown error');
        }
        
        // modelsプロパティの存在確認
        if(!d.models || !Array.isArray(d.models)) {
            throw new Error('APIレスポンスにmodelsプロパティがありません。APIキーが正しいか確認してください。');
        }
        
        sel.innerHTML='';
        const filteredModels = d.models.filter(m=>
            m.supportedGenerationMethods?.includes("generateContent")&&
            (m.name.includes("flash")||m.name.includes("pro"))
        );
        
        if(filteredModels.length === 0) {
            sel.innerHTML='<option>利用可能なモデルが見つかりません</option>';
            sel.disabled=true;
            if(!silent) alert("利用可能なGeminiモデルが見つかりませんでした。");
            return;
        }
        
        filteredModels.forEach(m=>{
            const o=document.createElement('option'); 
            o.value=m.name.replace('models/',''); 
            o.text=m.displayName || m.name; 
            sel.appendChild(o);
        });
        sel.disabled=false;
        
        // 保存されたモデル選択を復元（存在する場合）
        if(savedModel && Array.from(sel.options).some(opt => opt.value === savedModel)) {
            sel.value = savedModel;
            // 復元したモデルを再度保存（確実に保存されるように）
            localStorage.setItem('gemini_model', savedModel);
        } else if(savedModel) {
            // 保存されたモデルがリストにない場合、デフォルト値を設定
            console.log(`保存されたモデル "${savedModel}" が見つかりませんでした。デフォルト値を設定します。`);
            if(sel.options.length > 0) {
                sel.value = sel.options[0].value;
                localStorage.setItem('gemini_model', sel.value);
            }
        } else if(sel.options.length > 0) {
            // 保存されたモデルがない場合、デフォルト値を設定
            sel.value = sel.options[0].value;
            localStorage.setItem('gemini_model', sel.value);
        }
        
        if(!silent) {
            console.log(`Geminiモデルを${filteredModels.length}件取得しました。選択モデル: ${sel.value}`);
        }
    } catch(e) { 
        console.error("Gemini モデル取得エラー:", e);
        if(!silent) {
            alert("Gemini モデル取得エラー: " + (e.message || e));
        }
        // エラー時もセレクトボックスをリセット
        if(sel) {
            sel.innerHTML='<option>エラー: モデルを取得できませんでした</option>';
            sel.disabled=true;
        }
    }
}

async function sendToGemini(blob, mime) {
    const isL = (typeof isTargetL !== 'undefined') ? isTargetL : true;
    const current = (typeof currentPair !== 'undefined') ? currentPair : {l:{w:'test'}, r:{w:'test'}};
    const targetObj = isL ? current.l : current.r;

    const k=document.getElementById('api-key-gemini').value;
    const elModel = document.getElementById('model-select');
    const m = elModel ? (elModel.value || localStorage.getItem('gemini_model') || 'gemini-1.5-flash') : 'gemini-1.5-flash';
    
    const b64=await new Promise(r=>{const fr=new FileReader(); fr.onloadend=()=>r(fr.result.split(',')[1]); fr.readAsDataURL(blob);});
    
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`;
    
    const promptText = `
    Input: Audio of a user trying to pronounce the English word "${targetObj.w}".
    Task:
    1. Identify the heard word.
    2. Compare it with the target "${targetObj.w}" and the distractor "${(isL?current.r:current.l).w}".
    3. If incorrect, provide a 1-sentence advice IN JAPANESE (日本語) about tongue position or lips.
    
    Output Format (JSON Only):
    {
      "heard": "english_word_heard",
      "correct": true/false,
      "advice": "日本語のアドバイス文字列"
    }
    `;

    const p={
        contents:[{parts:[{text:promptText},{inline_data:{mime_type:mime.split(';')[0],data:b64}}]}],
        generationConfig: { response_mime_type: "application/json" }
    };

    // デバッグログを記録
    if (typeof window.addApiDebugLog === 'function') {
        window.addApiDebugLog('gemini', m, promptText, {
            url: url,
            mimeType: mime.split(';')[0],
            targetWord: targetObj.w,
            isTargetL: isL
        });
    }
    
    try{
        const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
        const d=await res.json(); 
        if(d.error) throw new Error(d.error.message);
        
        let rawText = d.candidates[0].content.parts[0].text;
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawText);
        
        // API使用量を記録
        if (typeof window.recordApiUsage === 'function') {
            const promptTokens = Math.ceil(promptText.length / 4); // 簡易推定
            const responseTokens = Math.ceil(rawText.length / 4); // 簡易推定
            window.recordApiUsage('gemini', m, promptTokens, responseTokens);
        }
        
        checkPronunciation(result); 
    }catch(e){ 
        handleError(e); 
    }
}


// --- 2. OpenAI Implementation ---

async function sendToOpenAI(blob, mime) {
    const isL = (typeof isTargetL !== 'undefined') ? isTargetL : true;
    const current = (typeof currentPair !== 'undefined') ? currentPair : {l:{w:'test'}, r:{w:'test'}};
    const targetObj = isL ? current.l : current.r;

    const k = document.getElementById('api-key-openai').value;
    if(!k) { alert("OpenAI Key missing"); return; }
    
    try {
        // Whisper API呼び出しのデバッグログ
        if (typeof window.addApiDebugLog === 'function') {
            window.addApiDebugLog('openai', 'whisper-1', `音声ファイルを文字起こし\nファイルサイズ: ${(blob.size / 1024).toFixed(2)}KB\n対象単語: ${targetObj.w}`, {
            });
        }
        
        const formData = new FormData();
        const file = new File([blob], "audio.webm", { type: mime });
        formData.append("file", file);
        formData.append("model", "whisper-1");
        formData.append("language", "en");

        const transRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${k}` },
            body: formData
        });
        const transData = await transRes.json();
        if(transData.error) throw new Error(transData.error.message);
        
        // Whisper API使用量を記録（音声ファイルから推定）
        if (typeof window.recordApiUsage === 'function') {
            const audioTokens = Math.ceil((blob.size / 1024 / 16) * 150); // 1秒≈150トークン
            window.recordApiUsage('openai', 'whisper-1', audioTokens, 0);
        }
        
        const heardWord = transData.text.replace(/[\.\,\!\?]/g, '').trim().toLowerCase();
        
        const target = targetObj.w.toLowerCase();
        if(heardWord.includes(target)) {
            checkPronunciation({ heard: heardWord, correct: true, advice: "" });
            return;
        }

        const prompt = `
        User said: "${heardWord}"
        Target was: "${targetObj.w}"
        Distractor was: "${(isL?current.r:current.l).w}"
        The user pronunciation seems incorrect.
        Provide a very brief 1-sentence advice in JAPANESE about how to fix the pronunciation.
        Format: Just the Japanese string.
        `;

        // GPT-4o-mini API呼び出しのデバッグログ
        if (typeof window.addApiDebugLog === 'function') {
            window.addApiDebugLog('openai', 'gpt-4o-mini', prompt, {
                heardWord: heardWord,
                targetWord: targetObj.w,
                isTargetL: isL
            });
        }

        const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${k}` 
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{role: "user", content: prompt}],
                max_tokens: 60
            })
        });
        const chatData = await chatRes.json();
        const advice = chatData.choices[0].message.content;

        // GPT-4o-mini API使用量を記録
        if (typeof window.recordApiUsage === 'function') {
            const promptTokens = Math.ceil(prompt.length / 4); // 簡易推定
            const responseTokens = Math.ceil(advice.length / 4); // 簡易推定
            window.recordApiUsage('openai', 'gpt-4o-mini', promptTokens, responseTokens);
        }

        checkPronunciation({ heard: heardWord, correct: false, advice: advice });

    } catch(e) { 
        handleError(e);
    }
}


// --- 3. Web Speech API Implementation ---
let webRecognition = null;

function startWebSpeech() {
    const isL = (typeof isTargetL !== 'undefined') ? isTargetL : true;
    const current = (typeof currentPair !== 'undefined') ? currentPair : {l:{w:'test'}, r:{w:'test'}};
    const targetObj = isL ? current.l : current.r;

    // Web Speech API呼び出しのデバッグログ
    if (typeof window.addApiDebugLog === 'function') {
        window.addApiDebugLog('web', 'Web Speech API', `ブラウザ標準の音声認識を使用\n対象単語: ${targetObj.w}\n言語: en-US`, {
            isTargetL: isL
        });
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition) { alert("Web Speech API not supported."); return; }

    if(webRecognition) {
        try { webRecognition.abort(); } catch(e){}
        webRecognition = null;
    }

    webRecognition = new SpeechRecognition();
    webRecognition.lang = 'en-US';
    webRecognition.interimResults = false; 
    webRecognition.maxAlternatives = 1;

    webRecognition.onstart = () => {
        const fb = document.getElementById('feedback-area');
        if(fb) fb.innerText = "Listening (Browser)...";
        if(typeof sfx !== 'undefined' && sfx.start) sfx.start();
    };

    webRecognition.onresult = (event) => {
        // 結果が出たら、まず録音（MediaRecorder）を停止させる
        if (typeof stopRecordingInternal === 'function') {
            stopRecordingInternal(); 
        }

        const heard = event.results[0][0].transcript.toLowerCase();
        const target = targetObj.w.toLowerCase();
        const distractor = (isL?current.r:current.l).w.toLowerCase();
        
        let isOk = false;
        let advice = "";

        if(heard.split(/[\s\.\?!]+/).includes(target)) {
            isOk = true;
        } else {
            isOk = false;
            if(heard.includes(distractor)) {
                advice = `"${distractor}" に聞こえました。`;
            } else {
                advice = `"${heard}" と聞こえました。`;
            }
        }
        
        checkPronunciation({ heard: heard, correct: isOk, advice: advice });
    };

    webRecognition.onerror = (event) => {
        // ★修正: 明示的な無視条件を追加
        if (event.error === 'aborted' || event.error === 'not-allowed') {
            console.log("WebSpeech Ignored Error:", event.error);
            return;
        }

        console.error("Web Speech Error:", event.error);
        
        const fb = document.getElementById('feedback-area');
        if(fb) fb.innerText = "Error: " + event.error;

        // エラー時も録音を停止してリセット
        if (typeof stopRecordingInternal === 'function') {
            stopRecordingInternal(); 
        } else {
            if(typeof isRecording !== 'undefined') window.isRecording = false;
            if(typeof updateRecordButtonUI === 'function') updateRecordButtonUI();
        }
    };

    webRecognition.onend = () => {
        if(typeof updateRecordButtonUI === 'function') updateRecordButtonUI();
        webRecognition = null;
    };

    try {
        webRecognition.start();
    } catch(e) {
        console.error("Start Failed", e);
        if(typeof updateRecordButtonUI === 'function') updateRecordButtonUI();
    }
}

function stopWebSpeech() {
    if(webRecognition) {
        // ★修正: 停止前にイベントハンドラを無効化し、エラー発火を完全に防ぐ
        webRecognition.onerror = null;
        webRecognition.onend = null;
        try { 
            webRecognition.abort(); 
        } catch(e){}
        webRecognition = null;
    }
}