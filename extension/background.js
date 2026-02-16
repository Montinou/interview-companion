// Interview Companion — Background Service Worker (Manifest V3)
// Handles tabCapture stream ID generation and offscreen document management

const OFFSCREEN_DOCUMENT = 'offscreen.html';

// State
let isRecording = false;
let activeTabId = null;

// Ensure offscreen document exists
async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT)]
  });
  if (contexts.length > 0) return;
  
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT,
    reasons: ['USER_MEDIA'],
    justification: 'Audio capture and mixing for interview transcription'
  });
}

// Handle messages from popup and offscreen
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'startCapture') {
    handleStartCapture(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true; // async
  }
  
  if (msg.action === 'stopCapture') {
    handleStopCapture().then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  
  if (msg.action === 'getStatus') {
    sendResponse({ isRecording, activeTabId });
    return false;
  }
});

async function handleStartCapture({ interviewId, config }) {
  if (isRecording) throw new Error('Already recording');
  
  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');
  
  activeTabId = tab.id;
  
  // Get tab capture stream ID
  const streamId = await chrome.tabCapture.getMediaStreamId({
    targetTabId: tab.id
  });
  
  // Create offscreen document for audio processing
  await ensureOffscreen();
  
  // Send stream ID to offscreen document to start capture
  chrome.runtime.sendMessage({
    action: 'offscreen:startCapture',
    streamId,
    interviewId,
    config: {
      deepgramApiKey: config.deepgramApiKey,
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
      internalApiKey: config.internalApiKey,
      language: config.language || 'en',
      ...config
    }
  });
  
  isRecording = true;
  
  // Update badge
  chrome.action.setBadgeText({ text: 'REC' });
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  
  return { ok: true, tabId: tab.id };
}

async function handleStopCapture() {
  if (!isRecording) throw new Error('Not recording');
  
  chrome.runtime.sendMessage({ action: 'offscreen:stopCapture' });
  
  isRecording = false;
  activeTabId = null;
  
  chrome.action.setBadgeText({ text: '' });
  
  return { ok: true };
}
