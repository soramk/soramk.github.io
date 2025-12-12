/**
 * 18_ios_mic_fix.js (v5: 根本解決・インターセプト版)
 * ブラウザの標準API (getUserMedia, AudioContext) をプロキシ(乗っ取り)し、
 * 生成された全てのリソースを監視・管理下におきます。
 * これにより、変数の管理漏れに関係なく、ホームに戻った瞬間に確実に全リソースを物理切断します。
 */

(function() {
    // --- 1. リソース管理リスト ---
    const activeStreams = new Set();       // 稼働中のマイク/カメラストリーム
    const activeAudioContexts = new Set(); // 稼働中のオーディオエンジン
    const activeRecognitions = new Set();  // 稼働中の音声認識

    // --- 2. getUserMedia (マイク/カメラ取得) の乗っ取り ---
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

        navigator.mediaDevices.getUserMedia = async function(constraints) {
            console.log("[iOS Fix] Intercepting getUserMedia request...");
            
            try {
                // 本物の処理を実行
                const stream = await originalGetUserMedia(constraints);
                
                // 取得できたストリームを監視リストに追加
                activeStreams.add(stream);
                
                // ストリームが（自然に）停止したらリストから外すイベントを登録
                stream.getTracks().forEach(track => {
                    track.addEventListener('ended', () => {
                        if (stream.getTracks().every(t => t.readyState === 'ended')) {
                            activeStreams.delete(stream);
                        }
                    });
                });

                return stream;
            } catch (err) {
                throw err;
            }
        };
    }

    // --- 3. AudioContext (音響エンジン) の乗っ取り ---
    const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
    if (OriginalAudioContext) {
        window.AudioContext = window.webkitAudioContext = function(options) {
            const ctx = new OriginalAudioContext(options);
            activeAudioContexts.add(ctx);
            
            // 閉じた時の処理
            const originalClose = ctx.close;
            ctx.close = async function() {
                activeAudioContexts.delete(ctx);
                return originalClose.apply(ctx, arguments);
            };
            
            return ctx;
        };
    }

    // --- 4. SpeechRecognition (音声認識) の乗っ取り ---
    const OriginalRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (OriginalRecognition) {
        window.SpeechRecognition = window.webkitSpeechRecognition = function() {
            const recognition = new OriginalRecognition();
            const originalStart = recognition.start;
            
            recognition.start = function() {
                activeRecognitions.add(recognition);
                originalStart.apply(recognition, arguments);
            };
            
            // 終了イベントでリストから削除
            recognition.addEventListener('end', () => activeRecognitions.delete(recognition));
            recognition.addEventListener('error', () => activeRecognitions.delete(recognition));
            
            return recognition;
        };
    }


    // --- 5. 処刑執行人 (全停止処理) ---
    function killAllAudioResources() {
        console.log("💥 [iOS Fix] KILLING ALL AUDIO RESOURCES 💥");

        // A. ストリームの完全停止
        activeStreams.forEach(stream => {
            try {
                stream.getTracks().forEach(track => {
                    track.stop();        // 物理停止
                    track.enabled = false; // 無効化
                });
            } catch(e) { console.error(e); }
        });
        activeStreams.clear(); // リストクリア

        // B. AudioContextの強制閉鎖
        // iOSでは suspend だけでなく close しないとアイコンが消えないことがある
        activeAudioContexts.forEach(ctx => {
            try {
                if (ctx.state !== 'closed') {
                    ctx.close(); // 完全閉鎖
                }
            } catch(e) { console.error(e); }
        });
        activeAudioContexts.clear();

        // C. 音声認識の中断
        activeRecognitions.forEach(rec => {
            try { rec.abort(); } catch(e) {}
        });
        activeRecognitions.clear();

        // D. 念のための既存変数クリア (アプリ側のロジック用)
        if (window.currentStream) window.currentStream = null;
        if (window.mediaRecorder) window.mediaRecorder = null;
        if (typeof window.isRecording !== 'undefined') window.isRecording = false;

        // UIリセット
        const btn = document.getElementById('rec-btn');
        if (btn) {
            btn.classList.remove('recording', 'processing');
            btn.innerText = "🎤 Start";
        }
    }

    // --- 6. イベント監視 ---
    
    // ページが見えなくなったら即実行
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            killAllAudioResources();
        }
    });

    // iOS Safari特有のイベント
    window.addEventListener('pagehide', killAllAudioResources);
})();