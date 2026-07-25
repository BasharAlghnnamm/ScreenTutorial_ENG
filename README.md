# ScreenTutorial

Firefox extension that generates step-by-step tutorials from your browsing sessions. Click, navigate, fill out forms — every significant action is captured with an automatic screenshot.

## Features

- **Automatic recording** of clicks, text input, and navigation
- **Screenshot capture** at each significant action
- **Visual indicator** (REC badge) while recording
- **Full editor**: rename steps, delete, reorder via drag & drop
- **Markdown export** (.md) with base64 screenshots
- **Standalone HTML export** (single file, openable in any browser)
- **PDF export** via the browser's print dialog
- **Configurable output folder** (saves to `Downloads/ScreenTutorial/` by default)

## Installation

### From source (development)

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USER/ScreenTutorial.git
   ```
2. Open Firefox and go to `about:debugging#/runtime/this-firefox`
3. Click **"Load Temporary Add-on..."**
4. Select the `manifest.json` file from the repository

## Usage

1. Click the **ScreenTutorial** icon in the toolbar
2. Enter a **title** for the tutorial
3. Click **"Start Recording"**
4. Browse normally on the target website
5. Click the icon again and **"Stop Recording"**
6. Click **"Edit & Export"** to open the editor
7. Edit descriptions, delete unwanted steps, reorder
8. Export as **.md**, **.html**, or **.pdf**

### Output Folder

Exported files are saved to `Downloads/ScreenTutorial/` by default. You can change this in the popup settings (gear icon ⚙).

## Project Structure

```
ScreenTutorial/
├── manifest.json       # Firefox Manifest V2
├── background.js       # State management, screenshots, navigation tracking
├── content.js          # User interaction detection
├── popup/              # Control popup (start/stop/settings)
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── editor/             # Full-page editor (review & export)
│   ├── editor.html
│   ├── editor.css
│   └── editor.js
└── icons/
    └── icon.svg
```

## License

MIT
