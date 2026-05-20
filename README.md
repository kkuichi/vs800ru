# Toxic Text Detector

Toxic Text Detector is a bachelor thesis project focused on the development of a browser extension for detecting toxic text content using NLP models. The system is designed as a Chrome Manifest V3 extension with two inference modes:

- local inference directly in the browser,
- remote inference through a backend API.

The goal of the project is to provide a practical browser-based tool that can detect potentially toxic text, visually mark or blur it, and allow the user to configure detection categories and sensitivity. The project also evaluates the trade-off between privacy-preserving local inference and more flexible remote inference.

## Project structure

The repository is divided into two main parts:

```text
toxic-text-detector/
├── README.md
├── USER_MANUAL.md
├── frontend/
└── backend/
```

The `frontend` folder contains the Chrome extension.  
The `backend` folder contains the optional API server for remote toxicity inference.

## Frontend – Chrome extension

The frontend part is implemented as a Chrome Manifest V3 extension using Vite, React, and TensorFlow.js.

Main frontend structure:

```text
frontend/
├── public/
│   ├── local_char_model/
│   ├── background.js
│   ├── contentScript.js
│   ├── manifest.json
│   └── toxicityContract.global.js
├── scripts/
│   └── evaluate-local-model.js
├── src/
│   ├── assets/
│   ├── components/
│   ├── features/
│   ├── state/
│   ├── styles/
│   ├── App.jsx
│   ├── index.css
│   ├── main.jsx
│   ├── optionsMain.jsx
│   └── popupMain.jsx
├── options.html
├── popup.html
├── package.json
├── package-lock.json
└── vite.config.js
```

### Important frontend files

- `public/manifest.json` – defines the Chrome Manifest V3 extension configuration.
- `public/background.js` – implements the service worker and communication with the active tab and remote API.
- `public/contentScript.js` – scans page text, runs local or remote classification, and marks or blurs detected toxic content.
- `public/toxicityContract.global.js` – normalizes model outputs, thresholds, labels, and final verdicts.
- `public/local_char_model/` – contains the local TensorFlow.js model and files required for browser inference.
- `src/state/SettingsContext.jsx` – manages extension settings and stores them in Chrome storage.
- `src/popupMain.jsx` – entry point for the extension popup.
- `src/optionsMain.jsx` – entry point for the settings page.
- `scripts/evaluate-local-model.js` – script used for evaluating the local TensorFlow.js model.

## Backend – remote inference API

The backend part provides an optional API for remote inference. It is used when the extension is switched to remote mode.

Main backend structure:

```text
backend/
├── api/
│   ├── app.py
│   ├── thresholds.json
│   ├── thresholds_product_v2_1.json
│   ├── thresholds_tuned_v2_1.json
│   ├── thresholds_v2_1.json
│   └── thresholds_v2.json
├── train/
├── reports/
├── docs/
├── models/
│   └── xlmr-toxic-v2_1/
├── Dockerfile
└── requirements.txt
```

### Important backend files

- `api/app.py` – main FastAPI application.
- `api/thresholds_product_v2_1.json` – product threshold configuration used by the API.
- `train/` – scripts used for dataset preparation, training, evaluation, and threshold tuning.
- `reports/` – selected experiment outputs and model evaluation results.
- `models/xlmr-toxic-v2_1/` – final trained XLM-R model used by the remote API.
- `requirements.txt` – Python dependencies required to run the backend.
- `Dockerfile` – optional container configuration for deployment.

## Used technologies

### Frontend

- Node.js
- npm
- Vite
- React
- Chrome Manifest V3
- TensorFlow.js
- TensorFlow.js WASM backend
- TensorFlow.js CPU backend

### Backend

- Python 3.11
- FastAPI
- Uvicorn
- PyTorch
- Transformers
- scikit-learn
- NumPy
- Pandas

## Models

The project uses two model-related parts.

### Local browser model

The local browser model is stored in:

```text
frontend/public/local_char_model/
```

This model is used directly by the Chrome extension. It allows the extension to classify text locally without sending it to a server.

The local model is included in the repository because it is required for local inference in the extension.

### Remote backend model

The remote backend model is stored in:

```text
backend/models/xlmr-toxic-v2_1/
```

This model is used by the backend API for remote inference.

The backend model is tracked using Git LFS because it contains large model files.

After cloning the repository, make sure Git LFS is installed and run:

```bash
git lfs pull
```

Expected backend model structure:

```text
backend/models/xlmr-toxic-v2_1/
├── config.json
├── model.safetensors
├── tokenizer.json
├── tokenizer_config.json
├── training_args.bin
└── training_meta.json
```

## Installing Git LFS

Git LFS is required for downloading the backend model files.

Install and initialize Git LFS:

```bash
git lfs install
```

After cloning the repository, download LFS files:

```bash
git lfs pull
```

## Frontend installation and build

Go to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create production build:

```bash
npm run build
```

After a successful build, the generated extension will be available in:

```text
frontend/dist/
```

The `dist` folder can be loaded into Chrome as an unpacked extension.

## Loading the extension in Chrome

1. Open Google Chrome.
2. Go to:

```text
chrome://extensions/
```

3. Enable Developer mode.
4. Click Load unpacked.
5. Select the generated folder:

```text
frontend/dist/
```

6. The extension will appear in the list of installed extensions.

## Running the backend API locally

The backend API can be started locally when the trained XLM-R model is available in:

```text
backend/models/xlmr-toxic-v2_1/
```

The following commands are intended for Windows Command Prompt and should be executed from the `backend` directory.

```cmd
set "HF_MODEL_PATH=.\models\xlmr-toxic-v2_1"
set "THRESHOLDS_PATH=.\api\thresholds_product_v2_1.json"
set "MODEL_ID=xlmr-toxic-v2_1"
set "THRESHOLD_SET=product_v2_1"

set "MAX_TOKENS=96"
set "MAX_BATCH=32"
set "ENABLE_INT8=1"
set "TORCH_THREADS=4"
set "OMP_NUM_THREADS=4"
set "MKL_NUM_THREADS=4"

py -m uvicorn api.app:app --host 127.0.0.1 --port 8000
```

After successful startup, the API is available at:

```text
http://127.0.0.1:8000
```

If the API exposes interactive documentation, it can be opened at:

```text
http://127.0.0.1:8000/docs
```

## Meaning of backend environment variables

| Variable | Meaning |
|---|---|
| HF_MODEL_PATH | Path to the local trained XLM-R model |
| THRESHOLDS_PATH | Path to the threshold configuration |
| MODEL_ID | Identifier of the model used by the API |
| THRESHOLD_SET | Name of the threshold set used by the API |
| MAX_TOKENS | Maximum number of tokens processed by the model |
| MAX_BATCH | Maximum batch size accepted by the API |
| ENABLE_INT8 | Enables INT8 optimization if supported |
| TORCH_THREADS | Number of Torch CPU threads |
| OMP_NUM_THREADS | Number of OpenMP threads |
| MKL_NUM_THREADS | Number of MKL threads |

## Switching the extension between cloud and local API

The extension can use the default cloud API or a locally running API. These commands are intended for developer testing and should be executed in the browser console from an extension context, for example from the extension options page.

### Change to default cloud server API

```javascript
chrome.runtime.sendMessage(
  {
    type: "TTD_SET_REMOTE_ADMIN_CONFIG",
    payload: {
      apiUrl: "https://api-m3jhrljqsq-ew.a.run.app",
      token: ""
    }
  },
  console.log
);
```

### Change to backup/local API

```javascript
chrome.runtime.sendMessage(
  {
    type: "TTD_SET_REMOTE_ADMIN_CONFIG",
    payload: {
      apiUrl: "http://127.0.0.1:8000",
      token: ""
    }
  },
  console.log
);
```

### Reset back to default cloud API

```javascript
chrome.runtime.sendMessage(
  { type: "TTD_RESET_REMOTE_ADMIN_CONFIG" },
  console.log
);
```

### Check which API is currently configured

```javascript
chrome.runtime.sendMessage(
  { type: "TTD_GET_REMOTE_ADMIN_CONFIG" },
  console.log
);
```

### Test current API

```javascript
chrome.runtime.sendMessage(
  { type: "TTD_TEST_REMOTE_API" },
  console.log
);
```

### Rescan active tab after changing API

```javascript
chrome.runtime.sendMessage(
  { type: "TTD_RESCAN_ACTIVE_TAB" },
  console.log
);
```

These commands are mainly used during development and testing. A normal user does not need to run them manually.

## Evaluation scripts

The local model can be evaluated using:

```bash
node scripts/evaluate-local-model.js
```

The backend training and evaluation scripts are located in:

```text
backend/train/
```

These scripts were used for dataset preparation, model training, evaluation, and threshold tuning.

## Notes about datasets

The original Jigsaw datasets and large raw archives are not part of the repository. They were used during training and evaluation, but they are not required for normal use of the extension.

The repository contains source code, model configuration, selected reports, the local browser model, and the final backend model required for API startup.

## Main functionality

The implemented system supports:

- detection of toxic text on web pages,
- local browser-based inference,
- optional remote API inference,
- automatic blurring of detected toxic text,
- displaying confidence scores,
- selecting toxicity categories,
- changing sensitivity level,
- domain whitelist,
- popup statistics,
- export of extension settings,
- backend API testing.

## Repository purpose

This repository serves as the system manual for the bachelor thesis project. It contains the source code of the frontend and backend parts, technical description of the project structure, installation steps, startup commands, model information, and notes required for further development.