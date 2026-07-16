/**
 * VisionSpark — AI Image Generator
 * Talks to the free Pollinations.AI image endpoint (no API key required).
 * https://image.pollinations.ai
 *
 * File map:
 *   1. Config & constants
 *   2. State
 *   3. DOM references
 *   4. LocalStorage helpers
 *   5. Utilities
 *   6. Pollinations API layer
 *   7. UI rendering
 *   8. Core generation flow
 *   9. Event wiring / init
 */

/* ===================================================================
   1. Config & constants
   =================================================================== */

const IMAGE_ENDPOINT = 'https://image.pollinations.ai/prompt/';
const MODELS_ENDPOINT = 'https://image.pollinations.ai/models';
const FALLBACK_MODELS = ['flux', 'turbo'];
const GENERATION_TIMEOUT_MS = 45000;
const RETRIES_PER_IMAGE = 2;
const HISTORY_LIMIT = 60;

const STYLE_PRESETS = [
  { id: 'none', label: 'None', suffix: '' },
  { id: 'photo', label: 'Photorealistic', suffix: 'photorealistic, realistic lighting, DSLR photo, sharp focus' },
  { id: 'digital', label: 'Digital Art', suffix: 'digital painting, concept art, vibrant colors' },
  { id: 'anime', label: 'Anime', suffix: 'anime style, cel shaded, vibrant' },
  { id: '3d', label: '3D Render', suffix: '3D render, octane render, cinematic lighting' },
  { id: 'watercolor', label: 'Watercolor', suffix: 'watercolor painting, soft brush strokes, paper texture' },
  { id: 'oil', label: 'Oil Painting', suffix: 'oil painting, textured brushstrokes, classical art style' },
  { id: 'pixel', label: 'Pixel Art', suffix: 'pixel art, 16-bit, retro game style' },
  { id: 'cyberpunk', label: 'Cyberpunk', suffix: 'cyberpunk style, neon lights, futuristic, moody atmosphere' },
];

const QUALITY_BOOST_SUFFIX = 'highly detailed, sharp focus, professional quality, 4k';

const ASPECT_RATIOS = [
  { id: 'square', label: 'Square', width: 1024, height: 1024 },
  { id: 'portrait', label: 'Portrait', width: 832, height: 1216 },
  { id: 'landscape', label: 'Landscape', width: 1216, height: 832 },
  { id: 'wide', label: 'Wide', width: 1280, height: 720 },
];

const SURPRISE_PROMPTS = [
  'a bioluminescent jellyfish drifting through a dark forest at night',
  'a cozy library built inside a giant hollowed-out tree',
  'a steampunk airship sailing above a canyon at sunrise',
  'a fox wearing a tiny raincoat, walking through a neon-lit street',
  'an astronaut planting a garden on the surface of the moon',
  'a floating island city connected by rope bridges above the clouds',
  'a lighthouse standing alone in a storm, waves crashing around it',
  'a robot painting a portrait in an old artist\'s studio',
  'a underwater train station full of glowing jellyfish lanterns',
  'a dragon curled asleep on a pile of books in a candlelit study',
  'a desert market at dusk with lanterns and spice-colored tents',
  'a treehouse village connected by glowing vines at night',
];

/* ===================================================================
   2. State
   =================================================================== */

const state = {
  generationCounter: 0,
  currentController: null,
  selectedStyle: 'none',
  selectedRatio: 'square',
  history: [],
  favoritesOnly: false,
};

/* ===================================================================
   3. DOM references
   =================================================================== */

const dom = {
  form: document.getElementById('generate-form'),
  promptInput: document.getElementById('prompt-input'),
  charCount: document.getElementById('char-count'),
  surpriseBtn: document.getElementById('surprise-btn'),
  styleChips: document.getElementById('style-chips'),
  ratioButtons: document.getElementById('ratio-buttons'),
  modelSelect: document.getElementById('model-select'),
  variationsSelect: document.getElementById('variations-select'),
  seedInput: document.getElementById('seed-input'),
  randomizeSeedBtn: document.getElementById('randomize-seed-btn'),
  lockSeedCheckbox: document.getElementById('lock-seed-checkbox'),
  enhanceToggle: document.getElementById('enhance-toggle'),
  qualityBoostToggle: document.getElementById('quality-boost-toggle'),
  generateBtn: document.getElementById('generate-btn'),
  generateBtnText: document.getElementById('generate-btn-text'),
  cancelBtn: document.getElementById('cancel-btn'),
  canvasPanel: document.getElementById('canvas-panel'),
  statusLine: document.getElementById('status-line'),
  emptyState: document.getElementById('canvas-empty-state'),
  resultsGrid: document.getElementById('results-grid'),
  historyGrid: document.getElementById('history-grid'),
  historyEmpty: document.getElementById('history-empty'),
  favoritesOnlyToggle: document.getElementById('favorites-only-toggle'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  themeToggle: document.getElementById('theme-toggle'),
  themeIcon: document.getElementById('theme-icon'),
  lightbox: document.getElementById('lightbox'),
  lightboxBackdrop: document.getElementById('lightbox-backdrop'),
  lightboxClose: document.getElementById('lightbox-close'),
  lightboxImg: document.getElementById('lightbox-img'),
  lightboxPrompt: document.getElementById('lightbox-prompt'),
  lightboxDetails: document.getElementById('lightbox-details'),
  lightboxDownload: document.getElementById('lightbox-download'),
  lightboxCopyPrompt: document.getElementById('lightbox-copy-prompt'),
  lightboxFavorite: document.getElementById('lightbox-favorite'),
  toastContainer: document.getElementById('toast-container'),
};

/* ===================================================================
   4. LocalStorage helpers
   =================================================================== */

const STORAGE_KEYS = { theme: 'visionspark:theme', history: 'visionspark:history' };

function loadTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.theme) || 'dark';
  } catch {
    return 'dark';
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch {
    /* storage unavailable — theme just won't persist */
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history.slice(0, HISTORY_LIMIT)));
  } catch {
    /* storage full or unavailable — history stays in memory for this session */
  }
}

/* ===================================================================
   5. Utilities
   =================================================================== */

function randomSeed() {
  return Math.floor(Math.random() * 999999999);
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  dom.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function downloadImage(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ===================================================================
   6. Pollinations API layer
   =================================================================== */

async function fetchAvailableModels() {
  try {
    const res = await fetch(MODELS_ENDPOINT);
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    if (Array.isArray(data) && data.length) return data;
    throw new Error('empty model list');
  } catch {
    return FALLBACK_MODELS;
  }
}

function buildImageUrl({ prompt, model, width, height, seed, enhance }) {
  const base = IMAGE_ENDPOINT + encodeURIComponent(prompt);
  const params = new URLSearchParams();
  params.set('width', width);
  params.set('height', height);
  params.set('seed', seed);
  params.set('nologo', 'true');
  if (model) params.set('model', model);
  if (enhance) params.set('enhance', 'true');
  return `${base}?${params.toString()}`;
}

/**
 * Loads an image and resolves with a displayable src (object URL when possible).
 * Prefers fetch() so we get real cancellation and precise HTTP error messages;
 * falls back to a classic <img> loader if fetch is blocked (e.g. by CORS).
 */
async function loadImage(url, signal) {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      let message = `Server responded with status ${res.status}`;
      try {
        const text = await res.text();
        if (text) message = text.slice(0, 160);
      } catch {
        /* ignore body read errors, use default message */
      }
      throw new Error(message);
    }
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) throw new Error('Response was not an image');
    return URL.createObjectURL(blob);
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    return loadImageViaImgTag(url, signal);
  }
}

function loadImageViaImgTag(url, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const img = new Image();
    let settled = false;

    const onAbort = () => {
      if (settled) return;
      settled = true;
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort);

    img.onload = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      resolve(url);
    };
    img.onerror = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      reject(new Error('Image failed to load'));
    };
    img.src = url;
  });
}

/**
 * Generates a single image with automatic retries (fresh seed each retry,
 * unless the seed is locked) and an overall timeout per attempt.
 */
async function generateSingleImage(settings, signal) {
  let lastError;
  for (let attempt = 0; attempt <= RETRIES_PER_IMAGE; attempt += 1) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const seed = attempt === 0 || settings.seedLocked ? settings.seed : randomSeed();
    const url = buildImageUrl({ ...settings, seed });

    const timeoutController = new AbortController();
    const onOuterAbort = () => timeoutController.abort();
    signal.addEventListener('abort', onOuterAbort);
    const timer = setTimeout(() => timeoutController.abort(), GENERATION_TIMEOUT_MS);

    try {
      const src = await loadImage(url, timeoutController.signal);
      return { ok: true, src, seed, url };
    } catch (err) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      lastError = err;
      if (attempt < RETRIES_PER_IMAGE) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', onOuterAbort);
    }
  }
  return { ok: false, error: lastError?.message || 'Could not generate image' };
}

/* ===================================================================
   7. UI rendering
   =================================================================== */

function renderStyleChips() {
  dom.styleChips.innerHTML = '';
  STYLE_PRESETS.forEach((preset) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = preset.label;
    chip.setAttribute('aria-pressed', String(preset.id === state.selectedStyle));
    chip.addEventListener('click', () => {
      state.selectedStyle = preset.id;
      renderStyleChips();
    });
    dom.styleChips.appendChild(chip);
  });
}

function renderRatioButtons() {
  dom.ratioButtons.innerHTML = '';
  ASPECT_RATIOS.forEach((ratio) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = ratio.label;
    chip.setAttribute('aria-pressed', String(ratio.id === state.selectedRatio));
    chip.addEventListener('click', () => {
      state.selectedRatio = ratio.id;
      renderRatioButtons();
    });
    dom.ratioButtons.appendChild(chip);
  });
}

async function populateModelSelect() {
  dom.modelSelect.innerHTML = '<option value="">Auto (recommended)</option>';
  const models = await fetchAvailableModels();
  models.forEach((model) => {
    const opt = document.createElement('option');
    opt.value = model;
    opt.textContent = model;
    dom.modelSelect.appendChild(opt);
  });
}

function updateCharCount() {
  dom.charCount.textContent = `${dom.promptInput.value.length} / 600`;
}

function setGeneratingUI(isGenerating) {
  dom.generateBtn.disabled = isGenerating;
  dom.generateBtnText.textContent = isGenerating ? 'Generating…' : 'Generate';
  dom.cancelBtn.hidden = !isGenerating;
  dom.canvasPanel.dataset.generating = String(isGenerating);
}

function createResultCell(ratio) {
  const cell = document.createElement('div');
  cell.className = 'result-cell';
  cell.style.setProperty('--cell-ratio', `${ratio.width} / ${ratio.height}`);
  const spinner = document.createElement('div');
  spinner.className = 'cell-spinner';
  cell.appendChild(spinner);
  return cell;
}

function fillResultCell(cell, result, meta) {
  cell.innerHTML = '';
  if (!result.ok) {
    const err = document.createElement('div');
    err.className = 'cell-error';
    err.textContent = `⚠️ ${result.error}`;
    cell.appendChild(err);
    return;
  }

  const img = document.createElement('img');
  img.src = result.src;
  img.alt = meta.prompt;
  cell.appendChild(img);
  requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add('developed')));

  const overlay = document.createElement('div');
  overlay.className = 'cell-overlay';

  const downloadBtn = document.createElement('button');
  downloadBtn.type = 'button';
  downloadBtn.className = 'cell-action-btn';
  downloadBtn.setAttribute('aria-label', 'Download image');
  downloadBtn.title = 'Download';
  downloadBtn.textContent = '⬇';
  downloadBtn.addEventListener('click', () => downloadImage(result.src, `visionspark-${result.seed}.jpg`));

  const expandBtn = document.createElement('button');
  expandBtn.type = 'button';
  expandBtn.className = 'cell-action-btn';
  expandBtn.setAttribute('aria-label', 'View fullscreen');
  expandBtn.title = 'View fullscreen';
  expandBtn.textContent = '⤢';
  expandBtn.addEventListener('click', () => openLightbox({ ...meta, src: result.src, seed: result.seed }));

  overlay.append(downloadBtn, expandBtn);
  cell.appendChild(overlay);

  cell.tabIndex = 0;
  cell.addEventListener('click', (e) => {
    if (e.target.closest('.cell-action-btn')) return;
    openLightbox({ ...meta, src: result.src, seed: result.seed });
  });
}

function renderHistory() {
  const items = state.favoritesOnly ? state.history.filter((h) => h.favorite) : state.history;
  dom.historyGrid.innerHTML = '';
  dom.historyEmpty.hidden = items.length > 0;

  items.forEach((item) => {
    const thumb = document.createElement('div');
    thumb.className = 'history-thumb';
    thumb.title = item.prompt;

    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.prompt;
    img.loading = 'lazy';
    thumb.appendChild(img);

    if (item.favorite) {
      const badge = document.createElement('span');
      badge.className = 'fav-badge';
      badge.textContent = '⭐';
      thumb.appendChild(badge);
    }

    thumb.addEventListener('click', () => openLightbox(item));
    dom.historyGrid.appendChild(thumb);
  });
}

function addHistoryEntry(entry) {
  state.history.unshift(entry);
  if (state.history.length > HISTORY_LIMIT) state.history.length = HISTORY_LIMIT;
  saveHistory();
  renderHistory();
}

/* ---- Lightbox ---- */

let lightboxCurrent = null;

function openLightbox(meta) {
  lightboxCurrent = meta;
  dom.lightboxImg.src = meta.src;
  dom.lightboxImg.alt = meta.prompt;
  dom.lightboxPrompt.textContent = meta.prompt;
  dom.lightboxDetails.textContent = [
    meta.model ? `model: ${meta.model}` : 'model: auto',
    `seed: ${meta.seed}`,
    meta.width && meta.height ? `${meta.width}×${meta.height}` : null,
  ].filter(Boolean).join('  ·  ');
  updateFavoriteButton(meta);
  dom.lightbox.hidden = false;
  dom.lightboxClose.focus();
}

function closeLightbox() {
  dom.lightbox.hidden = true;
  lightboxCurrent = null;
}

function updateFavoriteButton(meta) {
  const historyItem = state.history.find((h) => h.id === meta.id);
  const isFav = historyItem?.favorite;
  dom.lightboxFavorite.textContent = isFav ? '★ Favorited' : '☆ Favorite';
}

/* ===================================================================
   8. Core generation flow
   =================================================================== */

function collectSettings() {
  const ratio = ASPECT_RATIOS.find((r) => r.id === state.selectedRatio) || ASPECT_RATIOS[0];
  const seedLocked = dom.lockSeedCheckbox.checked;
  const seedValue = dom.seedInput.value ? Number(dom.seedInput.value) : randomSeed();

  return {
    model: dom.modelSelect.value || null,
    width: ratio.width,
    height: ratio.height,
    enhance: dom.enhanceToggle.checked,
    seedLocked,
    seed: seedValue,
    variations: Number(dom.variationsSelect.value),
    ratio,
    styleSuffix: STYLE_PRESETS.find((s) => s.id === state.selectedStyle)?.suffix || '',
    qualityBoost: dom.qualityBoostToggle.checked,
  };
}

function buildFinalPrompt(rawPrompt, settings) {
  const parts = [rawPrompt];
  if (settings.styleSuffix) parts.push(settings.styleSuffix);
  if (settings.qualityBoost) parts.push(QUALITY_BOOST_SUFFIX);
  return parts.join(', ');
}

function cancelCurrentGeneration() {
  if (state.currentController) {
    state.currentController.abort();
    state.currentController = null;
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  const rawPrompt = dom.promptInput.value.trim();
  if (!rawPrompt) {
    showToast('Please describe an image first.', 'error');
    dom.promptInput.focus();
    return;
  }

  cancelCurrentGeneration();
  const controller = new AbortController();
  state.currentController = controller;
  const generationId = ++state.generationCounter;

  const settings = collectSettings();
  const finalPrompt = buildFinalPrompt(rawPrompt, settings);

  if (!settings.seedLocked) {
    dom.seedInput.value = settings.seed;
  }

  dom.emptyState.style.display = 'none';
  dom.resultsGrid.innerHTML = '';
  dom.statusLine.textContent = settings.variations > 1
    ? `Generating ${settings.variations} variations…`
    : 'Generating your image…';
  setGeneratingUI(true);

  const cells = Array.from({ length: settings.variations }, () => {
    const cell = createResultCell(settings.ratio);
    dom.resultsGrid.appendChild(cell);
    return cell;
  });

  let successCount = 0;

  await Promise.all(cells.map(async (cell, index) => {
    const entryId = uid();
    const perImageSettings = {
      prompt: finalPrompt,
      model: settings.model,
      width: settings.width,
      height: settings.height,
      enhance: settings.enhance,
      seed: settings.seedLocked ? settings.seed : randomSeed(),
      seedLocked: settings.seedLocked,
    };

    let result;
    try {
      result = await generateSingleImage(perImageSettings, controller.signal);
    } catch (err) {
      if (err.name === 'AbortError') return; // cancelled — handleCancel already updated this cell's UI
      result = { ok: false, error: err.message || 'Unexpected error' };
    }

    if (generationId !== state.generationCounter) return; // superseded by a newer generation

    const cellMeta = { id: entryId, prompt: rawPrompt, model: settings.model, width: settings.width, height: settings.height };
    fillResultCell(cell, result, cellMeta);

    if (result.ok) {
      successCount += 1;
      addHistoryEntry({
        id: entryId,
        prompt: rawPrompt,
        src: result.src,
        model: settings.model,
        width: settings.width,
        height: settings.height,
        seed: result.seed,
        favorite: false,
        createdAt: Date.now(),
      });
    }
  }));

  if (generationId !== state.generationCounter) return;

  setGeneratingUI(false);
  state.currentController = null;

  if (successCount === 0) {
    dom.statusLine.textContent = '❌ Could not generate an image. Try a different prompt or settings.';
  } else if (successCount < settings.variations) {
    dom.statusLine.textContent = `✅ Generated ${successCount} of ${settings.variations} images.`;
  } else {
    dom.statusLine.textContent = '✅ Below are your generated images.';
  }
}

function handleCancel() {
  cancelCurrentGeneration();
  state.generationCounter += 1; // invalidate in-flight callbacks
  setGeneratingUI(false);
  dom.statusLine.textContent = 'Generation cancelled.';
  dom.resultsGrid.querySelectorAll('.result-cell').forEach((cell) => {
    if (cell.querySelector('.cell-spinner')) {
      cell.innerHTML = '<div class="cell-error">Cancelled</div>';
    }
  });
}

/* ===================================================================
   9. Event wiring / init
   =================================================================== */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  dom.themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  dom.themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  saveTheme(theme);
}

function initEvents() {
  dom.form.addEventListener('submit', handleSubmit);
  dom.cancelBtn.addEventListener('click', handleCancel);

  dom.promptInput.addEventListener('input', updateCharCount);

  dom.surpriseBtn.addEventListener('click', () => {
    const pick = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
    dom.promptInput.value = pick;
    updateCharCount();
    dom.promptInput.focus();
  });

  dom.randomizeSeedBtn.addEventListener('click', () => {
    dom.seedInput.value = randomSeed();
    dom.lockSeedCheckbox.checked = false;
  });

  dom.themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  dom.favoritesOnlyToggle.addEventListener('change', () => {
    state.favoritesOnly = dom.favoritesOnlyToggle.checked;
    renderHistory();
  });

  dom.clearHistoryBtn.addEventListener('click', () => {
    if (state.history.length === 0) return;
    if (!confirm('Clear all generation history? This cannot be undone.')) return;
    state.history = [];
    saveHistory();
    renderHistory();
    showToast('History cleared.', 'success');
  });

  // Lightbox
  dom.lightboxClose.addEventListener('click', closeLightbox);
  dom.lightboxBackdrop.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dom.lightbox.hidden) closeLightbox();
  });

  dom.lightboxDownload.addEventListener('click', () => {
    if (!lightboxCurrent) return;
    downloadImage(lightboxCurrent.src, `visionspark-${lightboxCurrent.seed}.jpg`);
  });

  dom.lightboxCopyPrompt.addEventListener('click', async () => {
    if (!lightboxCurrent) return;
    const ok = await copyToClipboard(lightboxCurrent.prompt);
    showToast(ok ? 'Prompt copied to clipboard.' : 'Could not copy prompt.', ok ? 'success' : 'error');
  });

  dom.lightboxFavorite.addEventListener('click', () => {
    if (!lightboxCurrent) return;
    const item = state.history.find((h) => h.id === lightboxCurrent.id);
    if (!item) return; // not a history-backed image (shouldn't normally happen)
    item.favorite = !item.favorite;
    saveHistory();
    updateFavoriteButton(lightboxCurrent);
    renderHistory();
  });
}

async function init() {
  applyTheme(loadTheme());
  state.history = loadHistory();

  renderStyleChips();
  renderRatioButtons();
  renderHistory();
  updateCharCount();
  dom.seedInput.value = randomSeed();

  await populateModelSelect();
  initEvents();
}

init();