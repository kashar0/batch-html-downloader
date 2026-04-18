// popup.js — Batch HTML Downloader Pro v2.0
// Architecture: popup-only (no content script needed), uses chrome.downloads API

// ─── State ────────────────────────────────────────────────────────────────────
let state = {
  running: false,
  paused: false,
  stopped: false,
  downloaded: 0,
  failed: 0,
  failedStreak: 0,
  currentNum: 0,
  startTime: null,
  sessionId: null,
  base: '',
  ext: '.html',
  subfolder: '',
  batchSize: 10,
  maxFailures: 50,
  delay: 200,
};

let settings = {
  autoSwitch: true,
  saveHistory: true,
  smartStop: true,
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const urlInput   = $('urlInput');
const subfolderI = $('subfolder');
const fileExtI   = $('fileExt');
const batchSizeI = $('batchSize');
const maxFailI   = $('maxFail');
const delayI     = $('delay');
const startBtn   = $('startBtn');
const pauseBtn   = $('pauseBtn');
const stopBtn    = $('stopBtn');
const statusPill = $('statusPill');
const statusText = $('statusText');
const logBody    = $('logBody');
const historyList= $('historyList');

// stats
const statDone   = $('statDone');
const statFail   = $('statFail');
const statSpeed  = $('statSpeed');
const statStreak = $('statStreak');
const streakPct  = $('streakPct');
const progressFill= $('progressFill');
const progCurrent= $('progCurrent');
const progEta    = $('progEta');
const metaElapsed= $('metaElapsed');
const metaCurrent= $('metaCurrent');
const metaSession= $('metaSession');

// ─── Tabs ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    $('tab-' + tab.dataset.tab).classList.add('active');
  });
});

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === name);
  });
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  $('tab-' + name).classList.add('active');
}

// ─── Header icon shortcuts ────────────────────────────────────────────────────
$('histBtn').addEventListener('click', () => switchTab('history'));
$('settBtn').addEventListener('click', () => switchTab('settings'));

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'info') {
  const toast = $('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── Status pill ──────────────────────────────────────────────────────────────
function setStatus(text, mode = '') {
  statusText.textContent = text;
  statusPill.className = 'status-pill' + (mode ? ' ' + mode : '');
}

// ─── Log ──────────────────────────────────────────────────────────────────────
const MAX_LOG = 300;
function addLog(filename, status) {
  // Trim log if too long
  while (logBody.children.length >= MAX_LOG) {
    logBody.removeChild(logBody.firstChild);
  }
  const row = document.createElement('div');
  row.className = 'log-row';
  row.id = `log-${filename}`;

  const numEl = document.createElement('span');
  numEl.className = 'log-num';
  numEl.textContent = filename;

  const statEl = document.createElement('span');
  statEl.className = `log-status ${status}`;
  statEl.id = `logst-${filename}`;
  statEl.textContent = status.toUpperCase();

  row.appendChild(numEl);
  row.appendChild(statEl);
  logBody.appendChild(row);
  logBody.scrollTop = logBody.scrollHeight;
}

function updateLog(filename, status) {
  const el = $(`logst-${filename}`);
  if (el) {
    el.className = `log-status ${status}`;
    el.textContent = status.toUpperCase();
  }
}

$('clearLog').addEventListener('click', () => {
  logBody.innerHTML = '';
});

// ─── Stats updater ────────────────────────────────────────────────────────────
let statsTimer;
function startStatsTimer() {
  clearInterval(statsTimer);
  statsTimer = setInterval(updateStats, 800);
}
function stopStatsTimer() {
  clearInterval(statsTimer);
}

function updateStats() {
  statDone.textContent   = state.downloaded;
  statFail.textContent   = state.failed;
  statStreak.textContent = state.failedStreak;

  // speed: files/min
  if (state.startTime && state.downloaded > 0) {
    const elapsed = (Date.now() - state.startTime) / 1000;
    const speed = Math.round((state.downloaded / elapsed) * 60);
    statSpeed.textContent = speed;

    // elapsed display
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    metaElapsed.textContent = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  } else {
    statSpeed.textContent = '—';
  }

  // streak progress bar (inverted: full bar = danger zone)
  const pct = Math.min((state.failedStreak / state.maxFailures) * 100, 100);
  progressFill.style.width = pct + '%';
  streakPct.textContent = Math.round(pct) + '%';

  // color the bar based on streak severity
  if (pct > 80) {
    progressFill.style.background = 'linear-gradient(90deg, #f87171, #ef4444)';
  } else if (pct > 50) {
    progressFill.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
  } else {
    progressFill.style.background = 'linear-gradient(90deg, var(--accent), var(--accent2))';
  }

  metaCurrent.textContent = state.currentNum || '—';
  metaSession.textContent = state.sessionId ? state.sessionId.slice(-6) : '—';
}

// ─── Settings persistence ─────────────────────────────────────────────────────
async function loadSettings() {
  const stored = await chrome.storage.local.get('settings');
  if (stored.settings) Object.assign(settings, stored.settings);
  applyToggles();
}
async function saveSettings() {
  await chrome.storage.local.set({ settings });
}
function applyToggles() {
  setToggle('togAutoSwitch', settings.autoSwitch);
  setToggle('togHistory', settings.saveHistory);
  setToggle('togSmartStop', settings.smartStop);
}
function setToggle(id, val) {
  const el = $(id);
  el.classList.toggle('on', val);
}
['togAutoSwitch', 'togHistory', 'togSmartStop'].forEach(id => {
  $(id).addEventListener('click', () => {
    const key = { togAutoSwitch: 'autoSwitch', togHistory: 'saveHistory', togSmartStop: 'smartStop' }[id];
    settings[key] = !settings[key];
    setToggle(id, settings[key]);
    saveSettings();
    showToast(settings[key] ? 'Setting enabled' : 'Setting disabled');
  });
});

// ─── History ──────────────────────────────────────────────────────────────────
async function loadHistory() {
  const { history = [] } = await chrome.storage.local.get('history');
  return history;
}
async function saveToHistory(entry) {
  if (!settings.saveHistory) return;
  const history = await loadHistory();
  history.unshift(entry);
  // cap at 20 entries
  if (history.length > 20) history.length = 20;
  await chrome.storage.local.set({ history });
  renderHistory(history);
}
async function renderHistory(history) {
  if (!history) history = await loadHistory();
  historyList.innerHTML = '';
  if (!history.length) {
    historyList.innerHTML = '<div class="history-empty">No sessions yet.<br>Completed downloads will appear here.</div>';
    return;
  }
  history.forEach((h, i) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-item-top">
        <div class="history-url">${escText(h.base)}</div>
        <button class="history-del" data-idx="${i}" title="Delete">✕</button>
      </div>
      <div class="history-meta">
        <span>${escText(h.date)}</span>
        <span class="history-ok">✓ ${h.downloaded}</span>
        <span class="history-fail">✗ ${h.failed}</span>
        ${h.subfolder ? `<span>📁 ${escText(h.subfolder)}</span>` : ''}
      </div>
    `;
    // click to reload URL
    item.addEventListener('click', e => {
      if (e.target.classList.contains('history-del')) return;
      urlInput.value = h.startUrl || '';
      subfolderI.value = h.subfolder || '';
      switchTab('download');
      showToast('URL loaded from history', 'info');
    });
    historyList.appendChild(item);
  });

  // delete buttons
  historyList.querySelectorAll('.history-del').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      const h = await loadHistory();
      h.splice(idx, 1);
      await chrome.storage.local.set({ history: h });
      renderHistory(h);
    });
  });
}
function escText(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ─── Validation ───────────────────────────────────────────────────────────────
function parseUrl(raw) {
  const ext = fileExtI.value.trim() || '.html';
  // Match: base + number + ext
  const escaped = ext.replace('.', '\\.');
  const re = new RegExp(`^(.*?)([0-9]+)(${escaped})$`);
  const match = raw.match(re);
  if (!match) return null;
  try { new URL(match[1] + match[2] + match[3]); } catch { return null; }
  return { base: match[1], startNum: parseInt(match[2]), ext: match[3] };
}

// ─── Download single file ─────────────────────────────────────────────────────
function downloadSingle(n, base, ext, subfolder) {
  return new Promise(resolve => {
    const fileUrl = `${base}${n}${ext}`;
    const fname   = subfolder ? `${subfolder}/${n}${ext}` : `${n}${ext}`;

    addLog(fname, 'queued');
    progCurrent.textContent = `File: ${n}${ext}`;

    chrome.downloads.download({ url: fileUrl, filename: fname, saveAs: false }, id => {
      if (chrome.runtime.lastError || !id) {
        updateLog(fname, 'fail');
        resolve(false);
      } else {
        // optimistic done — background.js will refine if needed
        updateLog(fname, 'done');
        resolve(true);
      }
    });
  });
}

// ─── Sleep helper ─────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Wait while paused ────────────────────────────────────────────────────────
async function waitIfPaused() {
  while (state.paused && !state.stopped) {
    await sleep(200);
  }
}

// ─── Main download loop ───────────────────────────────────────────────────────
async function startDownloading(base, startNum, ext, subfolder) {
  let num = startNum;
  state.sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  state.startTime = Date.now();

  startStatsTimer();

  while (state.failedStreak < state.maxFailures && !state.stopped) {
    await waitIfPaused();
    if (state.stopped) break;

    setStatus(`Downloading batch starting at #${num}…`, 'running');

    const batch = [];
    for (let i = 0; i < state.batchSize; i++) {
      batch.push(num + i);
    }

    for (const n of batch) {
      if (state.stopped) break;
      await waitIfPaused();

      state.currentNum = n;
      const ok = await downloadSingle(n, base, ext, subfolder);
      if (ok) {
        state.downloaded++;
        state.failedStreak = 0;
      } else {
        state.failed++;
        state.failedStreak++;
      }

      // delay between files
      if (state.delay > 0 && !state.stopped) {
        await sleep(state.delay);
      }

      // smart stop mid-batch
      if (settings.smartStop && state.failedStreak >= state.maxFailures) break;
    }

    num += state.batchSize;
  }

  // ── Session complete ──
  const endReason = state.stopped
    ? 'Stopped by user'
    : `Auto-stopped after ${state.failedStreak} consecutive failures`;

  setStatus(endReason, state.stopped ? '' : 'done');
  stopStatsTimer();
  updateStats();

  startBtn.disabled = false;
  pauseBtn.disabled = true;
  stopBtn.disabled  = true;
  state.running = false;

  showToast(`Done — ${state.downloaded} files downloaded`, 'success');

  // Save to history
  await saveToHistory({
    base,
    startUrl: urlInput.value.trim(),
    subfolder,
    downloaded: state.downloaded,
    failed: state.failed,
    date: new Date().toLocaleString(),
  });

  progEta.textContent = 'Complete';
}

// ─── Start button ─────────────────────────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  const raw = urlInput.value.trim();
  const parsed = parseUrl(raw);

  if (!parsed) {
    urlInput.classList.add('error');
    setTimeout(() => urlInput.classList.remove('error'), 1500);
    showToast('Invalid URL — must end with a number + extension', 'error');
    return;
  }

  // Reset state
  state.running      = true;
  state.paused       = false;
  state.stopped      = false;
  state.downloaded   = 0;
  state.failed       = 0;
  state.failedStreak = 0;
  state.currentNum   = parsed.startNum;
  state.base         = parsed.base;
  state.ext          = parsed.ext;
  state.subfolder    = subfolderI.value.trim();
  state.batchSize    = Math.max(1, Math.min(50, parseInt(batchSizeI.value) || 10));
  state.maxFailures  = Math.max(5, parseInt(maxFailI.value) || 50);
  state.delay        = Math.max(0, parseInt(delayI.value) || 0);

  logBody.innerHTML  = '';
  updateStats();

  startBtn.disabled = true;
  pauseBtn.disabled = false;
  stopBtn.disabled  = false;
  pauseBtn.textContent = '⏸ Pause';

  setStatus(`Starting from #${parsed.startNum}…`, 'running');

  if (settings.autoSwitch) switchTab('progress');

  startDownloading(parsed.base, parsed.startNum, parsed.ext, state.subfolder);
});

// ─── Pause button ─────────────────────────────────────────────────────────────
pauseBtn.addEventListener('click', () => {
  state.paused = !state.paused;
  pauseBtn.textContent = state.paused ? '▶ Resume' : '⏸ Pause';
  if (state.paused) {
    setStatus('Paused — click Resume to continue', 'paused');
    showToast('Paused', 'info');
  } else {
    setStatus(`Downloading…`, 'running');
  }
});

// ─── Stop button ──────────────────────────────────────────────────────────────
stopBtn.addEventListener('click', () => {
  state.stopped = true;
  state.paused  = false;
  pauseBtn.disabled = true;
  stopBtn.disabled  = true;
  setStatus('Stopping…', '');
  showToast('Stopping download…', 'info');
});

// ─── Init ─────────────────────────────────────────────────────────────────────
(async () => {
  await loadSettings();
  await renderHistory();
  setStatus('Idle — enter a URL to begin', '');
})();
