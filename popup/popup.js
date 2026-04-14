// ScreenTutorial — Popup Script

const viewIdle      = document.getElementById('view-idle');
const viewRecording = document.getElementById('view-recording');
const viewDone      = document.getElementById('view-done');
const titleInput    = document.getElementById('title');
const btnStart      = document.getElementById('btn-start');
const btnStop       = document.getElementById('btn-stop');
const btnEditor     = document.getElementById('btn-editor');
const btnNew        = document.getElementById('btn-new');
const stepCount     = document.getElementById('step-count');
const stepCountDone = document.getElementById('step-count-done');

let countInterval = null;

// ── View switching ──────────────────────────────────────────────────────────

function showView(name) {
  viewIdle.hidden      = name !== 'idle';
  viewRecording.hidden = name !== 'recording';
  viewDone.hidden      = name !== 'done';
}

// ── Init ────────────────────────────────────────────────────────────────────

browser.runtime.sendMessage({ type: 'GET_STATUS' }).then(function (s) {
  if (s.recording) {
    showView('recording');
    stepCount.textContent = s.stepCount;
    pollStepCount();
  } else if (s.stepCount > 0) {
    showView('done');
    stepCountDone.textContent = s.stepCount;
  } else {
    showView('idle');
  }
});

function pollStepCount() {
  if (countInterval) clearInterval(countInterval);
  countInterval = setInterval(function () {
    browser.runtime.sendMessage({ type: 'GET_STATUS' }).then(function (s) {
      if (!s.recording) { clearInterval(countInterval); return; }
      stepCount.textContent = s.stepCount;
    });
  }, 1000);
}

// ── Start ───────────────────────────────────────────────────────────────────

btnStart.addEventListener('click', function () {
  var title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    titleInput.style.borderColor = '#e74c3c';
    return;
  }
  browser.runtime.sendMessage({ type: 'START_RECORDING', title: title }).then(function () {
    showView('recording');
    stepCount.textContent = '0';
    pollStepCount();
  });
});

// ── Stop ────────────────────────────────────────────────────────────────────

btnStop.addEventListener('click', function () {
  browser.runtime.sendMessage({ type: 'STOP_RECORDING' }).then(function (res) {
    if (countInterval) clearInterval(countInterval);
    showView('done');
    stepCountDone.textContent = res.stepCount;
  });
});

// ── Editor ──────────────────────────────────────────────────────────────────

btnEditor.addEventListener('click', function () {
  browser.tabs.create({ url: browser.runtime.getURL('editor/editor.html') });
  window.close();
});

// ── New ─────────────────────────────────────────────────────────────────────

btnNew.addEventListener('click', function () {
  browser.runtime.sendMessage({ type: 'RESET' }).then(function () {
    titleInput.value = '';
    showView('idle');
  });
});

// ── Validation reset ────────────────────────────────────────────────────────

titleInput.addEventListener('input', function () {
  titleInput.style.borderColor = '';
});
