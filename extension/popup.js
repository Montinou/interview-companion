// Interview Companion — Popup Controller
// Auth: Clerk via dashboard cookies. No hardcoded keys.

const DASHBOARD_URL = 'https://interview-companion.triqual.dev';

// Runtime config — loaded from server after auth
let CONFIG = null;

// DOM elements
const statusEl = document.getElementById('status');
const statusText = document.getElementById('status-text');
const setupForm = document.getElementById('setup-form');
const recordingPanel = document.getElementById('recording-panel');
const authPanel = document.getElementById('auth-panel');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnDashboard = document.getElementById('btn-dashboard');
const btnLogin = document.getElementById('btn-login');
const errorMsg = document.getElementById('error-msg');
const candidateInput = document.getElementById('candidate');
const roleInput = document.getElementById('role');
const languageSelect = document.getElementById('language');
const userNameEl = document.getElementById('user-name');

// On popup open: check auth + load config
init();

async function init() {
  // Check if already recording
  chrome.runtime.sendMessage({ target: 'background', action: 'getStatus' }, (res) => {
    if (res?.isRecording) {
      showRecording();
    }
  });

  // Load saved settings
  chrome.storage.local.get(['lastCandidate', 'lastRole', 'lastLanguage'], (data) => {
    if (data.lastCandidate) candidateInput.value = data.lastCandidate;
    if (data.lastRole) roleInput.value = data.lastRole;
    if (data.lastLanguage) languageSelect.value = data.lastLanguage;
    updateStartButton();
  });

  // Fetch config from server (auth check)
  await loadConfig();
}

async function loadConfig() {
  try {
    const res = await fetch(`${DASHBOARD_URL}/api/extension/config`, {
      credentials: 'include', // sends Clerk cookies
    });

    if (res.status === 401) {
      showAuth();
      return;
    }

    if (!res.ok) {
      showError('Failed to connect to server');
      return;
    }

    const data = await res.json();
    CONFIG = data.config;

    // Show user info
    if (data.user?.name) {
      userNameEl.textContent = data.user.name;
      userNameEl.style.display = 'block';
    }

    showSetup();
  } catch (err) {
    showError('Cannot reach server. Check your connection.');
    console.error('Config fetch error:', err);
  }
}

// Enable start button when candidate name is filled + config loaded
candidateInput.addEventListener('input', updateStartButton);

function updateStartButton() {
  btnStart.disabled = !candidateInput.value.trim() || !CONFIG;
}

// Start recording
btnStart.addEventListener('click', async () => {
  const candidate = candidateInput.value.trim();
  const role = roleInput.value.trim();
  const language = languageSelect.value;

  if (!candidate || !CONFIG) return;

  btnStart.disabled = true;
  btnStart.textContent = 'Starting...';

  try {
    // Create interview in Supabase
    const interviewId = await createInterview(candidate, role);

    // Save settings
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
        deepgramApiKey: CONFIG.deepgramApiKey,
        supabaseUrl: CONFIG.supabaseUrl,
        supabaseAnonKey: CONFIG.supabaseAnonKey,
        internalApiKey: CONFIG.internalApiKey,
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

      // Open dashboard HUD
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

  chrome.storage.local.get(['currentInterviewId'], async (data) => {
    chrome.runtime.sendMessage({ target: 'background', action: 'stopCapture' }, async (res) => {
      if (res?.error) {
        showError(res.error);
        btnStop.disabled = false;
        btnStop.textContent = '⏹ Stop Recording';
        return;
      }

      // End interview + generate scorecard
      if (data.currentInterviewId && CONFIG) {
        const headers = {
          'Authorization': `Bearer ${CONFIG.supabaseAnonKey}`,
          'x-internal-key': CONFIG.internalApiKey,
          'Content-Type': 'application/json',
        };
        const body = JSON.stringify({ interviewId: data.currentInterviewId });

        try {
          await fetch(`${CONFIG.supabaseUrl}/functions/v1/end-interview`, {
            method: 'POST', headers, body,
          });

          // Generate scorecard (separate — Edge Functions can't call each other)
          fetch(`${CONFIG.supabaseUrl}/functions/v1/generate-scorecard`, {
            method: 'POST', headers, body,
          }).catch(err => console.error('Scorecard error:', err));
        } catch (err) {
          console.error('Failed to end interview:', err);
        }
      }

      chrome.storage.local.remove(['currentInterviewId']);
      showIdle();
    });
  });
});

// Login button
btnLogin.addEventListener('click', () => {
  chrome.tabs.create({ url: `${DASHBOARD_URL}/sign-in` });
  // Close popup — user will re-open after logging in
  window.close();
});

// Open dashboard
btnDashboard.addEventListener('click', () => {
  chrome.tabs.create({ url: `${DASHBOARD_URL}/dashboard` });
});

// Create interview record via Edge Function
async function createInterview(candidateName, role) {
  const res = await fetch(`${CONFIG.supabaseUrl}/functions/v1/create-interview`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.supabaseAnonKey}`,
      'x-internal-key': CONFIG.internalApiKey,
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

// UI states
function showAuth() {
  authPanel.classList.remove('hidden');
  setupForm.classList.add('hidden');
  recordingPanel.classList.add('hidden');
  statusEl.className = 'status-badge idle';
  statusText.textContent = 'Login required';
}

function showSetup() {
  authPanel.classList.add('hidden');
  setupForm.classList.remove('hidden');
  recordingPanel.classList.add('hidden');
  statusEl.className = 'status-badge idle';
  statusText.textContent = 'Ready';
  updateStartButton();
}

function showRecording() {
  statusEl.className = 'status-badge recording';
  statusText.textContent = 'Recording...';
  setupForm.classList.add('hidden');
  recordingPanel.classList.remove('hidden');
  authPanel.classList.add('hidden');
}

function showIdle() {
  showSetup();
  btnStart.textContent = 'Start Recording';
  btnStop.disabled = false;
  btnStop.textContent = '⏹ Stop Recording';
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = 'block';
  setTimeout(() => { errorMsg.style.display = 'none'; }, 5000);
}
