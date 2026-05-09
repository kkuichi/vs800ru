// contentScript.js — MV3 Hybrid: Local Char-CNN GraphModel via TFJS + Remote API

const STORAGE_KEY = "ttd_settings";

const DEFAULT_SETTINGS = {
  enabled: true,
  sensitivity: 100,
  autoBlur: true,
  showConfidence: true,
  inferenceMode: "local",
  categories: {
    toxicity: true,
    insult: true,
    profanity: true,
    threat: true,
    identityAttack: true
  },
  whitelist: []
};

// ---------------- tunables ----------------

const MIN_TEXT_LENGTH = 20;
const MAX_MODEL_TEXT_LENGTH = 256;
const MAX_SCAN_NODES = 80;
const CLASSIFY_BATCH_SIZE = 96;
const CACHE_LIMIT = 250;
const VIEWPORT_MARGIN = 200;

// ---------------- local model paths ----------------

const LOCAL_MODEL_DIR = "local_char_model";

const CHAR_MAX_LEN = 256;

const CONTRACT_LABELS = [
  "toxic",
  "severe_toxic",
  "obscene",
  "insult",
  "threat",
  "identity_hate"
];

const CHAR_GRAPH_URL = chrome.runtime.getURL(`${LOCAL_MODEL_DIR}/model.json`);
const CHAR_VOCAB_URL = chrome.runtime.getURL(`${LOCAL_MODEL_DIR}/char_vocab.json`);
const CHAR_THRESH_URL = chrome.runtime.getURL(`${LOCAL_MODEL_DIR}/thresholds.json`);
const WASM_BASE_URL = chrome.runtime.getURL(`${LOCAL_MODEL_DIR}/`);

// ---------------- state ----------------

let settings = { ...DEFAULT_SETTINGS };

let scanTimer = null;
let observer = null;
let scanInFlight = false;
let rescanQueued = false;
let fullRescanRequested = false;

let graphModelPromise = null;
let charAssetsPromise = null;
let backendPromise = null;

const textMeta = new WeakMap();
const activeMarkers = new Set();

// ---------------- LRU cache ----------------

function createLRU(maxSize) {
  const map = new Map();

  return {
    get(key) {
      if (!map.has(key)) return null;

      const value = map.get(key);
      map.delete(key);
      map.set(key, value);

      return value;
    },

    set(key, value) {
      if (map.has(key)) map.delete(key);

      map.set(key, value);

      if (map.size > maxSize) {
        map.delete(map.keys().next().value);
      }
    },

    clear() {
      map.clear();
    }
  };
}

const resultCache = createLRU(CACHE_LIMIT);

// ---------------- settings helpers ----------------

function normalizeDomain(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return "";

  const noProto = v.replace(/^https?:\/\//, "");
  const noPath = noProto.split("/")[0].split("?")[0].split("#")[0];

  return noPath.replace(/^www\./, "");
}

function domainMatches(host, domain) {
  const h = normalizeDomain(host);
  const d = normalizeDomain(domain);

  if (!h || !d) return false;

  return h === d || h.endsWith(`.${d}`);
}

function domainIsWhitelisted() {
  const host = normalizeDomain(location.hostname || "");

  return (
    Array.isArray(settings.whitelist) &&
    settings.whitelist.some((domain) => domainMatches(host, domain))
  );
}

function normalizeTextForModel(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MODEL_TEXT_LENGTH);
}

function migrateSettings(raw) {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...(raw || {})
  };

  const c = raw && raw.categories
    ? raw.categories
    : merged.categories || {};

  const get = (k1, k2, k3) => {
    if (c && Object.prototype.hasOwnProperty.call(c, k1)) return !!c[k1];
    if (c && k2 && Object.prototype.hasOwnProperty.call(c, k2)) return !!c[k2];
    if (c && k3 && Object.prototype.hasOwnProperty.call(c, k3)) return !!c[k3];

    return undefined;
  };

  const toxicity = get("toxicity", "Toxicity");
  const insult = get("insult", "Insult");
  const profanity = get("profanity", "Profanity");
  const threat = get("threat", "Threat", "Thread");
  const identityAttack = get(
    "identityAttack",
    "Identity attack",
    "identity_attack"
  );

  merged.categories = {
    toxicity: toxicity ?? DEFAULT_SETTINGS.categories.toxicity,
    insult: insult ?? DEFAULT_SETTINGS.categories.insult,
    profanity: profanity ?? DEFAULT_SETTINGS.categories.profanity,
    threat: threat ?? DEFAULT_SETTINGS.categories.threat,
    identityAttack:
      identityAttack ?? DEFAULT_SETTINGS.categories.identityAttack
  };

  const mode = String(merged.inferenceMode || "local").toLowerCase();
  merged.inferenceMode = mode === "remote" ? "remote" : "local";

  const sensitivity = Number(merged.sensitivity);
  merged.sensitivity = Number.isFinite(sensitivity)
    ? Math.max(0, Math.min(100, sensitivity))
    : DEFAULT_SETTINGS.sensitivity;

  merged.enabled = merged.enabled !== false;
  merged.autoBlur = merged.autoBlur !== false;
  merged.showConfidence = !!merged.showConfidence;

  if (!Array.isArray(merged.whitelist)) {
    merged.whitelist = [];
  }

  return merged;
}

function buildContractSettingsFromUI() {
  const c = settings.categories || {};

  const enabledLabels = [];

  if (c.toxicity) {
    enabledLabels.push("toxic", "severe_toxic");
  }

  if (c.insult) {
    enabledLabels.push("insult");
  }

  if (c.profanity) {
    enabledLabels.push("obscene");
  }

  if (c.threat) {
    enabledLabels.push("threat");
  }

  if (c.identityAttack) {
    enabledLabels.push("identity_hate");
  }

  const strictness = Math.max(
    0,
    Math.min(1, Number(settings.sensitivity ?? 50) / 100)
  );

  return {
    enabledLabels,
    strictness
  };
}

function getDetectionCachePrefix() {
  const { enabledLabels, strictness } = buildContractSettingsFromUI();

  return [
    settings.inferenceMode,
    strictness.toFixed(2),
    [...enabledLabels].sort().join(",")
  ].join("|");
}

async function loadSettings() {
  const res = await chrome.storage.sync.get([STORAGE_KEY]);
  settings = migrateSettings(res[STORAGE_KEY] || {});
  return settings;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (!changes[STORAGE_KEY]) return;

  settings = migrateSettings(changes[STORAGE_KEY].newValue || {});
  resultCache.clear();

  if (!settings.enabled || domainIsWhitelisted()) {
    clearTTDDecorations();
    return;
  }

  scheduleScan(0, { full: true });
});

// ---------------- styles ----------------

function injectStyles() {
  if (document.getElementById("ttd-style")) return;

  const style = document.createElement("style");
  style.id = "ttd-style";

  style.textContent = `
    span[data-ttd] {
      transition: outline .15s ease;
      white-space: pre-wrap;
    }

    span[data-ttd] .ttd-text {
      transition: filter .15s ease;
    }

    .ttd-blur {
      cursor: pointer;
    }

    .ttd-blur .ttd-text {
      filter: blur(5px);
    }

    .ttd-blur:hover .ttd-text {
      filter: blur(3px);
    }

    .ttd-mark {
      outline: 2px solid rgba(255, 120, 120, 0.35);
      border-radius: 4px;
    }

    .ttd-badge {
      display: inline-block;
      vertical-align: middle;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.2;
      margin-left: 5px;
      padding: 2px 6px;
      border-radius: 999px;
      background: rgba(255, 90, 90, 0.18);
      outline: 1px solid rgba(255, 90, 90, 0.35);
      white-space: nowrap;
    }
  `;

  document.documentElement.appendChild(style);
}

// ---------------- TFJS local model ----------------

function makeCleanResult() {
  return {
    scores: {},
    triggered_labels: [],
    is_toxic: false,
    meta: {}
  };
}

async function fetchJson(url) {
  const r = await fetch(url);

  if (!r.ok) {
    throw new Error(`Fetch failed ${r.status} for ${url}`);
  }

  return r.json();
}

function normalizeForCharModel(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+|www\.\S+/g, "<url>")
    .replace(/@\w+/g, "<user>")
    .replace(/\s+/g, " ")
    .trim();
}

// Higher sensitivity/strictness = lower threshold = easier to trigger.
function adjustedThresholds(baseThr, strictness) {
  const delta = 0.25;
  const s = Math.max(0, Math.min(1, Number(strictness)));
  const shift = (s - 0.5) * delta;

  const out = {};

  for (const lab of CONTRACT_LABELS) {
    const b = Number(baseThr?.[lab] ?? 0.5);
    out[lab] = Math.max(0.05, Math.min(0.95, b - shift));
  }

  return out;
}

function tokenizeBatch(texts, vocab) {
  const B = texts.length;
  const out = new Int32Array(B * CHAR_MAX_LEN);

  for (let i = 0; i < B; i++) {
    const norm = normalizeForCharModel(texts[i]);
    const base = i * CHAR_MAX_LEN;

    for (let j = 0; j < CHAR_MAX_LEN; j++) {
      if (j >= norm.length) break;

      const ch = norm[j];
      const id = vocab[ch];

      out[base + j] = id === undefined ? 1 : id;
    }
  }

  return out;
}

function firstTensor(x) {
  if (!x) return null;

  if (Array.isArray(x)) {
    return x[0] || null;
  }

  if (typeof x === "object" && x.dataSync == null) {
    const keys = Object.keys(x);
    if (keys.length) return x[keys[0]] || null;
  }

  return x;
}

function disposeModelOutput(x) {
  try {
    if (!x) return;

    if (Array.isArray(x)) {
      for (const item of x) {
        if (item?.dispose) item.dispose();
      }
      return;
    }

    if (typeof x === "object" && x.dataSync == null) {
      for (const key of Object.keys(x)) {
        if (x[key]?.dispose) x[key].dispose();
      }
      return;
    }

    if (x?.dispose) {
      x.dispose();
    }
  } catch {}
}

async function ensureTfBackend() {
  if (backendPromise) return backendPromise;

  backendPromise = (async () => {
    if (!globalThis.tf) {
      throw new Error("TFJS is not loaded. globalThis.tf is missing.");
    }

    if (typeof tf.setBackend !== "function") {
      throw new Error(
        `TFJS core is not loaded correctly. typeof tf.setBackend=${typeof tf.setBackend}`
      );
    }

    if (typeof tf.loadGraphModel !== "function") {
      throw new Error(
        "TFJS converter is not loaded correctly. tf.loadGraphModel is missing."
      );
    }

    try {
      if (tf?.wasm?.setWasmPaths) {
        try {
          tf.wasm.setWasmPaths(WASM_BASE_URL);
        } catch {
          tf.wasm.setWasmPaths({
            "tfjs-backend-wasm.wasm": `${WASM_BASE_URL}tfjs-backend-wasm.wasm`,
            "tfjs-backend-wasm-simd.wasm": `${WASM_BASE_URL}tfjs-backend-wasm-simd.wasm`,
            "tfjs-backend-wasm-threaded-simd.wasm": `${WASM_BASE_URL}tfjs-backend-wasm-threaded-simd.wasm`
          });
        }
      } else if (tf?.wasm?.setWasmPath) {
        tf.wasm.setWasmPath(`${WASM_BASE_URL}tfjs-backend-wasm.wasm`);
      }
    } catch (e) {
      console.warn("[TTD] WASM path init failed:", e);
    }

    try {
      await tf.setBackend("wasm");
      await tf.ready();

      if (tf.getBackend?.() === "wasm") {
        console.log("[TTD] TFJS backend:", tf.getBackend());
        return "wasm";
      }
    } catch (e) {
      console.warn("[TTD] WASM backend failed, fallback to CPU:", e);
    }

    await tf.setBackend("cpu");
    await tf.ready();

    console.log("[TTD] TFJS backend:", tf.getBackend?.() || "unknown");

    return tf.getBackend?.() || "cpu";
  })();

  return backendPromise;
}

async function loadCharAssets() {
  if (charAssetsPromise) return charAssetsPromise;

  charAssetsPromise = (async () => {
    const [vocab, thrJson] = await Promise.all([
      fetchJson(CHAR_VOCAB_URL),
      fetchJson(CHAR_THRESH_URL)
    ]);

    const thresholds = thrJson.thresholds || thrJson;

    return {
      vocab,
      thresholds
    };
  })();

  return charAssetsPromise;
}

async function loadCharGraphModel() {
  if (graphModelPromise) return graphModelPromise;

  graphModelPromise = (async () => {
    await ensureTfBackend();

    const model = await tf.loadGraphModel(CHAR_GRAPH_URL);

    try {
      const inputName = model.inputs?.[0]?.name;

      if (inputName) {
        const x = tf.zeros([1, CHAR_MAX_LEN], "int32");
        const y = model.execute({ [inputName]: x });

        disposeModelOutput(y);
        x.dispose();
      }
    } catch (e) {
      console.warn("[TTD] local model warm-up failed:", e);
    }

    console.log("[TTD] Local char model loaded:", {
      input: model.inputs?.[0]?.name,
      inputShape: model.inputs?.[0]?.shape,
      output: model.outputs?.[0]?.name,
      outputShape: model.outputs?.[0]?.shape,
      backend: tf.getBackend?.()
    });

    return model;
  })();

  return graphModelPromise;
}

async function classifyTextsLocal(texts) {
  try {
    const model = await loadCharGraphModel();
    const { vocab, thresholds: baseThr } = await loadCharAssets();

    const { enabledLabels, strictness } = buildContractSettingsFromUI();
    const enabled = new Set(enabledLabels);
    const thresholds = adjustedThresholds(baseThr, strictness);

    const inputName = model.inputs?.[0]?.name;

    if (!inputName) {
      throw new Error("GraphModel input name not found.");
    }

    const idsFlat = tokenizeBatch(texts, vocab);

    const t0 = performance.now();

    let probs = [];
    let tensorShape = [];

    const x = tf.tensor2d(idsFlat, [texts.length, CHAR_MAX_LEN], "int32");

    try {
      const y = model.execute({ [inputName]: x });
      const outTensor = firstTensor(y);

      if (!outTensor || typeof outTensor.dataSync !== "function") {
        throw new Error("GraphModel output tensor missing.");
      }

      probs = Array.from(outTensor.dataSync());
      tensorShape = outTensor.shape || [];

      disposeModelOutput(y);
    } finally {
      x.dispose();
    }

    const t1 = performance.now();

    const outputDim = texts.length > 0
      ? Math.round(probs.length / texts.length)
      : 0;

    console.log("[TTD] Local output debug:", {
      textsCount: texts.length,
      probsLength: probs.length,
      outputDim,
      tensorShape
    });

    const results = new Array(texts.length);

    for (let i = 0; i < texts.length; i++) {
      // Case 1: binary model, only one score
      if (outputDim === 1) {
        const score = Number(probs[i] ?? 0);
        const threshold = Number(baseThr?.toxic ?? baseThr?.toxicity ?? 0.5);

        const toxicityEnabled =
          enabled.has("toxic") || enabled.has("severe_toxic");

        const triggered =
          toxicityEnabled && score >= threshold
            ? ["toxic"]
            : [];

        results[i] = {
          scores: {
            toxic: score
          },
          triggered_labels: triggered,
          is_toxic: triggered.length > 0,
          meta: {
            mode: "local",
            model_id: "charcnn-graph-binary",
            backend: tf.getBackend?.() || "unknown",
            model_latency_ms: Math.round(t1 - t0),
            label_support: "toxicity_only"
          }
        };

        continue;
      }

      // Case 2: expected multi-label model, six scores
      if (outputDim < 6) {
        console.warn("[TTD] Unexpected local model output dimension:", outputDim);

        results[i] = makeCleanResult();
        continue;
      }

      const o = i * outputDim;

      const scores = {
        toxic: Number(probs[o + 0] ?? 0),
        severe_toxic: Number(probs[o + 1] ?? 0),
        obscene: Number(probs[o + 2] ?? 0),
        insult: Number(probs[o + 3] ?? 0),
        threat: Number(probs[o + 4] ?? 0),
        identity_hate: Number(probs[o + 5] ?? 0)
      };

      const triggered = [];

      for (const label of CONTRACT_LABELS) {
        if (enabled.has(label) && scores[label] >= thresholds[label]) {
          triggered.push(label);
        }
      }


      results[i] = {
        scores,
        triggered_labels: triggered,
        is_toxic: triggered.length > 0,
        meta: {
          mode: "local",
          model_id: "charcnn-graph-multilabel",
          backend: tf.getBackend?.() || "unknown",
          model_latency_ms: Math.round(t1 - t0),
          label_support: "six_labels"
        }
      };
    }

    return results;
  } catch (e) {
    console.warn("[TTD] local char model failed:", e);
    return texts.map(() => makeCleanResult());
  }
}

// ---------------- remote inference ----------------

function bgPredictBatch(texts, strictness) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "TTD_REMOTE_PREDICT_BATCH",
        payload: {
          texts,
          strictness
        }
      },
      (resp) => {
        const err = chrome.runtime.lastError;

        if (err) {
          reject(new Error(err?.message || "chrome.runtime.sendMessage failed"));
          return;
        }

        if (!resp?.ok) {
          reject(new Error(resp?.error || "Remote predict failed"));
          return;
        }

        resolve(Array.isArray(resp.results) ? resp.results : []);
      }
    );
  });
}

function canonicalLabel(label) {
  const key = String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const map = {
    toxic: "toxic",
    toxicity: "toxic",

    severe_toxic: "severe_toxic",
    severe_toxicity: "severe_toxic",

    obscene: "obscene",
    profanity: "obscene",
    profane: "obscene",

    insult: "insult",
    insulting: "insult",

    threat: "threat",
    threatening: "threat",

    identity_hate: "identity_hate",
    identity_attack: "identity_hate",
    identityattack: "identity_hate"
  };

  return map[key] || key;
}

function normalizeScoreValue(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return 0;

  // Support both 0..1 and 0..100 API scores
  if (n > 1 && n <= 100) return n / 100;

  return Math.max(0, Math.min(1, n));
}

function normalizeScores(rawScores) {
  const out = {};

  if (!rawScores || typeof rawScores !== "object") {
    return out;
  }

  for (const [rawLabel, rawValue] of Object.entries(rawScores)) {
    const label = canonicalLabel(rawLabel);
    const value = normalizeScoreValue(rawValue);

    out[label] = Math.max(out[label] || 0, value);
  }

  return out;
}

function normalizeTriggeredLabels(r) {
  const raw =
    Array.isArray(r?.triggered_labels)
      ? r.triggered_labels
      : Array.isArray(r?.triggered)
        ? r.triggered
        : Array.isArray(r?.labels)
          ? r.labels
          : Array.isArray(r?.verdict?.triggered_labels)
            ? r.verdict.triggered_labels
            : [];

  return raw.map(canonicalLabel);
}

function normalizeApiResult(r) {
  const { enabledLabels } = buildContractSettingsFromUI();
  const enabled = new Set(enabledLabels);

  const scores = normalizeScores(r?.scores || r?.probabilities || r?.confidence || {});

  const triggered = normalizeTriggeredLabels(r)
    .filter((label) => enabled.has(label));

  const is_toxic = triggered.length > 0;

  return {
    scores,
    triggered_labels: triggered,
    is_toxic,
    meta: {
      ...(r?.meta || {}),
      mode: "remote"
    }
  };
}

async function classifyTextsRemote(texts) {
  const { strictness } = buildContractSettingsFromUI();

  const rawResults = await bgPredictBatch(texts, strictness);

  const out = new Array(texts.length);

  for (let i = 0; i < texts.length; i++) {
    out[i] = normalizeApiResult(rawResults[i]);

    if (out[i] == null) {
      out[i] = makeCleanResult();
    }
  }

  return out;
}

async function classifyTexts(texts) {
  const mode = String(settings.inferenceMode || "local").toLowerCase();

  if (mode === "remote") {
    return classifyTextsRemote(texts);
  }

  return classifyTextsLocal(texts);
}

// ---------------- DOM helpers ----------------

function isBadParent(el) {
  if (!el) return true;

  const tag = el.tagName?.toLowerCase();

  if (!tag) return true;

  return (
    tag === "script" ||
    tag === "style" ||
    tag === "textarea" ||
    tag === "input" ||
    tag === "noscript" ||
    tag === "select" ||
    tag === "option" ||
    el.isContentEditable
  );
}

function isPotentiallyVisible(el) {
  if (!el || typeof el.getBoundingClientRect !== "function") return false;

  const style = window.getComputedStyle(el);

  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }

  const rect = el.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) {
    return false;
  }

  return (
    rect.bottom >= -VIEWPORT_MARGIN &&
    rect.top <= window.innerHeight + VIEWPORT_MARGIN
  );
}

function shouldConsiderTextNode(node, forceFull = false) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return false;
  if (!node.nodeValue) return false;

  const signature = normalizeTextForModel(node.nodeValue);

  if (signature.length < MIN_TEXT_LENGTH) return false;

  const parent = node.parentElement;

  if (!parent) return false;
  if (isBadParent(parent)) return false;
  if (parent.closest?.("span[data-ttd]")) return false;

  if (!forceFull && !isPotentiallyVisible(parent)) return false;

  const meta = textMeta.get(node);

  if (!forceFull && meta?.signature === signature) return false;

  return true;
}

function collectCandidateTextNodes(limit = MAX_SCAN_NODES, forceFull = false) {
  const out = [];
  const root = document.body || document.documentElement;

  if (!root) return out;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);

  while (walker.nextNode()) {
    const node = walker.currentNode;

    if (!shouldConsiderTextNode(node, forceFull)) continue;

    const signature = normalizeTextForModel(node.nodeValue);

    textMeta.set(node, { signature });
    out.push(node);

    if (out.length >= limit) break;
  }

  return out;
}

function bindMarkerClick(marker) {
  if (marker.__ttdClickBound) return;

  marker.__ttdClickBound = true;

  marker.addEventListener("click", () => {
    if (marker.classList.contains("ttd-blur")) {
      marker.classList.remove("ttd-blur");
    } else if (marker.classList.contains("ttd-mark") && settings.autoBlur) {
      marker.classList.add("ttd-blur");
    }

    reportStats();
  });
}

function createMarkerFromTextNode(textNode) {
  if (!textNode?.parentNode) return null;

  const originalText = textNode.nodeValue || "";

  const marker = document.createElement("span");
  marker.setAttribute("data-ttd", "1");
  marker.dataset.ttdOriginalText = originalText;

  const textSpan = document.createElement("span");
  textSpan.className = "ttd-text";
  textSpan.textContent = originalText;

  marker.appendChild(textSpan);

  textNode.parentNode.replaceChild(marker, textNode);

  bindMarkerClick(marker);
  activeMarkers.add(marker);

  return marker;
}

function prettyLabel(label) {
  const map = {
    toxic: "Toxicity",
    severe_toxic: "Severe toxicity",
    obscene: "Profanity",
    insult: "Insult",
    threat: "Threat",
    identity_hate: "Identity attack"
  };

  return map[label] || String(label || "Unknown");
}

function getTopLabelInfo(result) {
  const scores = result?.scores || {};

  const triggered = Array.isArray(result?.triggered_labels)
    ? result.triggered_labels
    : [];

  // Prefer specific labels over generic toxicity
  const priority = [
    "threat",
    "identity_hate",
    "insult",
    "obscene",
    "severe_toxic",
    "toxic"
  ];

  const labelsToCheck = triggered.length > 0
    ? triggered
    : Object.keys(scores);

  let bestLabel = "";
  let bestScore = 0;

  for (const label of priority) {
    if (!labelsToCheck.includes(label)) continue;

    const value = Number(scores[label]);

    if (Number.isFinite(value)) {
      bestLabel = label;
      bestScore = value;
      break;
    }
  }

  // fallback if something unexpected happens
  if (!bestLabel) {
    for (const label of labelsToCheck) {
      const value = Number(scores[label]);

      if (Number.isFinite(value) && value >= bestScore) {
        bestLabel = label;
        bestScore = value;
      }
    }
  }

  return {
    label: bestLabel,
    labelPretty: prettyLabel(bestLabel),
    score: bestScore
  };
}

function formatTriggeredDetails(result) {
  const scores = result?.scores || {};
  const triggered = Array.isArray(result?.triggered_labels)
    ? result.triggered_labels
    : [];

  if (!triggered.length) return "—";

  return triggered
    .map((label) => {
      const score = Number(scores[label]);
      const percent = Number.isFinite(score) ? ` ${Math.round(score * 100)}%` : "";
      return `${prettyLabel(label)}${percent}`;
    })
    .join(", ");
}

function updateMarkerPresentation(marker, result) {
  if (!marker) return;

  marker.classList.add("ttd-mark");
  marker.classList.toggle("ttd-blur", !!settings.autoBlur);

  let badge = marker.querySelector(".ttd-badge");

  if (settings.showConfidence) {
    const { labelPretty, score } = getTopLabelInfo(result);
    const percent = Math.round(score * 100);

    if (!badge) {
      badge = document.createElement("span");
      badge.className = "ttd-badge";
      marker.appendChild(badge);
    }

    badge.textContent = score > 0
      ? `${labelPretty} · ${percent}%`
      : labelPretty;

    marker.title =
      `verdict=${result?.is_toxic ? "toxic" : "clean"} | ` +
      `labels: ${formatTriggeredDetails(result)}`;
  } else {
    if (badge) badge.remove();
    marker.removeAttribute("title");
  }
}

function unwrapMarker(marker) {
  if (!marker) return null;

  activeMarkers.delete(marker);

  if (!marker.isConnected || !marker.parentNode) {
    return null;
  }

  const originalText =
    marker.dataset?.ttdOriginalText ||
    marker.querySelector?.(".ttd-text")?.textContent ||
    marker.textContent ||
    "";

  const textNode = document.createTextNode(originalText);

  marker.parentNode.replaceChild(textNode, marker);

  textMeta.set(textNode, {
    signature: normalizeTextForModel(textNode.nodeValue)
  });

  return textNode;
}

function pruneDetachedMarkers() {
  for (const marker of [...activeMarkers]) {
    if (!marker.isConnected) {
      activeMarkers.delete(marker);
    }
  }
}

// ---------------- classification pipeline ----------------

function getEntityText(entity) {
  if (entity.kind === "text") {
    return normalizeTextForModel(entity.node.nodeValue);
  }

  const original =
    entity.node.dataset?.ttdOriginalText ||
    entity.node.querySelector?.(".ttd-text")?.textContent ||
    entity.node.textContent;

  return normalizeTextForModel(original);
}

async function classifyEntities(entities) {
  const results = new Array(entities.length);

  const uncachedTexts = [];
  const uncachedIndexes = [];

  const cachePrefix = getDetectionCachePrefix();

  for (let i = 0; i < entities.length; i++) {
    const text = getEntityText(entities[i]);
    const cacheKey = `${cachePrefix}|${text}`;
    const cached = resultCache.get(cacheKey);

    if (cached) {
      results[i] = cached;
    } else {
      uncachedTexts.push(text);
      uncachedIndexes.push(i);
    }
  }

  for (let offset = 0; offset < uncachedTexts.length; offset += CLASSIFY_BATCH_SIZE) {
    const batchTexts = uncachedTexts.slice(offset, offset + CLASSIFY_BATCH_SIZE);
    const batchIndexes = uncachedIndexes.slice(offset, offset + CLASSIFY_BATCH_SIZE);

    let batchResults;

    try {
      batchResults = await classifyTexts(batchTexts);
    } catch (e) {
      console.warn("[TTD] batch failed:", e);
      batchResults = batchTexts.map(() => makeCleanResult());
    }

    for (let j = 0; j < batchTexts.length; j++) {
      const text = batchTexts[j];
      const result = batchResults[j] || makeCleanResult();
      const cacheKey = `${cachePrefix}|${text}`;

      resultCache.set(cacheKey, result);
      results[batchIndexes[j]] = result;
    }
  }

  return results;
}

function applyResultToEntity(entity, result) {
  const isToxic = !!result?.is_toxic;

  if (entity.kind === "text") {
    if (!isToxic) return;
    if (!entity.node?.isConnected || !entity.node.parentNode) return;

    const marker = createMarkerFromTextNode(entity.node);

    if (!marker) return;

    updateMarkerPresentation(marker, result);
    return;
  }

  if (!entity.node?.isConnected) {
    activeMarkers.delete(entity.node);
    return;
  }

  if (!isToxic) {
    unwrapMarker(entity.node);
    return;
  }

  updateMarkerPresentation(entity.node, result);
}

// ---------------- stats + cleanup ----------------

function getCurrentStats() {
  pruneDetachedMarkers();

  let detectedCount = 0;
  let blockedCount = 0;

  for (const marker of activeMarkers) {
    detectedCount += 1;

    if (marker.classList.contains("ttd-blur")) {
      blockedCount += 1;
    }
  }

  const activeCategoryCount = Object.values(settings.categories || {})
    .filter(Boolean)
    .length;

  return {
    detectedCount,
    blockedCount,
    activeCategoryCount
  };
}

function reportStats() {
  return getCurrentStats();
}

function clearTTDDecorations() {
  pruneDetachedMarkers();

  for (const marker of [...activeMarkers]) {
    unwrapMarker(marker);
  }

  reportStats();
}

// ---------------- scan loop ----------------

async function scanOnce(forceFull = false) {
  if (!settings.enabled || domainIsWhitelisted()) {
    clearTTDDecorations();
    return;
  }

  injectStyles();
  pruneDetachedMarkers();

  const entities = [];

  if (forceFull) {
    for (const marker of activeMarkers) {
      if (marker.isConnected) {
        entities.push({
          kind: "marker",
          node: marker
        });
      }
    }
  }

  const textNodes = collectCandidateTextNodes(MAX_SCAN_NODES, forceFull);

  for (const node of textNodes) {
    entities.push({
      kind: "text",
      node
    });
  }

  if (!entities.length) {
    reportStats();
    return;
  }

  const results = await classifyEntities(entities);

  for (let i = 0; i < entities.length; i++) {
    applyResultToEntity(entities[i], results[i]);
  }

  reportStats();
}

async function runScheduledScan() {
  if (scanInFlight) {
    rescanQueued = true;
    return;
  }

  scanInFlight = true;

  try {
    do {
      const forceFull = fullRescanRequested;

      fullRescanRequested = false;
      rescanQueued = false;

      await scanOnce(forceFull);
    } while (rescanQueued);
  } catch (e) {
    console.warn("[TTD] scan failed:", e);
    reportStats();
  } finally {
    scanInFlight = false;
  }
}

function scheduleScan(delay = 400, options = {}) {
  if (options.full) {
    fullRescanRequested = true;
  }

  clearTimeout(scanTimer);

  scanTimer = setTimeout(() => {
    runScheduledScan().catch(() => reportStats());
  }, delay);
}

function startObserver() {
  if (observer) return;

  observer = new MutationObserver(() => {
    scheduleScan(600);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });

  window.addEventListener(
    "scroll",
    () => scheduleScan(250),
    { passive: true }
  );
}

// ---------------- messaging ----------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "TTD_RESCAN") {
    scheduleScan(0, { full: true });
    sendResponse?.({ ok: true });
    return true;
  }

  if (msg?.type === "TTD_GET_PAGE_STATS") {
    sendResponse({
      ok: true,
      payload: getCurrentStats()
    });

    return true;
  }
});

// ---------------- bootstrap ----------------

(async function initTTD() {
  if (!/^https?:$/.test(location.protocol)) return;

  try {
    await loadSettings();

    if (!document.documentElement) return;

    console.log("[TTD] content script loaded", {
      mode: settings.inferenceMode,
      tf_exists: !!globalThis.tf,
      tf_setBackend: typeof globalThis.tf?.setBackend,
      tf_loadGraphModel: typeof globalThis.tf?.loadGraphModel
    });

    startObserver();
    scheduleScan(0, { full: true });
  } catch (e) {
    console.warn("[TTD] init failed:", e);
  }
})();