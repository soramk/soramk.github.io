/**
 * 3_core_logic.js (iOS Native Support Version)
 * 録音の開始・停止、APIへの送信、結果の処理を行う中核ロジック。
 * iOS Safariの仕様（バックグラウンド時の挙動、AudioContextの制限）に
 * 外部パッチなしでネイティブ対応しています。
 */

// グローバル変数（状態管理用）
window.isRecording = false;
window.mediaRecorder = null;
window.audioChunks = [];
window.currentStream = null;
window.userAudioBlob = null; // 録音データを保持（再生・送信に使用）

// --- メイン: 録音ボタンの動作 ---
async function toggleRecord() {
    const btn = document.getElementById('rec-btn');
    const feedback = document.getElementById('feedback-area');

    // 1. 録音停止処理
    if (window.isRecording) {
        stopRecordingProcess();
        return;
    }

    // 2. 録音開始処理
    // iOS対策: ユーザーアクション(Click)内で必ずAudioContextを操作する
    if (!window.audioCtx) {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        window.audioCtx = new window.AudioContext();
    }
    // サスペンド状態なら再開させる
    if (window.audioCtx.state === 'suspended') {
        await window.audioCtx.resume();
    }

    feedback.innerText = "Listening...";
    feedback.className = "feedback";
    btn.classList.add('recording');
    btn.innerText = "⏹ Stop";
    
    // 既存の再生ボタンを隠す
    const replayBtn = document.getElementById('replay-user-btn');
    if(replayBtn) replayBtn.style.display = 'none';
    const overlayBtn = document.getElementById('overlay-btn');
    if(overlayBtn) overlayBtn.style.display = 'none';

    window.audioChunks = [];
    window.isRecording = true;

    try {
        // マイク取得
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        window.currentStream = stream;

        // ビジュアライザー起動 (1_audio_visuals.js)
        if (typeof setupVisualizer === 'function') {
            setupVisualizer(stream);
        }

        // MediaRecorder設定 (Safari互換性のためmimeType指定なしを推奨、自動判別に任せる)
        const options = {};
        // iOS Safariは mp4/aac か wav が基本だが、指定しないのが一番安全
        
        window.mediaRecorder = new MediaRecorder(stream, options);

        window.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) window.audioChunks.push(e.data);
        };

        window.mediaRecorder.onstop = async () => {
            // 録音終了後の処理
            handleRecordingStop();
        };

        window.mediaRecorder.start();

    } catch (err) {
        console.error("Mic Access Error:", err);
        alert("マイクにアクセスできませんでした。\n設定でブラウザのマイク権限を確認してください。");
        stopRecordingProcess(true); // 強制リセット
    }
}

// --- 内部関数: 録音停止プロセス ---
function stopRecordingProcess(forceReset = false) {
    const btn = document.getElementById('rec-btn');
    
    window.isRecording = false;
    btn.classList.remove('recording');
    btn.innerText = "🎤 Start"; // 一旦戻す、処理中はProcessingになる

    // Recorder停止
    if (window.mediaRecorder && window.mediaRecorder.state !== 'inactive') {
        window.mediaRecorder.stop();
    }

    // マイクの物理停止 (iOSのオレンジ点灯を消すため)
    if (window.currentStream) {
        window.currentStream.getTracks().forEach(track => track.stop());
        window.currentStream = null;
    }

    // 強制リセット時（エラー時など）
    if (forceReset) {
        const feedback = document.getElementById('feedback-area');
        if(feedback) feedback.innerText = "Ready";
    }
}

// --- 内部関数: 録音データ確定後の処理 ---
async function handleRecordingStop() {
    // 録音データ生成
    // iOS Safari対策: typeを指定せずブラウザのデフォルトに任せるのが安全
    const blob = new Blob(window.audioChunks, { type: window.mediaRecorder.mimeType || 'audio/webm' });
    window.userAudioBlob = blob; // 保存（再生用）

    // UI更新
    const btn = document.getElementById('rec-btn');
    const feedback = document.getElementById('feedback-area');
    
    btn.classList.remove('recording');
    btn.classList.add('processing'); // 処理中表示
    btn.innerText = "⏳ Judging...";
    
    // 再生ボタン表示
    const replayBtn = document.getElementById('replay-user-btn');
    if(replayBtn) {
        replayBtn.style.display = 'block';
        replayBtn.onclick = () => {
            const audio = new Audio(URL.createObjectURL(blob));
            audio.play();
        };
    }

    // 音声認識・採点処理へ (4_api_client.jsへ委譲)
    if (typeof processAudioWithAI === 'function') {
        await processAudioWithAI(blob);
    } else {
        console.error("AI Processor not found.");
        feedback.innerText = "Error: AI module missing.";
        btn.classList.remove('processing');
        btn.innerText = "🎤 Start";
    }
}

// --- API処理完了後のコールバック (4_api_client.jsから呼ばれる) ---
function updateRecordButtonUI() {
    const btn = document.getElementById('rec-btn');
    if(btn) {
        btn.classList.remove('recording');
        btn.classList.remove('processing');
        btn.innerText = "🎤 Start";
    }
}

// --- iOS専用: バックグラウンド移行時の完全クリーンアップ ---
// 18_ios_mic_fix.js の役割をここに取り込みます
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        // バックグラウンドに行ったら、録音中であろうとなかろうとリソースを破棄
        forceCleanupAudio();
    }
});

function forceCleanupAudio() {
    console.log("[Core] App hidden. Releasing audio resources...");

    // 1. 録音停止
    if (window.isRecording) {
        stopRecordingProcess(true);
    }

    // 2. マイクの念入りな停止
    if (window.currentStream) {
        window.currentStream.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
        });
        window.currentStream = null;
    }

    // 3. AudioContextの一時停止 (closeではなくsuspendで再開可能にしておく)
    // ※ iOSでは close してしまうと再生成が必要になるが、
    // toggleRecord 内で new AudioContext() を呼ぶガードを入れているので close でも良い。
    // ここでは安全に suspend に留める（オレンジ点が消えない場合は close に変更可）
    if (window.audioCtx && window.audioCtx.state === 'running') {
        window.audioCtx.suspend();
    }
    
    // 4. マスコットやオーバーレイ用Contextも停止
    if (window.overlayCtx) {
        window.overlayCtx.suspend(); 
    }
}