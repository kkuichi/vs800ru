import { useCallback, useEffect, useState } from "react";

const EMPTY_STATS = {
  detectedCount: 0,
  blockedCount: 0,
  activeCategoryCount: 0
};

export function useTabStats(pollMs = 800) 
{
  const [stats, setStats] = useState(EMPTY_STATS);
  const refresh = useCallback(() => {
    if (!globalThis.chrome?.runtime?.sendMessage) return;

    chrome.runtime.sendMessage({ type: "TTD_GET_STATS" }, (res) => {
      const err = chrome.runtime.lastError;

      if (err) 
      {
        setStats(EMPTY_STATS);
        return;
      }

      if (res?.ok && res.payload) 
      {
        setStats({
          detectedCount: Number(res.payload.detectedCount || 0),
          blockedCount: Number(res.payload.blockedCount || 0),
          activeCategoryCount: Number(res.payload.activeCategoryCount || 0)
        });
      }
    });
  }, []);

  useEffect(() => {
    refresh();

    const t = setInterval(refresh, pollMs);

    return () => clearInterval(t);
  }, [refresh, pollMs]);

  return { stats, refresh };
}