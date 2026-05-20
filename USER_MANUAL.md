# Toxic Text Detector – User Manual

Toxic Text Detector is a browser extension designed to help users identify and visually reduce exposure to potentially toxic text on web pages. The extension can analyze text content, mark or blur detected toxic segments, and provide basic information about the detected toxicity category and confidence score.

The extension is an assistive tool. Its results are generated automatically by machine learning models and should be interpreted as predictions, not as final decisions.

---

## 1. Requirements

To use the extension, the user needs:

- Google Chrome or a Chromium-based browser,
- the built extension folder, usually `frontend/dist`,
- Developer mode enabled in Chrome extensions,
- optional access to the backend API if Remote mode is used.

For normal Local mode use, the backend API is not required.

---

## 2. Installation

If the built extension is already available in the `dist` folder, install it as follows:

1. Open Google Chrome.
2. Open the extensions page:

```text
chrome://extensions/
```

3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the built extension folder, usually:

```text
frontend/dist/
```

6. The extension will appear in the list of installed extensions.
7. Pin the extension to the browser toolbar if needed.

After installation, the extension icon should be visible in the Chrome toolbar.

---

## 3. First use

After installation, open a web page containing text, such as a discussion page, forum, comment section, article, or search results page.

Basic workflow:

1. Click the Toxic Text Detector icon in the browser toolbar.
2. Check that protection is enabled.
3. Open Settings if you want to adjust sensitivity, categories, processing mode, confidence scores, automatic blur, or whitelist.
4. Browse the page normally.
5. If potentially toxic text is detected, the extension marks or blurs it according to the selected settings.
6. If text is blurred, reveal it only when you want to view the original content.

The purpose of the extension is not to permanently remove content from a page. It helps the user reduce unwanted exposure while keeping control over what can be shown.

---

## 4. Popup window

The popup window is opened by clicking the extension icon in the browser toolbar.

The popup shows:

- current protection status,
- protection on/off switch,
- number of detected text segments,
- number of blurred or blocked text segments,
- button for opening Settings.

If protection is enabled, the popup shows that the browser is currently protected.  
If protection is disabled, the extension stops actively scanning and marking new content.

---

## 5. Settings page

The Settings page contains the main configuration of the extension.

It can be opened from the popup by clicking the Settings button.

The settings page may contain:

- sensitivity level,
- processing mode,
- remote API token field if remote authorization is used,
- toxicity category toggles,
- automatic blur toggle,
- confidence score toggle,
- whitelist domain management,
- reset settings button,
- export settings option,
- import settings option if enabled.

The exact available options depend on the current build of the extension.

---

## 6. Sensitivity level

The sensitivity level controls how strict the detection should be.

Higher sensitivity means the extension is more likely to mark text as potentially toxic.  
Lower sensitivity means the extension behaves more conservatively and marks fewer texts.

Recommended use:

- use higher sensitivity for stronger protection,
- use lower sensitivity if too many harmless texts are being marked.

Sensitivity changes the decision behavior of the model. It does not guarantee perfect detection.

---

## 7. Processing modes

The extension supports two processing modes:

- Local mode,
- Remote mode.

### 7.1 Local mode

In Local mode, text is processed directly in the browser.

Advantages:

- text does not need to be sent to a server,
- better privacy,
- fast browser-side response,
- works without the backend API.

Local mode is recommended for normal browsing. However, local inference may be less accurate than the backend model in more difficult toxicity categories.

### 7.2 Remote mode

In Remote mode, text is sent to a configured API server for classification.

Advantages:

- allows the use of a stronger backend model,
- can provide more precise results in some cases,
- useful for evaluation, comparison, or controlled testing,
- can be connected to a local or cloud API.

The speed of Remote mode depends on the API deployment, hardware, model size, and network latency. In local testing, the API can be run on the same computer, so its response may be close to local inference.

Remote mode should be used only when the user understands and accepts that analyzed text is sent to an API server.

---

## 8. Remote API configuration

For normal use, the user does not need to run the backend API.

If the user wants to test Remote mode with a local backend, the backend API must first be started on:

```text
http://127.0.0.1:8000
```

After that, the extension can be configured to use the local API.

The technical commands for starting the backend and switching the API URL are described in the system manual in `README.md`.

If the selected remote API requires authorization, a token must be configured. If the API does not require a token, the token field can stay empty.

---

## 9. Toxicity categories

The extension supports several toxicity categories:

- Toxicity,
- Insult,
- Profanity,
- Threat,
- Identity attack.

Each category can be enabled or disabled separately.

If a category is disabled, it will not be used for marking or blurring text.

Recommended use:

- keep only categories that are relevant for the current use case,
- disable categories that cause too many unwanted detections,
- remember that category results are model predictions and may be imperfect.

---

## 10. Automatic blurring

The Auto-blur option controls whether detected toxic text should be blurred automatically.

If Auto-blur is enabled, detected text is visually blurred on the page.  
If Auto-blur is disabled, the extension may still mark detected text without hiding it.

This allows the user to choose between stronger visual protection and more visible browsing.

---

## 11. Revealing blurred text

If text is blurred by the extension, the user can reveal it when needed.

The purpose of the blur is not to permanently remove content, but to reduce unwanted exposure to potentially toxic text. The user keeps control and can decide whether to view the text.

This is useful when the user needs to understand the full context, for example while moderating comments or checking a discussion.

---

## 12. Confidence scores

The Show confidence scores option controls whether the extension displays confidence values for detected toxic text.

If enabled, the user can see a percentage score near the detected category.  
If disabled, the extension shows a simpler result without numerical details.

This option is useful during evaluation, demonstration, or when the user wants more information about the model result.

Confidence scores should not be interpreted as absolute truth. They represent the model output under the current threshold and sensitivity settings.

---

## 13. Whitelist domains

The whitelist allows the user to disable detection on selected websites.

To add a domain to the whitelist:

1. Open Settings.
2. Find the Whitelist Domains section.
3. Enter a domain name.
4. Click Add.

Example:

```text
example.com
```

After adding a domain, the extension will not scan or mark content on that domain.

This is useful for websites where the user does not want the extension to modify the page content.

---

## 14. Exporting and importing settings

The settings page may include options to export or import the current configuration.

Exported settings can be used to:

- keep a backup of the extension configuration,
- document the configuration used during testing,
- transfer the same configuration to another installation.

If import is available, the user can restore a previously exported configuration file.

Only import settings from a trusted source.

---

## 15. Recommended configurations

### 15.1 Normal browsing

Recommended settings for normal use:

- protection enabled,
- Local mode,
- automatic blur enabled,
- confidence scores enabled or disabled according to user preference,
- only relevant toxicity categories enabled,
- whitelist used for trusted websites where scanning is not needed.

### 15.2 Demonstration or evaluation

Recommended settings for demonstration or testing:

- confidence scores enabled,
- sensitivity adjusted according to the tested scenario,
- Remote mode enabled only when the backend API is available,
- whitelist disabled for pages that should be evaluated,
- tested pages rescanned after changing important settings.

---

## 16. Privacy and data processing

In Local mode, analyzed text is processed directly in the browser and does not need to be sent to a server.

In Remote mode, analyzed text is sent to a configured API server for classification. The user should use Remote mode only when they understand and accept this behavior.

The extension stores configuration settings such as:

- sensitivity level,
- enabled categories,
- selected processing mode,
- confidence score display,
- automatic blur option,
- whitelist domains.

These settings are used to preserve the selected configuration between browsing sessions.

---

## 17. Scope and limitations

Toxic Text Detector uses automated model predictions. The extension can help reduce exposure to toxic text, but it cannot fully understand every context of human communication.

Known limitations include:

- possible false positives, where harmless text is marked as toxic,
- possible false negatives, where toxic text is not detected,
- weaker performance in rare or difficult categories,
- limited reliability for implicit, sarcastic, contextual, or multilingual toxicity,
- possible performance impact on very large pages with many text elements,
- different results depending on sensitivity, enabled categories, thresholds, and selected processing mode.

The extension does not replace human moderation or final user judgement. It is designed as a supportive browsing tool.

---

## 18. Troubleshooting

### Extension does not appear in Chrome

Check that:

- Developer mode is enabled,
- the correct built extension folder was selected,
- the selected folder contains `manifest.json`,
- the extension was not disabled by Chrome.

### Text is not being detected

Possible causes:

- protection is disabled,
- the current domain is in the whitelist,
- all relevant toxicity categories are disabled,
- the text is too short,
- the page has not been rescanned after changing settings,
- the selected model did not classify the text as toxic under the current threshold.

### Text is detected but not blurred

Check that Auto-blur is enabled in Settings.

If Auto-blur is disabled, the extension may still mark toxic content without hiding it.

### Confidence scores are not visible

Check that Show confidence scores is enabled in Settings.

### Remote mode does not work

Check that:

- Remote mode is enabled,
- the API server is running,
- the API URL is correctly configured,
- the remote API token is correct if required,
- the backend API is available at the expected address.

For a local backend, the expected address is:

```text
http://127.0.0.1:8000
```

Technical commands for changing or testing the API configuration are described in the system manual.

### Page becomes slower

Large pages with many text elements may require more processing.

Recommended actions:

- avoid scanning very large pages when not needed,
- disable unnecessary categories,
- add trusted pages to the whitelist,
- use Local mode for normal browsing when Remote mode is not required.

---

## 19. Advanced installation from source

This section is intended only for users who need to build the extension from source code.

Go to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Build the extension:

```bash
npm run build
```

After build, load the generated folder through `chrome://extensions/` using Load unpacked:

```text
frontend/dist/
```

For backend setup, model files, API configuration, and developer commands, see the system manual in `README.md`.

---

## 20. Summary

Toxic Text Detector helps users detect and visually reduce exposure to potentially toxic text while browsing the web. It supports Local mode for privacy-preserving use and optional Remote mode through an API. The user can configure detection sensitivity, active categories, automatic blurring, confidence score display, and whitelist domains.

The extension should be used as an assistive tool. Its results are automated predictions and may require human judgement in unclear or sensitive situations.