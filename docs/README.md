# Toxic Text Detector – System Manual

Toxic Text Detector is a bachelor thesis project focused on the design, implementation, and evaluation of a browser extension for detecting potentially toxic text on web pages.

The system is implemented as a Chrome Manifest V3 extension and supports two inference modes:

- local inference directly in the browser,
- remote inference through a backend API.

The goal of the project is to provide a practical browser-based tool that can detect potentially toxic text, visually mark or blur it, and allow the user to configure sensitivity, toxicity categories, processing mode, confidence score display, and whitelist domains.

The project also evaluates the practical trade-off between privacy-preserving local inference and more precise or more easily replaceable remote inference.

---

## CD medium structure

The electronic version of the bachelor thesis is organized as follows:

```text
CD_ROOT/
├── doc/
│   ├── README.md
│   └── USER_MANUAL.md
├── tex/
├── src/
│   ├── frontend/
│   └── backend/
├── dist/
└── article/
```

Description of folders:

- `doc/` – final thesis documentation and appendices, including this system manual and the user manual.
- `tex/` – LaTeX source files of the thesis and scientific article.
- `src/` – source code of the implemented solution.
- `src/frontend/` – source code of the Chrome extension.
- `src/backend/` – source code of the backend API for remote inference.
- `dist/` – built version of the extension prepared for loading into the browser.
- `article/` – scientific article created based on the results of the thesis.

All paths in this manual are written relative to the root of the CD medium.

---

## Frontend – Chrome extension

The frontend is implemented using Vite, React, Chrome Manifest V3, and TensorFlow.js.

Main frontend structure:

```text
src/frontend/
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

- `src/frontend/public/manifest.json` – Chrome Manifest V3 configuration.
- `src/frontend/public/background.js` – service worker, central extension actions, communication with the active tab, and remote API handling.
- `src/frontend/public/contentScript.js` – scans page text, runs classification, and marks or blurs detected toxic content.
- `src/frontend/public/toxicityContract.global.js` – normalizes model outputs, labels, thresholds, strictness settings, and final verdicts.
- `src/frontend/public/local_char_model/` – local TensorFlow.js model files required for browser inference.
- `src/frontend/src/state/SettingsContext.jsx` – manages extension settings and stores them in Chrome storage.
- `src/frontend/src/popupMain.jsx` – entry point for the extension popup.
- `src/frontend/src/optionsMain.jsx` – entry point for the settings page.
- `src/frontend/scripts/evaluate-local-model.js` – script for evaluating the optimized local TensorFlow.js model.

---

## Backend – remote inference API

The backend provides an optional API for remote inference. It is used when the extension is switched to Remote mode.

Main backend structure:

```text
src/backend/
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

- `src/backend/api/app.py` – main FastAPI application.
- `src/backend/api/thresholds_product_v2_1.json` – product threshold configuration used by the API.
- `src/backend/train/` – scripts for dataset preparation, remote model training, evaluation, and threshold tuning.
- `src/backend/reports/` – selected experiment outputs and model evaluation results.
- `src/backend/models/xlmr-toxic-v2_1/` – trained XLM-R model used by the configured remote API.
- `src/backend/requirements.txt` – Python dependencies required to run the backend.
- `src/backend/Dockerfile` – optional container configuration for deployment.

---

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

---

## Models

The project uses two model-related parts:

1. a local browser model,
2. a remote backend model.

### Local browser model

The local browser model is expected in:

```text
src/frontend/public/local_char_model/
```

This model is used directly by the Chrome extension. It allows the extension to classify text locally without sending it to a server.

The local model is intended as a privacy-preserving and fast browser-side variant. However, it may be less accurate than the backend model in more difficult or less represented toxicity categories.

The local model files must be present before building or running the extension with local inference.

### Remote backend model

The remote backend model is expected in:

```text
src/backend/models/xlmr-toxic-v2_1/
```

This model is used by the backend API for remote inference.

The backend model can contain large files and may be tracked using Git LFS. If the model files are not present after cloning the repository, make sure Git LFS is installed and run:

```bash
git lfs pull
```

Expected backend model structure:

```text
src/backend/models/xlmr-toxic-v2_1/
├── config.json
├── model.safetensors
├── tokenizer.json
├── tokenizer_config.json
├── training_args.bin
└── training_meta.json
```

---

## Installing or loading the extension in Chrome

The extension can be used in two ways:

- installed from the Chrome Web Store using the private project link,
- loaded manually as an unpacked extension from the prepared `dist/` folder.

### Installation from Chrome Web Store link

The extension is published in the Chrome Web Store, but it is not publicly searchable. It is distributed for this project through a direct private/unlisted link:

```text
REPLACE_WITH_PRIVATE_CHROME_WEB_STORE_LINK
```

To install it:

1. Open the provided Chrome Web Store link.
2. Click **Add to Chrome**.
3. Confirm the installation.
4. Pin the extension to the browser toolbar if needed.

This method is recommended for normal use and project evaluation.

### Loading unpacked extension

For development, testing, or thesis demonstration, the extension can also be loaded manually.

1. Open Google Chrome.
2. Go to:

```text
chrome://extensions/
```

3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the prepared extension folder:

```text
dist/
```

6. The extension will appear in the list of installed extensions.
7. Pin the extension to the toolbar if needed.

The `dist/` folder on the CD medium already contains the built extension prepared for loading into the browser.

---

## Building the frontend from source

The prepared build is already available in:

```text
dist/
```

If it is necessary to rebuild the extension from source, go to the frontend source folder:

```bash
cd src/frontend
```

Install dependencies:

```bash
npm install
```

Create the production build:

```bash
npm run build
```

The build command creates a build output inside the frontend project. For the CD medium, the final prepared build is stored separately in the root folder:

```text
dist/
```

---

## Running the backend API locally

The backend API can be started locally when the trained XLM-R model is available in:

```text
src/backend/models/xlmr-toxic-v2_1/
```

The following commands are intended for Windows Command Prompt and should be executed from the backend directory:

```bash
cd src/backend
```

Then run:

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

---

## Backend environment variables

| Variable | Meaning |
|---|---|
| `HF_MODEL_PATH` | Path to the local trained XLM-R model |
| `THRESHOLDS_PATH` | Path to the threshold configuration |
| `MODEL_ID` | Identifier of the model used by the API |
| `THRESHOLD_SET` | Name of the threshold set used by the API |
| `MAX_TOKENS` | Maximum number of tokens processed by the model |
| `MAX_BATCH` | Maximum batch size accepted by the API |
| `ENABLE_INT8` | Enables INT8 optimization if supported |
| `TORCH_THREADS` | Number of Torch CPU threads |
| `OMP_NUM_THREADS` | Number of OpenMP threads |
| `MKL_NUM_THREADS` | Number of MKL threads |

---

## Switching between cloud API and local API

The extension can use a configured cloud API or a locally running API. These commands are intended for development and testing. They should be executed in the browser console from an extension context, for example from the extension options page.

### Change to configured cloud API

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

### Change to local API

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

### Reset to default API configuration

```javascript
chrome.runtime.sendMessage(
  { type: "TTD_RESET_REMOTE_ADMIN_CONFIG" },
  console.log
);
```

### Check current API configuration

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

A normal user does not need to run these commands manually.

---

## Evaluation scripts

The optimized local browser model can be evaluated using:

```bash
cd src/frontend
node scripts/evaluate-local-model.js
```

The backend training and evaluation scripts are located in:

```text
src/backend/train/
```

These scripts were used for dataset preparation, remote model training, evaluation, and threshold tuning.

The evaluation was not designed as one identical benchmark for every model. The remote model was evaluated more extensively from the perspective of classification quality, class imbalance, and decision thresholds. The original local TF.js model was tested as an initial baseline, while the optimized local TensorFlow.js model was evaluated separately as the practical browser-side solution.

---

## Notes about datasets

The original Jigsaw datasets and large raw archives are not part of the CD medium. They were used during training and evaluation, but they are not required for normal use of the extension.

The CD medium contains the thesis documentation, LaTeX sources, scientific article, source code, selected reports or configurations, the prepared extension build, and model files or expected model locations required for running the system.

---

## Main functionality

The implemented system supports:

- detection of potentially toxic text on web pages,
- local browser-based inference,
- optional remote API inference,
- automatic blurring of detected toxic text,
- displaying confidence scores,
- selecting toxicity categories,
- changing sensitivity level,
- domain whitelist,
- popup statistics,
- export and import of extension settings if enabled in the settings page,
- developer API testing commands for remote inference configuration.

User feedback for incorrect classifications was considered during UX prototyping, but it is not part of the final implemented extension functionality.

---

## Scope and limitations

Toxic Text Detector is an assistive tool based on automated model predictions. It can help detect and visually reduce exposure to potentially toxic text, but it does not replace human judgement or moderation.

Known limitations include:

- possible false positives, where harmless text is marked as toxic,
- possible false negatives, where toxic text is not detected,
- weaker performance in rare or difficult toxicity categories,
- limited reliability for implicit, sarcastic, contextual, or multilingual toxicity,
- possible performance impact on very large pages with many text elements,
- differences between local and remote inference caused by model architecture, deployment environment, and threshold settings.

Local inference is privacy-preserving and fast because text is processed directly in the browser. Remote inference can provide more precise results depending on the backend model, but it requires sending analyzed text to an API server.

---

## Repository and CD medium purpose

This CD medium serves as the electronic appendix of the bachelor thesis. It contains the thesis documentation, LaTeX sources, scientific article, source code of the implemented solution, prepared browser extension build, and technical documentation required for installation, testing, and further development.