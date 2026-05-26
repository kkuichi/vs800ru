(() => {
  const LABELS = [
    "toxic",
    "severe_toxic",
    "obscene",
    "insult",
    "threat",
    "identity_hate"
  ];

  const BASE_THRESHOLDS = {
    toxic: 0.90,
    severe_toxic: 0.94,
    obscene: 0.94,
    insult: 0.92,
    threat: 0.94,
    identity_hate: 0.94
  };

  function clamp01(x) 
  {
    const n = Number(x);
    if (Number.isNaN(n)) return 0;
    return Math.min(1, Math.max(0, n));
  }

  function isLabel(x) 
  {
    return LABELS.includes(x);
  }

  function normalizeRequest(req) 
  {
    const text = String(req?.text ?? "").trim();
    const strictness = clamp01(req?.settings?.strictness ?? 0.5);
    const enabledRaw = Array.isArray(req?.settings?.enabledLabels)
      ? req.settings.enabledLabels
      : [...LABELS];

    const enabledLabels = enabledRaw.map(String).filter(isLabel);
    const finalEnabled = enabledLabels.length ? enabledLabels : [...LABELS];
    return {
      ...req,
      text,
      settings: {
        strictness,
        enabledLabels: finalEnabled
      }
    };
  }

  function normalizeScores(raw) 
  {
    const out = {};
    for (const label of LABELS)
    {
      out[label] = clamp01(raw?.[label]);
    }
    return out;
  }

  function applyStrictness(base, strictness, k = 0.25) 
  {
    const s = clamp01(strictness);
    const shift = (s - 0.5) * k;
    const out = {};
    for (const label of LABELS) 
    {
      out[label] = clamp01(base[label] - shift);
    }

    return out;
  }

  function computeVerdict(scores, thresholds, enabledLabels) 
  {
    const triggered = [];
    for (const label of enabledLabels) 
    {
      if (scores[label] >= thresholds[label]) 
      {
        triggered.push(label);
      }
    }

    return {
      verdict: triggered.length ? "toxic" : "non_toxic",
      triggered
    };
  }

  function buildDetectionResponse({
    mode,
    model,
    request,
    rawScores,
    baseThresholds = BASE_THRESHOLDS,
    startedAtMs,
    finishedAtMs
  }) {
    const req = normalizeRequest(request);
    const scores = normalizeScores(rawScores);
    const thresholds = applyStrictness(baseThresholds, req.settings.strictness);
    const { verdict, triggered } = computeVerdict(
      scores,
      thresholds,
      req.settings.enabledLabels
    );

    const latency_ms = Math.max(0, (finishedAtMs ?? 0) - (startedAtMs ?? 0));
    return {
      mode,
      model,
      scores,
      thresholds,
      verdict,
      triggered,
      latency_ms,
      error: null
    };
  }

  const api = {
    LABELS,
    BASE_THRESHOLDS,
    normalizeRequest,
    normalizeScores,
    applyStrictness,
    computeVerdict,
    buildDetectionResponse
  };

  if (typeof self !== "undefined") self.TTDContract = api;
  if (typeof window !== "undefined") window.TTDContract = api;
})();