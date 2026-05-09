// background.js — MV3 service worker

const TOKEN_KEY = "ttd_remote_token";
const API_URL_KEY = "ttd_remote_api_url";

const DEFAULT_API_BASE = "https://api-m3jhrljqsq-ew.a.run.app";

// ---- helpers ----

async function getToken() {
  const res = await chrome.storage.sync.get([TOKEN_KEY]);
  const token = res[TOKEN_KEY];
  return typeof token === "string" && token.trim() ? token.trim() : null;
}

function normalizeApiUrl(value) {
  const v = String(value || "").trim();
  if (!v) return `${DEFAULT_API_BASE}/predict_batch`;

  // If user entered /predict or /predict_batch already, keep it.
  const hasEndpoint = /\/predict(_batch)?\/?$/.test(v);
  if (hasEndpoint) return v.replace(/\/+$/, "");

  // Otherwise append /predict_batch
  return `${v.replace(/\/+$/, "")}/predict_batch`;
}

async function getApiUrl() {
  const res = await chrome.storage.sync.get([API_URL_KEY]);
  return normalizeApiUrl(res[API_URL_KEY] || DEFAULT_API_BASE);
}

// ---- single batch call ----

async function predictBatch(texts, strictness, token, apiUrl) {
  const resp = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      texts,        // IMPORTANT: batch payload
      strictness
    })
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`API ${resp.status}: ${body.slice(0, 300)}`);
  }

  const json = await resp.json();

  // Your FastAPI returns: { results: [...], meta: {...} }
  // But we allow fallback shapes just in case.
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.results)) return json.results;

  // If server accidentally returned a single object:
  if (json && typeof json === "object" && json.scores && json.verdict) return [json];

  throw new Error("Unexpected API response shape");
}

// ---- message handler ----

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // Rescan request from popup/options page
  if (msg?.type === "TTD_RESCAN_ACTIVE_TAB") {
    (async () => {
      try {
        // First try active tab in current window
        const [activeTab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });

        const isWebTab =
          activeTab?.id &&
          typeof activeTab.url === "string" &&
          /^https?:\/\//.test(activeTab.url);

        if (isWebTab) {
          try {
            await chrome.tabs.sendMessage(activeTab.id, { type: "TTD_RESCAN" });
            sendResponse({ ok: true, target: "active_tab" });
            return;
          } catch {
            // Active tab is web page, but content script may not be ready.
            // Continue to fallback and try all web tabs.
          }
        }
        // Fallback: options page is active, so rescan all web tabs
        const tabs = await chrome.tabs.query({
          url: ["http://*/*", "https://*/*"]
        });

        let successCount = 0;

        for (const tab of tabs) {
          if (!tab.id) continue;

          try {
            await chrome.tabs.sendMessage(tab.id, { type: "TTD_RESCAN" });
            successCount += 1;
          } catch {
            // Content script may not be ready in some tabs. Ignore.
          }
        }

        sendResponse({
          ok: true,
          target: "all_web_tabs",
          rescannedTabs: successCount
        });
      } catch (e) {
        sendResponse({
          ok: false,
          error: String(e?.message || e)
        });
      }
    })();

    return true;
  }

  // Remote API prediction
  if (msg?.type === "TTD_REMOTE_PREDICT_BATCH") {
    (async () => {
      try {
        const { texts, strictness } = msg.payload || {};

        if (!Array.isArray(texts)) {
          sendResponse({ ok: false, error: "Bad payload: texts must be an array." });
          return;
        }

        if (typeof strictness !== "number") {
          sendResponse({ ok: false, error: "Bad payload: strictness must be a number." });
          return;
        }

        const token = await getToken();
        const apiUrl = await getApiUrl();

        const results = await predictBatch(
          texts.map((t) => String(t || "")),
          strictness,
          token,
          apiUrl
        );

        sendResponse({ ok: true, results });
      } catch (e) {
        sendResponse({
          ok: false,
          error: String(e?.message || e)
        });
      }
    })();

    return true;
  }
});