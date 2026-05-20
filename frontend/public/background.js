const TOKEN_KEY = "ttd_remote_token";
const API_URL_KEY = "ttd_remote_api_url";
const API_LAST_WORKING_URL_KEY = "ttd_last_working_api_url";

const DEFAULT_API_BASE = "https://api-m3jhrljqsq-ew.a.run.app";

const LOCAL_FALLBACK_API_BASES = [
  "http://127.0.0.1:8000",
  "http://localhost:8000"
];

const REQUEST_TIMEOUT_MS = 8000;

//--------------------------------------------------------------------------------------------------------
// ---- helpers ----
//--------------------------------------------------------------------------------------------------------

async function getToken() 
{
  const res = await chrome.storage.sync.get([TOKEN_KEY]);
  const token = res[TOKEN_KEY];
  return typeof token === "string" && token.trim() ? token.trim() : null;
}

function normalizeApiUrl(value) 
{
  const v = String(value || "").trim();
  if (!v) return `${DEFAULT_API_BASE}/predict_batch`;
  const hasEndpoint = /\/predict(_batch)?\/?$/.test(v);
  if (hasEndpoint) 
  {
    return v.replace(/\/+$/, "");
  }

  return `${v.replace(/\/+$/, "")}/predict_batch`;
}

async function getConfiguredApiUrl() 
{
  const res = await chrome.storage.sync.get([API_URL_KEY]);
  return normalizeApiUrl(res[API_URL_KEY] || DEFAULT_API_BASE);
}

async function getApiCandidates() 
{
  const configuredApiUrl = await getConfiguredApiUrl();
  const localFallbacks = LOCAL_FALLBACK_API_BASES.map(normalizeApiUrl);
  const urls = [
    configuredApiUrl,
    ...localFallbacks
  ];

  return [...new Set(urls)];
}

function isLocalApiUrl(apiUrl) 
{
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(apiUrl);
}

function createTimeoutSignal(timeoutMs) 
{
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId)
  };
}

async function saveLastWorkingApiUrl(apiUrl) 
{
  await chrome.storage.local.set({
    [API_LAST_WORKING_URL_KEY]: apiUrl
  });
}

//--------------------------------------------------------------------------------------------------------
// ---- single batch call ----
//--------------------------------------------------------------------------------------------------------

async function predictBatch(texts, strictness, token, apiUrl) 
{
  const timeout = createTimeoutSignal(REQUEST_TIMEOUT_MS);
  try 
  {
    const headers = {
      "Content-Type": "application/json"
    };

    if (token && !isLocalApiUrl(apiUrl)) 
    {
      headers.Authorization = `Bearer ${token}`;
    }

    const resp = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        texts,
        strictness
      }),
      signal: timeout.signal
    });

    if (!resp.ok) 
    {
      const body = await resp.text().catch(() => "");
      throw new Error(`API ${resp.status}: ${body.slice(0, 300)}`);
    }

    const json = await resp.json();
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.results)) return json.results;
    if (json && typeof json === "object" && json.scores && json.verdict) return [json];
    throw new Error("Unexpected API response shape");
  } finally {
    timeout.clear();
  }
}

//--------------------------------------------------------------------------------------------------------
// ---- fallback prediction ----
//--------------------------------------------------------------------------------------------------------

async function predictBatchWithFallback(texts, strictness, token) 
{
  const candidates = await getApiCandidates();
  const errors = [];
  for (const apiUrl of candidates) 
  {
    try 
    {
      const result = await predictBatch(texts, strictness, token, apiUrl);
      await saveLastWorkingApiUrl(apiUrl);

      return {
        results: result,
        usedApiUrl: apiUrl,
        fallbackUsed: apiUrl !== candidates[0]
      };
    } catch (e) {
      errors.push(`${apiUrl} -> ${String(e?.message || e)}`);
    }
  }

  throw new Error(`All API endpoints failed. ${errors.join(" | ")}`);
}

//--------------------------------------------------------------------------------------------------------
// ---- batching helpers ----
//--------------------------------------------------------------------------------------------------------

const MAX_BATCH = 32;
const BATCH_CONCURRENCY = 2;
function chunkArray(arr, size) 
{
  const out = [];
  for (let i = 0; i < arr.length; i += size) 
  {
    out.push(arr.slice(i, i + size));
  }

  return out;
}

function mapLimit(items, limit, mapper) 
{
  let i = 0;
  const results = new Array(items.length);
  const workers = new Array(Math.min(limit, items.length))
    .fill(0)
    .map(async () => {
      while (true) {
        const idx = i++;

        if (idx >= items.length) break;

        results[idx] = await mapper(items[idx], idx);
      }
    });

  return Promise.all(workers).then(() => results);
}

async function predictBatchedAll(texts, strictness, token) 
{
  const clean = texts.map((t) => String(t || ""));
  if (clean.length === 0) 
  {
    return {
      results: [],
      usedApiUrl: null,
      fallbackUsed: false
    };
  }

  const chunks = chunkArray(clean, MAX_BATCH);
  let usedApiUrl = null;
  let fallbackUsed = false;
  const chunkResults = await mapLimit(chunks, BATCH_CONCURRENCY, async (chunk) => {
    const response = await predictBatchWithFallback(chunk, strictness, token);
    usedApiUrl = response.usedApiUrl;
    fallbackUsed = fallbackUsed || response.fallbackUsed;

    return response.results;
  });

  return {
    results: chunkResults.flat(),
    usedApiUrl,
    fallbackUsed
  };
}

//--------------------------------------------------------------------------------------------------------
// ---- admin/config helpers ----
//--------------------------------------------------------------------------------------------------------

async function getRemoteAdminConfig() 
{
  const syncData = await chrome.storage.sync.get([
    TOKEN_KEY,
    API_URL_KEY
  ]);

  const localData = await chrome.storage.local.get([
    API_LAST_WORKING_URL_KEY
  ]);

  return {
    apiUrl: normalizeApiUrl(syncData[API_URL_KEY] || DEFAULT_API_BASE),
    rawApiUrl: syncData[API_URL_KEY] || DEFAULT_API_BASE,
    hasToken: Boolean(syncData[TOKEN_KEY]),
    localFallbacks: LOCAL_FALLBACK_API_BASES.map(normalizeApiUrl),
    lastWorkingApiUrl: localData[API_LAST_WORKING_URL_KEY] || null
  };
}

async function setRemoteAdminConfig(payload) 
{
  const updates = {};
  if (typeof payload?.apiUrl === "string") 
  {
    updates[API_URL_KEY] = payload.apiUrl.trim();
  }

  if (typeof payload?.token === "string") 
  {
    updates[TOKEN_KEY] = payload.token.trim();
  }

  await chrome.storage.sync.set(updates);
  return getRemoteAdminConfig();
}

async function resetRemoteAdminConfig() 
{
  await chrome.storage.sync.remove([
    API_URL_KEY,
    TOKEN_KEY
  ]);

  await chrome.storage.local.remove([
    API_LAST_WORKING_URL_KEY
  ]);

  return getRemoteAdminConfig();
}

async function testRemoteApi(apiUrlValue) 
{
  const token = await getToken();
  const apiUrl = normalizeApiUrl(apiUrlValue || (await getConfiguredApiUrl()));
  const response = await predictBatch(
    ["This is a test message."],
    0.5,
    token,
    apiUrl
  );

  return {
    ok: true,
    apiUrl,
    sampleResult: response[0] || null
  };
}

//--------------------------------------------------------------------------------------------------------
// ---- message handler ----
//--------------------------------------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "TTD_RESCAN_ACTIVE_TAB") {
    (async () => {
      try 
      {
        const [activeTab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });

        const isWebTab =
          activeTab?.id &&
          typeof activeTab.url === "string" &&
          /^https?:\/\//.test(activeTab.url);

        if (isWebTab) 
        {
          try 
          {
            await chrome.tabs.sendMessage(activeTab.id, { type: "TTD_RESCAN" });
            sendResponse({
              ok: true,
              target: "active_tab"
            });

            return;
          } catch {}
        }

        const tabs = await chrome.tabs.query({
          url: ["http://*/*", "https://*/*"]
        });

        let successCount = 0;

        for (const tab of tabs) 
        {
          if (!tab.id) continue;
          try 
          {
            await chrome.tabs.sendMessage(tab.id, { type: "TTD_RESCAN" });
            successCount += 1;
          } catch {}
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

  if (msg?.type === "TTD_GET_STATS") 
  {
    (async () => {
      try 
      {
        const [activeTab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });

        const isWebTab =
          activeTab?.id &&
          typeof activeTab.url === "string" &&
          /^https?:\/\//.test(activeTab.url);

        if (!isWebTab) 
        {
          sendResponse({
            ok: true,
            payload: {
              detectedCount: 0,
              blockedCount: 0,
              activeCategoryCount: 0
            },
            error: "Active tab is not a normal web page."
          });

          return;
        }

        chrome.tabs.sendMessage(
          activeTab.id,
          { type: "TTD_GET_PAGE_STATS" },
          (resp) => {
            const err = chrome.runtime.lastError;

            if (err)
              {
              sendResponse({
                ok: true,
                payload: {
                  detectedCount: 0,
                  blockedCount: 0,
                  activeCategoryCount: 0
                },
                error: err.message
              });

              return;
            }

            sendResponse(
              resp?.ok
                ? resp
                : {
                    ok: true,
                    payload: {
                      detectedCount: 0,
                      blockedCount: 0,
                      activeCategoryCount: 0
                    }
                  }
            );
          }
        );
      } catch (e) {
        sendResponse({
          ok: true,
          payload: {
            detectedCount: 0,
            blockedCount: 0,
            activeCategoryCount: 0
          },
          error: String(e?.message || e)
        });
      }
    })();

    return true;
  }

  if (msg?.type === "TTD_REMOTE_PREDICT_BATCH") 
  {
    (async () => {
      try 
      {
        const { texts, strictness } = msg.payload || {};

        if (!Array.isArray(texts)) 
        {
          sendResponse({
            ok: false,
            error: "Bad payload: texts must be an array."
          });

          return;
        }

        if (typeof strictness !== "number") 
        {
          sendResponse({
            ok: false,
            error: "Bad payload: strictness must be a number."
          });

          return;
        }

        const token = await getToken();
        const response = await predictBatchedAll(
          texts,
          strictness,
          token
        );

        sendResponse({
          ok: true,
          results: response.results,
          usedApiUrl: response.usedApiUrl,
          fallbackUsed: response.fallbackUsed
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

  //------------------------------------------------------------------------------------
  // ---- small admin tools for Settings page ----
  //------------------------------------------------------------------------------------

  if (msg?.type === "TTD_GET_REMOTE_ADMIN_CONFIG") 
  {
    (async () => {
      try 
      {
        const config = await getRemoteAdminConfig();
        sendResponse({
          ok: true,
          config
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

  if (msg?.type === "TTD_SET_REMOTE_ADMIN_CONFIG") 
  {
    (async () => {
      try 
      {
        const config = await setRemoteAdminConfig(msg.payload || {});

        sendResponse({
          ok: true,
          config
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

  if (msg?.type === "TTD_RESET_REMOTE_ADMIN_CONFIG") 
  {
    (async () => {
      try {
        const config = await resetRemoteAdminConfig();

        sendResponse({
          ok: true,
          config
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

  if (msg?.type === "TTD_TEST_REMOTE_API") 
  {
    (async () => {
      try {
        const result = await testRemoteApi(msg.payload?.apiUrl);

        sendResponse({
          ok: true,
          result
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
});