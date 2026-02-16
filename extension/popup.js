// Interview Companion — Popup Controller

const DASHBOARD_URL = 'https://interview-companion.triqual.dev';
const SUPABASE_URL = 'https://llcnkvnrsaszxwpiufbi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsY25rdm5yc2Fzenh3cGl1ZmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjk4MzMsImV4cCI6MjA4NjgwNTgzM30.j1vvokyrJLEyoVMoaaIbjPVb93f6fwWRW8YTEZk7CqU';

// DOM elements
const statusEl = document.getElementById('status');
const statusText = document.getElementById('status-text');
const setupForm = document.getElementById('setup-form');
const recordingPanel = document.getElementById('recording-panel');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnDashboard = document.getElementById('btn-dashboard');
const errorMsg = document.getElementById('error-msg');
const candidateInput = document.getElementById('candidate');
const roleInput = document.getElementById('role');
const languageSelect = document.getElementById('language');

// Load saved settings
chrome.storage.local.get(['deepgramApiKey', 'internalApiKey', 'lastCandidate', 'lastRole', 'lastLanguage'], (data) => {
  if (data.lastCandidate) candidateInput.value = data.lastCandidate;
  if (data.lastRole) roleInput.value = data.lastRole;
  if (data.lastLanguage) languageSelect.value = data.lastLanguage;
});

// Enable start button when candidate name is filled
candidateInput.addEventListener('input', () => {
  btnStart.disabled = !candidateInput.value.trim();
});

// Check if already recording
chrome.runtime.sendMessage({ target: 'background', action: 'getStatus' }, (res) => {
  if (res?.isRecording) {
    showRecording();
  }
});

// Start recording
btnStart.addEventListener('click', async () => {
  const candidate = candidateInput.value.trim();
  const role = roleInput.value.trim();
  const language = languageSelect.value;
  
  if (!candidate) {
    showError('Enter candidate name');
    return;
  }
  
  btnStart.disabled = true;
  btnStart.textContent = 'Starting...';
  
  try {
    // Get API keys from storage
    const keys = await getKeys();
    
    // Create interview in Supabase
    const interviewId = await createInterview(candidate, role, keys);
    
    // Save settings + current interview ID
    chrome.storage.local.set({
      lastCandidate: candidate,
      lastRole: role,
      lastLanguage: language,
      currentInterviewId: interviewId,
    });
    
    // Start capture
    chrome.runtime.sendMessage({
      target: 'background',
      action: 'startCapture',
      interviewId,
      config: {
        deepgramApiKey: keys.deepgramApiKey,
        supabaseUrl: SUPABASE_URL,
        supabaseAnonKey: SUPABASE_ANON_KEY,
        internalApiKey: keys.internalApiKey,
        language,
      }
    }, (res) => {
      if (res?.error) {
        showError(res.error);
        btnStart.disabled = false;
        btnStart.textContent = 'Start Recording';
        return;
      }
      
      showRecording();
      
      // Open dashboard
      chrome.tabs.create({ url: `${DASHBOARD_URL}/dashboard/hud?interviewId=${interviewId}` });
    });
  } catch (err) {
    showError(err.message);
    btnStart.disabled = false;
    btnStart.textContent = 'Start Recording';
  }
});

// Stop recording
btnStop.addEventListener('click', async () => {
  btnStop.disabled = true;
  btnStop.textContent = '⏹ Stopping...';
  
  // Get the current interview ID from storage
  chrome.storage.local.get(['currentInterviewId', 'internalApiKey'], async (data) => {
    // Stop audio capture first
    chrome.runtime.sendMessage({ target: 'background', action: 'stopCapture' }, async (res) => {
      if (res?.error) {
        showError(res.error);
        btnStop.disabled = false;
        btnStop.textContent = '⏹ Stop Recording';
        return;
      }
      
      // End interview + generate scorecard (separate calls)
      if (data.currentInterviewId && data.internalApiKey) {
        const headers = {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'x-internal-key': data.internalApiKey,
          'Content-Type': 'application/json',
        };
        const body = JSON.stringify({ interviewId: data.currentInterviewId });
        
        try {
          // 1. Mark interview as completed
          await fetch(`${SUPABASE_URL}/functions/v1/end-interview`, {
            method: 'POST', headers, body,
          });
          
          // 2. Generate scorecard (separate call — Edge Functions can't call each other reliably)
          fetch(`${SUPABASE_URL}/functions/v1/generate-scorecard`, {
            method: 'POST', headers, body,
          }).catch(err => console.error('Scorecard generation error:', err));
        } catch (err) {
          console.error('Failed to end interview:', err);
        }
      }
      
      chrome.storage.local.remove(['currentInterviewId']);
      showIdle();
    });
  });
});

// Open dashboard
btnDashboard.addEventListener('click', () => {
  chrome.tabs.create({ url: `${DASHBOARD_URL}/dashboard` });
});

// Get API keys from storage or prompt setup
async function getKeys() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['deepgramApiKey', 'internalApiKey'], (data) => {
      if (data.deepgramApiKey && data.internalApiKey) {
        resolve(data);
      } else {
        // First time — prompt for keys
        // In production, these come from the server after auth
        const deepgramKey = prompt('Enter Deepgram API key (one-time setup):');
        const internalKey = prompt('Enter Internal API key (one-time setup):');
        
        if (!deepgramKey || !internalKey) {
          reject(new Error('API keys required'));
          return;
        }
        
        chrome.storage.local.set({ deepgramApiKey: deepgramKey, internalApiKey: internalKey });
        resolve({ deepgramApiKey: deepgramKey, internalApiKey: internalKey });
      }
    });
  });
}

// Create interview record via Edge Function
async function createInterview(candidateName, role, keys) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-interview`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'x-internal-key': keys.internalApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      candidateName,
      role,
      language: languageSelect.value,
    }),
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Failed to create interview');
  }
  
  const data = await res.json();
  return data.interview.id;
}

// UI state
function showRecording() {
  statusEl.className = 'status-badge recording';
  statusText.textContent = 'Recording...';
  setupForm.classList.add('hidden');
  recordingPanel.classList.remove('hidden');
}

function showIdle() {
  statusEl.className = 'status-badge idle';
  statusText.textContent = 'Ready';
  setupForm.classList.remove('hidden');
  recordingPanel.classList.add('hidden');
  btnStart.disabled = !candidateInput.value.trim();
  btnStart.textContent = 'Start Recording';
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = 'block';
  setTimeout(() => { errorMsg.style.display = 'none'; }, 5000);
}
