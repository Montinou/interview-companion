// Interview Companion — Offscreen Document
// Handles: audio capture, mixing, Deepgram WebSocket, chunk dispatch
//
// Architecture:
//   tabCapture (tab audio = candidate) + getUserMedia (mic = host)
//   → AudioContext mix → MediaRecorder → Deepgram WebSocket
//   → transcript chunks → POST to Supabase Edge Function (analyze-chunk)

let audioContext = null;
let mediaRecorder = null;
let deepgramSocket = null;
let interviewId = null;
let config = null;
let micStream = null;
let tabStream = null;

// Buffer for accumulating transcript before sending to analysis
let transcriptBuffer = [];
let bufferTimer = null;
const BUFFER_WINDOW_MS = 15000; // 15s buffer window
const MIN_WORDS = 5; // minimum words before analyzing

// Listen for messages from background service worker
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== 'offscreen') return;
  
  if (msg.action === 'startCapture') {
    startCapture(msg.streamId, msg.interviewId, msg.config);
  }
  if (msg.action === 'stopCapture') {
    stopCapture();
  }
});

async function startCapture(streamId, intId, cfg) {
  interviewId = intId;
  config = cfg;
  
  try {
    // 1. Capture tab audio (candidate voice from Meet/Zoom/Teams)
    tabStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      }
    });
    
    // 2. Capture microphone (host voice) with AEC
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    });
    
    // 3. Mix both streams with AudioContext
    audioContext = new AudioContext({ sampleRate: 48000 });
    const dest = audioContext.createMediaStreamDestination();
    
    const tabSource = audioContext.createMediaStreamSource(tabStream);
    const micSource = audioContext.createMediaStreamSource(micStream);
    
    tabSource.connect(dest);
    micSource.connect(dest);
    
    // 4. Connect to Deepgram WebSocket
    connectDeepgram(config.deepgramApiKey, config.language);
    
    // 5. Record mixed audio → send to Deepgram
    mediaRecorder = new MediaRecorder(dest.stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && deepgramSocket?.readyState === WebSocket.OPEN) {
        deepgramSocket.send(e.data);
      }
    };
    
    mediaRecorder.start(250); // 250ms chunks
    
    console.log('[IC] Capture started — tab + mic → Deepgram');
  } catch (err) {
    console.error('[IC] Capture start error:', err);
    chrome.runtime.sendMessage({
      target: 'background',
      action: 'captureError',
      error: err.message,
    });
  }
}

function connectDeepgram(apiKey, language) {
  const params = new URLSearchParams({
    model: 'nova-3',
    language: language || 'en',
    smart_format: 'true',
    diarize: 'true',
    interim_results: 'false',
    utterance_end_ms: '1500',
    vad_events: 'true',
    encoding: 'opus',
    container: 'webm',
    sample_rate: '48000',
  });
  
  const url = `wss://api.deepgram.com/v1/listen?${params}`;
  
  deepgramSocket = new WebSocket(url, ['token', apiKey]);
  
  deepgramSocket.onopen = () => {
    console.log('[IC] Deepgram WebSocket connected');
  };
  
  deepgramSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'Results' && data.is_final) {
      const alt = data.channel?.alternatives?.[0];
      if (!alt?.transcript) return;
      
      // Group words by speaker (diarization)
      const words = alt.words || [];
      const segments = groupBySpeaker(words);
      
      for (const segment of segments) {
        const chunk = {
          speaker: `speaker_${segment.speaker}`,
          text: segment.text,
          timestamp: new Date().toISOString(),
          confidence: segment.confidence,
        };
        
        // Add to buffer for batched AI analysis
        transcriptBuffer.push(chunk);
      }
      
      // Reset buffer timer — when it fires, sends accumulated chunks for analysis
      resetBufferTimer();
    }
  };
  
  deepgramSocket.onerror = (err) => {
    console.error('[IC] Deepgram error:', err);
    chrome.runtime.sendMessage({
      target: 'background',
      action: 'captureError',
      error: 'Deepgram connection error',
    });
  };
  
  deepgramSocket.onclose = (event) => {
    console.log('[IC] Deepgram closed:', event.code, event.reason);
  };
}

// Group consecutive words by speaker
function groupBySpeaker(words) {
  if (!words.length) return [];
  
  const segments = [];
  let current = { speaker: words[0].speaker, words: [words[0]], confidence: words[0].confidence };
  
  for (let i = 1; i < words.length; i++) {
    if (words[i].speaker === current.speaker) {
      current.words.push(words[i]);
      current.confidence = Math.min(current.confidence, words[i].confidence);
    } else {
      segments.push({
        speaker: current.speaker,
        text: current.words.map(w => w.punctuated_word || w.word).join(' '),
        confidence: current.confidence,
      });
      current = { speaker: words[i].speaker, words: [words[i]], confidence: words[i].confidence };
    }
  }
  
  segments.push({
    speaker: current.speaker,
    text: current.words.map(w => w.punctuated_word || w.word).join(' '),
    confidence: current.confidence,
  });
  
  return segments;
}

// Send chunk to analyze-chunk Edge Function (saves transcript + generates insight)
async function sendToAnalyze(chunk) {
  try {
    const res = await fetch(`${config.supabaseUrl}/functions/v1/analyze-chunk`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.supabaseAnonKey}`,
        'x-internal-key': config.internalApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ interviewId, chunk }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[IC] analyze-chunk error:', err);
    }
  } catch (err) {
    console.error('[IC] Failed to send chunk:', err);
  }
}

// Buffer timer — flushes accumulated chunks for analysis
function resetBufferTimer() {
  if (bufferTimer) clearTimeout(bufferTimer);
  bufferTimer = setTimeout(flushBuffer, BUFFER_WINDOW_MS);
}

function flushBuffer() {
  if (transcriptBuffer.length === 0) return;
  
  // Count total words in buffer
  const totalWords = transcriptBuffer.reduce((sum, c) => sum + c.text.split(' ').length, 0);
  if (totalWords < MIN_WORDS) return;
  
  const chunks = [...transcriptBuffer];
  transcriptBuffer = [];
  
  // Send each chunk individually (Edge Function saves transcript + analyzes)
  // The last chunk gets the full accumulated context from previous insights
  // This is intentional: each chunk gets its own transcript row + insight
  for (const chunk of chunks) {
    sendToAnalyze(chunk);
  }
}

function stopCapture() {
  console.log('[IC] Stopping capture...');
  
  // Flush remaining buffer
  flushBuffer();
  
  // Stop MediaRecorder
  if (mediaRecorder?.state !== 'inactive') {
    mediaRecorder?.stop();
  }
  mediaRecorder = null;
  
  // Close Deepgram
  if (deepgramSocket?.readyState === WebSocket.OPEN) {
    deepgramSocket.close();
  }
  deepgramSocket = null;
  
  // Stop audio tracks
  tabStream?.getTracks().forEach(t => t.stop());
  micStream?.getTracks().forEach(t => t.stop());
  tabStream = null;
  micStream = null;
  
  // Close AudioContext
  audioContext?.close();
  audioContext = null;
  
  // Clear buffer
  transcriptBuffer = [];
  if (bufferTimer) clearTimeout(bufferTimer);
  
  interviewId = null;
  config = null;
  
  console.log('[IC] Capture stopped');
}
