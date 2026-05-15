const TOKEN_KEY = "ttd_remote_token";
const API_URL_KEY = "ttd_remote_api_url";
const DEFAULT_API_BASE = "https://api-m3jhrljqsq-ew.a.run.app";
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
  if (hasEndpoint) return v.replace(/\/+$/, "");
  return `${v.replace(/\/+$/, "")}/predict_batch`;
}

async function getApiUrl() 
{
  const res = await chrome.storage.sync.get([API_URL_KEY]);
  return normalizeApiUrl(res[API_URL_KEY] || DEFAULT_API_BASE);
}
//--------------------------------------------------------------------------------------------------------
// ---- single batch call ----
//--------------------------------------------------------------------------------------------------------
async function predictBatch(texts, strictness, token, apiUrl) 
{
  const resp = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      texts,        
      strictness
    })
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
}
//--------------------------------------------------------------------------------------------------------
// ---- batching helpers ----
//--------------------------------------------------------------------------------------------------------

const MAX_BATCH = 32;         
const BATCH_CONCURRENCY = 2;   
function chunkArray(arr, size) 
{
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
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

async function predictBatchedAll(texts, strictness, token, apiUrl) {
  const clean = texts.map((t) => String(t || ""));
  if (clean.length === 0) return [];
  const chunks = chunkArray(clean, MAX_BATCH);
  const chunkResults = await mapLimit(chunks, BATCH_CONCURRENCY, async (chunk) => {
    return await predictBatch(chunk, strictness, token, apiUrl);
  });

  return chunkResults.flat();
}

//--------------------------------------------------------------------------------------------------------
// ---- message handler ----
//--------------------------------------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "TTD_RESCAN_ACTIVE_TAB") {
    (async () => {
      try {
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
          try {
            await chrome.tabs.sendMessage(activeTab.id, { type: "TTD_RESCAN" });
            sendResponse({ ok: true, target: "active_tab" });
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
          try {
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
    } 
    catch (e) 
    {
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

  if (msg?.type === "TTD_REMOTE_PREDICT_BATCH") {
    (async () => {
      try 
      {
        const { texts, strictness } = msg.payload || {};
        if (!Array.isArray(texts)) 
        {
          sendResponse({ ok: false, error: "Bad payload: texts must be an array." });
          return;
        }

        if (typeof strictness !== "number") 
        {
          sendResponse({ ok: false, error: "Bad payload: strictness must be a number." });
          return;
        }
        const token = await getToken();
        const apiUrl = await getApiUrl();
        const results = await predictBatchedAll(
          texts,
          strictness,
          token,
          apiUrl
        );

        sendResponse({ ok: true, results });
      } 
      catch (e)
      {
        sendResponse({
          ok: false,
          error: String(e?.message || e)
        });
      }
    })();

    return true;
  }
});