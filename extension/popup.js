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
chrome.runtime.sendMessage({ action: 'getStatus' }, (res) => {
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
    
    // Save settings
    chrome.storage.local.set({
      lastCandidate: candidate,
      lastRole: role,
      lastLanguage: language,
    });
    
    // Start capture
    chrome.runtime.sendMessage({
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
  chrome.runtime.sendMessage({ action: 'stopCapture' }, (res) => {
    if (res?.error) {
      showError(res.error);
      return;
    }
    showIdle();
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

// Create interview record in Supabase via Edge Function
async function createInterview(candidateName, role, keys) {
  // For MVP: create via direct Supabase insert using anon key
  // TODO: use proper auth flow
  const res = await fetch(`${SUPABASE_URL}/rest/v1/interviews`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      candidate_name: candidateName,
      status: 'active',
      started_at: new Date().toISOString(),
    }),
  });
  
  if (!res.ok) {
    // Fallback: use existing API route
    const apiRes = await fetch(`${DASHBOARD_URL}/api/interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': keys.internalApiKey,
      },
      body: JSON.stringify({ candidateName, role }),
    });
    
    if (!apiRes.ok) throw new Error('Failed to create interview');
    const data = await apiRes.json();
    return data.id;
  }
  
  const [interview] = await res.json();
  return interview.id;
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
