import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import * as tf from "@tensorflow/tfjs-core";
import { loadGraphModel } from "@tensorflow/tfjs-converter";
import "@tensorflow/tfjs-backend-wasm";
import "@tensorflow/tfjs-backend-cpu";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";

import { parse } from "csv-parse/sync";

const LABELS = [
  "toxic",
  "severe_toxic",
  "obscene",
  "insult",
  "threat",
  "identity_hate"
];

const CHAR_MAX_LEN = 256;
const MODEL_DIR = path.resolve("public/local_char_model");

const csvPath = process.argv[2];
const limit = Number(process.argv[3] || 0);
const batchSizeArg = Number(process.argv[4] || 64);
const backendArg = String(process.argv[5] || "wasm").toLowerCase();

const BATCH_SIZE =
  Number.isFinite(batchSizeArg) && batchSizeArg > 0 ? batchSizeArg : 64;

if (!csvPath) {
  console.error("Usage:");
  console.error(
    "node scripts/evaluate-local-model.js <csvPath> [limit] [batchSize] [wasm|cpu]"
  );
  console.error("");
  console.error("Examples:");
  console.error("node scripts/evaluate-local-model.js jigsaw\\val.csv 50000 64 wasm");
  console.error("node scripts/evaluate-local-model.js jigsaw\\val.csv 50000 64 cpu");
  process.exit(1);
}

// ---------------- timing helpers ----------------

function nowMs() {
  return performance.now();
}

function roundMs(value) {
  return Number(value.toFixed(2));
}

function roundNumber(value) {
  return Number(value.toFixed(4));
}

// ---------------- text preprocessing ----------------

function normalizeForCharModel(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+|www\.\S+/g, "<url>")
    .replace(/@\w+/g, "<user>")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeBatch(texts, vocab) {
  const batchSize = texts.length;
  const out = new Int32Array(batchSize * CHAR_MAX_LEN);

  for (let i = 0; i < batchSize; i++) {
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

// ---------------- tensor helpers ----------------

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
  if (!x) return;

  if (Array.isArray(x)) {
    for (const item of x) item?.dispose?.();
    return;
  }

  if (typeof x === "object" && x.dataSync == null) {
    for (const key of Object.keys(x)) x[key]?.dispose?.();
    return;
  }

  x?.dispose?.();
}

function bufferToArrayBuffer(buffer) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
}

// ---------------- backend/model loading ----------------

async function setupBackend(backendName) {
  const start = nowMs();

  console.log("Setting backend...");

  if (backendName === "wasm") {
    const wasmDir = path.resolve(
      "node_modules",
      "@tensorflow",
      "tfjs-backend-wasm",
      "dist"
    );

    setWasmPaths(`file://${wasmDir.replace(/\\/g, "/")}/`);

    await tf.setBackend("wasm");
  } else if (backendName === "cpu") {
    await tf.setBackend("cpu");
  } else {
    throw new Error(`Unsupported backend: ${backendName}. Use "wasm" or "cpu".`);
  }

  await tf.ready();

  const end = nowMs();

  console.log("Backend:", tf.getBackend());
  console.log("TFJS version:", tf.version_core);

  return {
    requested_backend: backendName,
    actual_backend: tf.getBackend(),
    tfjs_version: tf.version_core,
    backend_setup_ms: roundMs(end - start)
  };
}

async function loadGraphModelFromLocalDir(modelDir) {
  const start = nowMs();

  const modelJsonPath = path.join(modelDir, "model.json");
  const modelJson = JSON.parse(fs.readFileSync(modelJsonPath, "utf8"));

  const weightSpecs = [];
  const weightBuffers = [];

  for (const group of modelJson.weightsManifest || []) {
    weightSpecs.push(...group.weights);

    for (const fileName of group.paths) {
      const filePath = path.join(modelDir, fileName);
      weightBuffers.push(fs.readFileSync(filePath));
    }
  }

  const weightData = bufferToArrayBuffer(Buffer.concat(weightBuffers));

  const ioHandler = {
    load: async () => ({
      modelTopology: modelJson.modelTopology,
      weightSpecs,
      weightData,
      format: modelJson.format,
      generatedBy: modelJson.generatedBy,
      convertedBy: modelJson.convertedBy
    })
  };

  const model = await loadGraphModel(ioHandler);

  const end = nowMs();

  return {
    model,
    timing: {
      model_load_ms: roundMs(end - start),
      input_name: model.inputs?.[0]?.name || "unknown",
      output_name: model.outputs?.[0]?.name || "unknown"
    }
  };
}

async function warmUpModel(model, vocab) {
  const inputName = model.inputs?.[0]?.name;

  if (!inputName) {
    throw new Error("Model input name not found during warm-up.");
  }

  const start = nowMs();

  const sampleTexts = [
    "This is a short warm up sentence for the local toxicity model."
  ];

  const idsFlat = tokenizeBatch(sampleTexts, vocab);
  const x = tf.tensor2d(idsFlat, [sampleTexts.length, CHAR_MAX_LEN], "int32");

  let y;

  try {
    y = model.execute({ [inputName]: x });
    const outTensor = firstTensor(y);

    if (outTensor) {
      await outTensor.data();
    }
  } finally {
    disposeModelOutput(y);
    x.dispose();
  }

  const end = nowMs();

  return {
    warmup_ms: roundMs(end - start)
  };
}

// ---------------- CSV helpers ----------------

function detectDelimiter(raw) {
  const firstLine = raw.split(/\r?\n/)[0] || "";

  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;

  return semicolonCount > commaCount ? ";" : ",";
}

function normalizeRowKeys(row) {
  const out = {};

  for (const [key, value] of Object.entries(row)) {
    const cleanKey = String(key)
      .replace(/^\uFEFF/, "")
      .trim();

    out[cleanKey] = value;
  }

  return out;
}

function readCsvRows(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const delimiter = detectDelimiter(raw);

  console.log("CSV delimiter:", delimiter);

  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    delimiter
  });

  return rows.map(normalizeRowKeys);
}

function getTextFromRow(row) {
  return row.comment_text ?? row.text ?? row.comment ?? "";
}

function toBinaryLabel(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0.5 ? 1 : 0;
}

// ---------------- metrics ----------------

function computeMetrics(yTrue, yScore, threshold) {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (let i = 0; i < yTrue.length; i++) {
    const actual = yTrue[i] === 1;
    const predicted = yScore[i] >= threshold;

    if (actual && predicted) tp++;
    else if (!actual && predicted) fp++;
    else if (!actual && !predicted) tn++;
    else if (actual && !predicted) fn++;
  }

  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);

  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);

  const accuracy = (tp + tn) / Math.max(1, tp + fp + tn + fn);

  return {
    tp,
    fp,
    tn,
    fn,
    precision,
    recall,
    f1,
    accuracy
  };
}

function findBestThreshold(yTrue, yScore) {
  let best = {
    threshold: 0.5,
    f1: -1,
    precision: 0,
    recall: 0,
    accuracy: 0,
    tp: 0,
    fp: 0,
    tn: 0,
    fn: 0
  };

  for (let t = 0.05; t <= 0.95; t += 0.01) {
    const threshold = Number(t.toFixed(2));
    const metrics = computeMetrics(yTrue, yScore, threshold);

    if (metrics.f1 > best.f1) {
      best = {
        threshold,
        ...metrics
      };
    }
  }

  return best;
}

// ---------------- prediction ----------------

async function predictAll(model, vocab, rows, batchSize = 64) {
  const inputName = model.inputs?.[0]?.name;

  if (!inputName) {
    throw new Error("Model input name not found.");
  }

  const allScores = [];

  const predictionStart = nowMs();

  let totalTokenizationMs = 0;
  let totalInferenceMs = 0;
  let totalBatchMs = 0;

  const batchTimes = [];

  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batchStart = nowMs();

    const batch = rows.slice(offset, offset + batchSize);
    const texts = batch.map((r) => r.comment_text);

    const tokenizeStart = nowMs();
    const idsFlat = tokenizeBatch(texts, vocab);
    const tokenizeEnd = nowMs();

    totalTokenizationMs += tokenizeEnd - tokenizeStart;

    const inferenceStart = nowMs();

    const x = tf.tensor2d(idsFlat, [texts.length, CHAR_MAX_LEN], "int32");

    let y;

    try {
      y = model.execute({ [inputName]: x });

      const outTensor = firstTensor(y);

      if (!outTensor) {
        throw new Error("Model output tensor missing.");
      }

      const data = await outTensor.data();

      for (let i = 0; i < texts.length; i++) {
        const o = i * 6;

        allScores.push({
          toxic: Number(data[o + 0] ?? 0),
          severe_toxic: Number(data[o + 1] ?? 0),
          obscene: Number(data[o + 2] ?? 0),
          insult: Number(data[o + 3] ?? 0),
          threat: Number(data[o + 4] ?? 0),
          identity_hate: Number(data[o + 5] ?? 0)
        });
      }
    } finally {
      disposeModelOutput(y);
      x.dispose();
    }

    const inferenceEnd = nowMs();
    totalInferenceMs += inferenceEnd - inferenceStart;

    const batchEnd = nowMs();
    const batchMs = batchEnd - batchStart;

    totalBatchMs += batchMs;
    batchTimes.push(batchMs);

    console.log(
      `Predicted ${Math.min(offset + batchSize, rows.length)} / ${rows.length}` +
        ` | batch=${roundMs(batchMs)} ms`
    );
  }

  const predictionEnd = nowMs();
  const predictionTotalMs = predictionEnd - predictionStart;

  const avgBatchMs =
    batchTimes.length > 0
      ? batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length
      : 0;

  const minBatchMs = batchTimes.length > 0 ? Math.min(...batchTimes) : 0;
  const maxBatchMs = batchTimes.length > 0 ? Math.max(...batchTimes) : 0;

  return {
    scores: allScores,
    timing: {
      rows: rows.length,
      batch_size: batchSize,
      batches: batchTimes.length,

      prediction_total_ms: roundMs(predictionTotalMs),
      tokenization_total_ms: roundMs(totalTokenizationMs),
      inference_total_ms: roundMs(totalInferenceMs),
      batch_loop_total_ms: roundMs(totalBatchMs),

      avg_batch_ms: roundMs(avgBatchMs),
      min_batch_ms: roundMs(minBatchMs),
      max_batch_ms: roundMs(maxBatchMs),

      avg_ms_per_text: roundNumber(predictionTotalMs / Math.max(1, rows.length)),
      throughput_texts_per_second: roundNumber(
        rows.length / Math.max(0.001, predictionTotalMs / 1000)
      )
    }
  };
}

// ---------------- main ----------------

async function main() {
  const totalStart = nowMs();

  const timing = {
    run_started_at: new Date().toISOString(),
    csv_path: path.resolve(csvPath),
    model_dir: MODEL_DIR,
    limit,
    batch_size: BATCH_SIZE,
    requested_backend: backendArg
  };

  const backendTiming = await setupBackend(backendArg);
  Object.assign(timing, backendTiming);

  console.log("Loading model from:", MODEL_DIR);

  const { model, timing: modelTiming } = await loadGraphModelFromLocalDir(
    MODEL_DIR
  );

  Object.assign(timing, modelTiming);

  console.log("Model loaded.");
  console.log("Input:", model.inputs?.[0]?.name);
  console.log("Output:", model.outputs?.[0]?.name);

  const vocabLoadStart = nowMs();

  const vocab = JSON.parse(
    fs.readFileSync(path.join(MODEL_DIR, "char_vocab.json"), "utf8")
  );

  timing.vocab_load_ms = roundMs(nowMs() - vocabLoadStart);

  const warmupTiming = await warmUpModel(model, vocab);
  Object.assign(timing, warmupTiming);

  const csvReadStart = nowMs();

  const rawRows = readCsvRows(csvPath);

  timing.csv_read_ms = roundMs(nowMs() - csvReadStart);
  timing.raw_rows = rawRows.length;

  const preprocessStart = nowMs();

  const limitedRawRows = limit > 0 ? rawRows.slice(0, limit) : rawRows;

  const rows = limitedRawRows
    .filter((r) => {
      const text = getTextFromRow(r);

      return (
        String(text || "").trim() &&
        LABELS.every((label) => r[label] !== undefined)
      );
    })
    .map((r) => ({
      comment_text: String(getTextFromRow(r)),
      labels: Object.fromEntries(
        LABELS.map((label) => [label, toBinaryLabel(r[label])])
      )
    }));

  timing.preprocess_ms = roundMs(nowMs() - preprocessStart);
  timing.rows_used = rows.length;

  console.log("Raw rows:", rawRows.length);
  console.log("Rows:", rows.length);

  if (!rows.length) {
    throw new Error("No valid rows found. Check CSV path and columns.");
  }

  const { scores, timing: predictionTiming } = await predictAll(
    model,
    vocab,
    rows,
    BATCH_SIZE
  );

  Object.assign(timing, predictionTiming);

  const suggestedThresholds = {};
  const report = {};

  for (const label of LABELS) {
    const yTrue = rows.map((r) => r.labels[label]);
    const yScore = scores.map((s) => s[label]);

    const best = findBestThreshold(yTrue, yScore);

    suggestedThresholds[label] = best.threshold;

    report[label] = {
      positives: yTrue.filter((x) => x === 1).length,
      best_threshold: best.threshold,
      precision: Number(best.precision.toFixed(4)),
      recall: Number(best.recall.toFixed(4)),
      f1: Number(best.f1.toFixed(4)),
      accuracy: Number(best.accuracy.toFixed(4)),
      tp: best.tp,
      fp: best.fp,
      tn: best.tn,
      fn: best.fn
    };
  }

  const overallTrue = rows.map((r) =>
    LABELS.some((label) => r.labels[label] === 1) ? 1 : 0
  );

  const overallScore = scores.map((s) =>
    Math.max(...LABELS.map((label) => s[label]))
  );

  const overallBest = findBestThreshold(overallTrue, overallScore);

  const overallReport = {
    positives: overallTrue.filter((x) => x === 1).length,
    best_threshold: overallBest.threshold,
    precision: Number(overallBest.precision.toFixed(4)),
    recall: Number(overallBest.recall.toFixed(4)),
    f1: Number(overallBest.f1.toFixed(4)),
    accuracy: Number(overallBest.accuracy.toFixed(4)),
    tp: overallBest.tp,
    fp: overallBest.fp,
    tn: overallBest.tn,
    fn: overallBest.fn
  };

  timing.total_script_ms = roundMs(nowMs() - totalStart);
  timing.run_finished_at = new Date().toISOString();

  console.log("\nPer-label report:");
  console.table(report);

  console.log("\nOverall toxic/non-toxic report:");
  console.table({
    overall: overallReport
  });

  console.log("\nSuggested thresholds:");
  console.log(JSON.stringify(suggestedThresholds, null, 2));

  console.log("\nTiming report:");
  console.table({
    backend: timing.actual_backend,
    tfjs_version: timing.tfjs_version,
    rows: timing.rows_used,
    batch_size: timing.batch_size,
    backend_setup_ms: timing.backend_setup_ms,
    model_load_ms: timing.model_load_ms,
    vocab_load_ms: timing.vocab_load_ms,
    warmup_ms: timing.warmup_ms,
    prediction_total_ms: timing.prediction_total_ms,
    tokenization_total_ms: timing.tokenization_total_ms,
    inference_total_ms: timing.inference_total_ms,
    avg_batch_ms: timing.avg_batch_ms,
    avg_ms_per_text: timing.avg_ms_per_text,
    throughput_texts_per_second: timing.throughput_texts_per_second,
    total_script_ms: timing.total_script_ms
  });

  fs.writeFileSync(
    "eval_report.json",
    JSON.stringify(
      {
        backend: timing.actual_backend,
        tfjs_version: timing.tfjs_version,
        rows: rows.length,
        batch_size: BATCH_SIZE,
        report,
        overallReport,
        suggestedThresholds,
        timing
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    "suggested_thresholds.json",
    JSON.stringify(suggestedThresholds, null, 2)
  );

  fs.writeFileSync("timing_report.json", JSON.stringify(timing, null, 2));

  console.log("\nSaved:");
  console.log("eval_report.json");
  console.log("suggested_thresholds.json");
  console.log("timing_report.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});