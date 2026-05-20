# Toxic Text Detector – User Manual

This user manual describes how to install and use the Toxic Text Detector browser extension.

Toxic Text Detector is a Chrome extension for detecting potentially toxic text on web pages. It can mark or blur harmful text and allows the user to configure detection categories, sensitivity, local or remote inference, confidence score display, and domain whitelist.

## Requirements

To use the extension, the user needs:

- Google Chrome or a Chromium-based browser,
- the built extension folder named `dist`,
- Developer mode enabled in Chrome extensions,
- optional access to the backend API if remote mode is used.

For normal local use, the backend API is not required.

## Installation from ready build

If the built extension is already available in the `dist` folder, install it as follows:

1. Open Google Chrome.
2. Open the extensions page:

```text
chrome://extensions/
```

3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `dist` folder.
6. The extension will appear in the list of installed extensions.
7. Pin the extension to the browser toolbar if needed.

After installation, the extension icon should be visible in the Chrome toolbar.

## Building from source

If the ready `dist` folder is not available, the extension can be built from source.

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

After build, load the generated folder:

```text
frontend/dist/
```

through `chrome://extensions/` using Load unpacked.

## Basic usage

After installation, open a web page containing text, for example a discussion page, search results page, or comment section.

The extension can detect toxic content and visually mark or blur it. If automatic blurring is enabled, toxic text is blurred directly on the page. The user can reveal blurred content when needed.

Basic workflow:

1. Open a web page.
2. Click the Toxic Text Detector icon in the Chrome toolbar.
3. Check whether protection is enabled.
4. Open Settings if you want to change sensitivity, categories, inference mode, or whitelist.
5. Browse the page normally.
6. If toxic text is detected, it can be blurred or marked according to the current settings.

## Popup window

The popup window is opened by clicking the extension icon in the browser toolbar.

The popup shows:

- current protection status,
- protection on/off switch,
- number of detected text segments,
- number of blurred or blocked text segments,
- button for opening Settings.

If protection is enabled, the popup shows that the browser is currently protected.  
If protection is disabled, the extension stops actively marking new content.

## Settings page

The Settings page contains the main configuration of the extension.

It can be opened from the popup by clicking the Settings button.

The settings page contains:

- sensitivity level,
- inference mode,
- remote API token field,
- toxicity category toggles,
- automatic blur toggle,
- confidence score toggle,
- whitelist domain management,
- reset settings button,
- export settings button.

## Sensitivity level

The sensitivity level controls how strict the detection should be.

Higher sensitivity means the extension is more likely to mark text as toxic.  
Lower sensitivity means the extension behaves more conservatively and marks fewer texts.

Recommended use:

- higher sensitivity for stronger protection,
- lower sensitivity if too many harmless texts are being marked.

## Inference mode

The extension supports two inference modes.

### Local mode

In local mode, text is processed directly in the browser.

Advantages:

- better privacy,
- no need to send text to a server,
- works without the backend API.

This mode is recommended for normal use.

### Remote mode

In remote mode, text is sent to an API server for classification.

Advantages:

- allows use of a stronger backend model,
- useful for testing and comparison,
- can be connected to a local or cloud API.

Remote mode should be used only when the user wants to use the backend API.

## Remote API token

The settings page contains a field for a remote API token.

If the selected remote API requires authorization, enter the token into the field and save it. If the API does not require a token, the field can stay empty.

## Toxicity categories

The extension supports several toxicity categories:

- Toxicity,
- Insult,
- Profanity,
- Threat,
- Identity attack.

Each category can be enabled or disabled separately.

If a category is disabled, it will not be used for marking or blurring text.

## Automatic blurring

The Auto-blur option controls whether detected toxic text should be blurred automatically.

If Auto-blur is enabled, detected text is visually blurred on the page.  
If Auto-blur is disabled, the extension can still mark detected text without hiding it.

This allows the user to choose between stronger protection and more visible browsing.

## Confidence scores

The Show confidence scores option controls whether the extension displays confidence values for detected toxic text.

If enabled, the user can see a percentage score near the detected category.  
If disabled, the extension shows a simpler result without numerical details.

This option is useful during testing or when the user wants more information about the model result.

## Whitelist domains

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

This is useful for pages where the user does not want the extension to modify the content.

## Exporting settings

The settings page includes an option to export the current configuration.

The exported file can be used to keep a backup of the extension settings or to document the configuration used during testing.

## Using local backend API with remote mode

For normal use, the user does not need to run the backend API.

If the user wants to test remote mode with a local backend, the backend API must first be started on:

```text
http://127.0.0.1:8000
```

After that, the extension can be configured to use the local API.

The technical commands for starting the backend and switching the API URL are described in the system manual in `README.md`.

## Revealing blurred text

If text is blurred by the extension, the user can reveal it when needed.

The purpose of the blur is not to permanently remove content, but to reduce unwanted exposure to potentially toxic text. The user keeps control and can decide whether to view the text.

This is useful when the user needs to understand the full context, for example while moderating comments or checking a discussion.

## Recommended settings

For normal browsing, recommended settings are:

- protection enabled,
- local inference mode,
- automatic blur enabled,
- confidence scores enabled or disabled according to user preference,
- only relevant toxicity categories enabled,
- whitelist used for trusted or irrelevant websites.

For testing, recommended settings are:

- confidence scores enabled,
- sensitivity adjusted according to the tested scenario,
- remote mode enabled only when the API is available.

## Troubleshooting

### Extension does not appear in Chrome

Check that:

- Developer mode is enabled,
- the correct `dist` folder was selected,
- the folder contains `manifest.json`,
- the extension was not disabled by Chrome.

### Text is not being detected

Possible causes:

- protection is disabled,
- the current domain is in the whitelist,
- all relevant toxicity categories are disabled,
- the text is too short,
- the page has not been rescanned after changing settings.

### Text is detected but not blurred

Check that Auto-blur is enabled in Settings.

If Auto-blur is disabled, the extension may still mark toxic content without hiding it.

### Confidence scores are not visible

Check that Show confidence scores is enabled in Settings.

### Remote mode does not work

Check that:

- remote mode is enabled,
- the API server is running,
- the API URL is correctly configured,
- the remote API token is correct if required,
- the backend API is available at the expected address.

For a local backend, the expected address is:

```text
http://127.0.0.1:8000
```

### Page becomes slower

Large pages with many text elements may require more processing.

Recommended actions:

- reduce sensitivity,
- disable unnecessary categories,
- add trusted pages to the whitelist,
- use local scanning only on relevant pages.

## Privacy note

In local mode, text is processed directly in the browser and does not need to be sent to a server.

In remote mode, text is sent to an API server for classification. The user should use remote mode only when they accept this behavior.

## Summary

Toxic Text Detector helps users detect and visually suppress potentially toxic text while browsing the web. It supports local inference for privacy-preserving use and optional remote inference through an API. The user can configure detection sensitivity, active categories, automatic blurring, confidence score display, and whitelist domains.