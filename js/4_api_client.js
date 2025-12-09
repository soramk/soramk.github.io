// --- 1. Gemini Implementation ---
async function fetchModels(silent=false) {
    const k = document.getElementById('api-key-gemini').value;
    const sel = document.getElementById('model-select');
    if(!k) return;
    try {
        const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${k}`);
        const d=await r.json();
        sel.innerHTML='';
        d.models.filter(m=>m.supportedGenerationMethods?.includes("generateContent")&&(m.name.includes("flash")||m.name.includes("pro"))).forEach(m=>{
            const o=document.createElement('option'); o.value=m.name.replace('models/',''); o.text=m.displayName; sel.appendChild(o);
        });
        sel.disabled=false;
    } catch(e) { if(!silent) alert("Gemini Model Fetch Error: " + e.message); }
}

async function sendToGemini(blob, mime) {
    const k=document.getElementById('api-key-gemini').value;
    const m=document.getElementById('model-select').value || 'gemini-1.5-flash';
    const b64=await new Promise(r=>{const fr=new FileReader(); fr.onloadend=()=>r(fr.result.split(',')[1]); fr.readAsDataURL(blob);});
    
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`;
    
    const promptText = `
    Input: Audio of a user trying to pronounce the English word "${targetObj.w}".
    Task:
    1. Identify the heard word.
    2. Compare it with the target "${targetObj.w}" and the distractor "${(isLTarget?currentPair.r:currentPair.l).w}".
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

    try{
        const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
        const d=await res.json(); 
        if(d.error) throw new Error(d.error.message);
        
        let rawText = d.candidates[0].content.parts[0].text;
        const result = JSON.parse(rawText);
        checkPronunciation(result); 
    }catch(e){ handleError(e); }
}

// --- 2. OpenAI Implementation ---
async function sendToOpenAI(blob, mime) {
    const k = document.getElementById('api-key-openai').value;
    if(!k) { alert("OpenAI Key missing"); return; }
    
    try {
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
        
        const heardWord = transData.text.replace(/[\.\,\!\?]/g, '').trim().toLowerCase();
        
        const target = targetObj.w.toLowerCase();
        if(heardWord.includes(target)) {
            checkPronunciation({ heard: heardWord, correct: true, advice: "" });
            return;
        }

        const prompt = `
        User said: "${heardWord}"
        Target was: "${targetObj.w}"
        Distractor was: "${(isLTarget?currentPair.r:currentPair.l).w}"
        The user pronunciation seems incorrect.
        Provide a very brief 1-sentence advice in JAPANESE about how to fix the pronunciation.
        Format: Just the Japanese string.
        `;

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

        checkPronunciation({ heard: heardWord, correct: false, advice: advice });

    } catch(e) { handleError(e); }
}

// --- 3. Web Speech API Implementation (Logic Only) ---
let webRecognition = null;

function startWebSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition) { alert("Web Speech API not supported."); return; }

    webRecognition = new SpeechRecognition();
    webRecognition.lang = 'en-US';
    webRecognition.interimResults = false;
    webRecognition.maxAlternatives = 1;

    webRecognition.onstart = () => {
        document.getElementById('feedback-area').innerText = "Listening (Browser)...";
        sfx.start();
    };

    webRecognition.onresult = (event) => {
        const heard = event.results[0][0].transcript.toLowerCase();
        const target = targetObj.w.toLowerCase();
        const distractor = (isLTarget?currentPair.r:currentPair.l).w.toLowerCase();
        
        let isOk = false;
        let advice = "";

        if(heard.split(/[\s\.\?!]+/).includes(target)) {
            isOk = true;
        } else {
            isOk = false;
            if(heard.includes(distractor)) {
                advice = `"${distractor}" に聞こえました。LとRの違いに注意して！`;
            } else {
                advice = `AIには "${heard}" と聞こえました。`;
            }
        }
        
        checkPronunciation({ heard: heard, correct: isOk, advice: advice });
        
        // Web Speechの終了通知（UI側へ）
        if(typeof stopRecordingInternal === 'function') stopRecordingInternal();
    };

    webRecognition.onerror = (event) => {
        alert("Web Speech Error: " + event.error);
        if(typeof stopRecordingInternal === 'function') stopRecordingInternal();
    };

    webRecognition.onend = () => {
        // 自然に終了した場合もUIを停止状態に戻す
        if(isRecording && typeof stopRecordingInternal === 'function') {
            stopRecordingInternal();
        }
    };

    webRecognition.start();
}

function stopWebSpeech() {
    if(webRecognition) webRecognition.stop();
}