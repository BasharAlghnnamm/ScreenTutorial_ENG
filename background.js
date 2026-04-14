// ScreenTutorial — Background Script
// Manages recording state, screenshot capture, and step storage.

const state = {
  recording: false,
  title: '',
  steps: [],
  startTime: null
};

let lastClickTime = 0;
let lastNavUrl = '';
let lastNavTime = 0;

// ── Message router ──────────────────────────────────────────────────────────

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {

    // Lightweight status for the popup (no screenshot payloads)
    case 'GET_STATUS':
      sendResponse({
        recording: state.recording,
        title: state.title,
        stepCount: state.steps.length
      });
      return false;

    // Full state for the editor
    case 'GET_STATE':
      sendResponse({
        recording: state.recording,
        title: state.title,
        steps: state.steps
      });
      return false;

    case 'START_RECORDING':
      state.recording = true;
      state.title = message.title || 'Tutoriel sans titre';
      state.steps = [];
      state.startTime = Date.now();
      lastClickTime = 0;
      lastNavUrl = '';
      lastNavTime = 0;
      updateBadge();
      notifyContentScripts({ type: 'RECORDING_STATE', recording: true });
      captureInitialPage().then(() => sendResponse({ success: true }));
      return true; // async

    case 'STOP_RECORDING':
      state.recording = false;
      updateBadge();
      notifyContentScripts({ type: 'RECORDING_STATE', recording: false });
      sendResponse({ success: true, stepCount: state.steps.length });
      return false;

    case 'ACTION':
      if (!state.recording) { sendResponse({ success: false }); return false; }
      if (message.action === 'click') lastClickTime = Date.now();

      captureScreenshot().then(screenshot => {
        state.steps.push({
          id: uid(),
          action: message.action,
          description: message.description,
          screenshot,
          url: message.url,
          timestamp: Date.now()
        });
        sendResponse({ success: true });
      }).catch(() => {
        state.steps.push({
          id: uid(),
          action: message.action,
          description: message.description,
          screenshot: null,
          url: message.url,
          timestamp: Date.now()
        });
        sendResponse({ success: true });
      });
      return true; // async

    case 'UPDATE_STEP': {
      const s = state.steps.find(s => s.id === message.stepId);
      if (s && message.description !== undefined) s.description = message.description;
      sendResponse({ success: true });
      return false;
    }

    case 'DELETE_STEP':
      state.steps = state.steps.filter(s => s.id !== message.stepId);
      sendResponse({ success: true });
      return false;

    case 'REORDER_STEPS':
      state.steps = message.order
        .map(id => state.steps.find(s => s.id === id))
        .filter(Boolean);
      sendResponse({ success: true });
      return false;

    case 'UPDATE_TITLE':
      state.title = message.title;
      sendResponse({ success: true });
      return false;

    case 'RESET':
      state.recording = false;
      state.title = '';
      state.steps = [];
      state.startTime = null;
      lastClickTime = 0;
      updateBadge();
      sendResponse({ success: true });
      return false;
  }
});

// ── Navigation tracking ─────────────────────────────────────────────────────

browser.webNavigation.onCompleted.addListener(async (details) => {
  if (!state.recording || details.frameId !== 0) return;
  if (!details.url.startsWith('http')) return;

  // A recent click already covers this navigation
  if (Date.now() - lastClickTime < 3000) return;

  // Deduplicate rapid-fire events for the same URL
  if (details.url === lastNavUrl && Date.now() - lastNavTime < 2000) return;
  lastNavUrl = details.url;
  lastNavTime = Date.now();

  try {
    await delay(1500); // let the page render
    if (!state.recording) return;

    const tab = await browser.tabs.get(details.tabId);
    const screenshot = await captureScreenshot();

    state.steps.push({
      id: uid(),
      action: 'navigation',
      description: `Accéder à la page « ${tab.title || hostname(details.url)} »`,
      screenshot,
      url: details.url,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('[ScreenTutorial] navigation capture failed', err);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function captureInitialPage() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !tab.url.startsWith('http')) return;
    await delay(500);
    const screenshot = await captureScreenshot();
    state.steps.push({
      id: uid(),
      action: 'navigation',
      description: `Page de départ : « ${tab.title || hostname(tab.url)} »`,
      screenshot,
      url: tab.url,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('[ScreenTutorial] initial capture failed', err);
  }
}

function captureScreenshot() {
  return browser.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 85 });
}

function updateBadge() {
  browser.browserAction.setBadgeText({ text: state.recording ? 'REC' : '' });
  if (state.recording) {
    browser.browserAction.setBadgeBackgroundColor({ color: '#e74c3c' });
  }
}

async function notifyContentScripts(message) {
  const tabs = await browser.tabs.query({});
  for (const tab of tabs) {
    browser.tabs.sendMessage(tab.id, message).catch(() => {});
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function hostname(url) {
  try { return new URL(url).hostname; } catch { return url; }
}
