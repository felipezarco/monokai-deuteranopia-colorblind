const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PATCH_MARKER = '/* MONOKAI-DEUTERANOPIA-COLORBLIND-DEEPSPACE */';

function getWorkbenchHtmlPath() {
  const appRoot = vscode.env.appRoot;
  const htmlPath = path.join(appRoot, 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html');
  if (fs.existsSync(htmlPath)) return htmlPath;
  const altPath = path.join(appRoot, 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html');
  if (fs.existsSync(altPath)) return altPath;
  return null;
}

function getWorkbenchCssPath() {
  const appRoot = vscode.env.appRoot;
  const cssPath = path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.css');
  if (fs.existsSync(cssPath)) return cssPath;
  const altPath = path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.web.main.css');
  if (fs.existsSync(altPath)) return altPath;
  return null;
}

function isSnap() {
  return vscode.env.appRoot.includes('/snap/');
}

function getUserCssPath(context) {
  return path.join(context.globalStorageUri.fsPath, 'deepspace.css');
}

function generateStars(count, maxX, maxY) {
  const shadows = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * maxX);
    const y = Math.floor(Math.random() * maxY);
    shadows.push(`${x}px ${y}px #ffffff`);
  }
  return shadows.join(', ');
}

function generateDeepSpaceCSS() {
  const smallStars = generateStars(600, 3000, 3000);
  const mediumStars = generateStars(200, 3000, 3000);
  const largeStars = generateStars(50, 3000, 3000);

  return `
${PATCH_MARKER}

/* === Deep Space Gradient Background === */
body {
  background: linear-gradient(135deg, #020510 0%, #0a1628 25%, #0d1b3e 50%, #081230 75%, #030712 100%) !important;
  background-attachment: fixed !important;
}

.monaco-workbench {
  background: transparent !important;
}

.monaco-workbench .part.editor > .content {
  background: transparent !important;
}

.monaco-editor,
.monaco-editor .overflow-guard,
.monaco-editor-background,
.monaco-editor .inputarea.ime-input {
  background: transparent !important;
}

.monaco-editor .margin {
  background: transparent !important;
}

.minimap > canvas {
  opacity: 0.7;
}

.monaco-editor .lines-content {
  background: transparent !important;
}

.monaco-editor .view-overlays {
  background: transparent !important;
}

/* === Star Layers === */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 3000px;
  height: 3000px;
  z-index: 0;
  pointer-events: none;
  background: transparent;
  box-shadow: ${smallStars};
  animation: deepspace-stars-drift 180s linear infinite;
  opacity: 0.6;
}

body::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 3000px;
  height: 3000px;
  z-index: 0;
  pointer-events: none;
  background: transparent;
  box-shadow: ${mediumStars};
  animation: deepspace-stars-drift 120s linear infinite;
  opacity: 0.8;
}

.monaco-workbench::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 3000px;
  height: 3000px;
  z-index: 0;
  pointer-events: none;
  background: transparent;
  box-shadow: ${largeStars};
  animation: deepspace-stars-drift 80s linear infinite;
  opacity: 1;
}

.monaco-workbench::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at 20% 50%, rgba(16, 36, 82, 0.15) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 20%, rgba(30, 15, 60, 0.12) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 80%, rgba(10, 30, 70, 0.1) 0%, transparent 50%);
  animation: deepspace-nebula-pulse 25s ease-in-out infinite alternate;
}

@keyframes deepspace-stars-drift {
  from { transform: translate(0, 0); }
  to { transform: translate(-1500px, -750px); }
}

@keyframes deepspace-nebula-pulse {
  0% { opacity: 0.4; }
  50% { opacity: 0.7; }
  100% { opacity: 0.5; }
}

.monaco-workbench .part {
  z-index: 1;
  position: relative;
}

.monaco-workbench .part.sidebar,
.monaco-workbench .part.panel,
.monaco-workbench .part.auxiliarybar {
  background: rgba(6, 10, 24, 0.85) !important;
}

.monaco-workbench .part.titlebar {
  background: rgba(5, 8, 22, 0.9) !important;
}

.monaco-workbench .part.statusbar {
  background: rgba(5, 8, 22, 0.9) !important;
}

.monaco-workbench .part.activitybar {
  background: rgba(5, 8, 22, 0.9) !important;
}

.tabs-container,
.tab,
.monaco-workbench .part.editor > .content .editor-group-container > .title {
  background: transparent !important;
}

.tab.active {
  background: rgba(11, 16, 38, 0.8) !important;
}

.editor-group-container > .title {
  background: rgba(6, 10, 24, 0.7) !important;
}

.terminal-wrapper {
  background: rgba(6, 10, 24, 0.85) !important;
}

${PATCH_MARKER}
`;
}

function isPatched(content) {
  return content.includes(PATCH_MARKER);
}

function removePatch(content) {
  const startIdx = content.indexOf(PATCH_MARKER);
  if (startIdx === -1) return content;
  const endIdx = content.lastIndexOf(PATCH_MARKER) + PATCH_MARKER.length;
  return content.substring(0, startIdx) + content.substring(endIdx);
}

function isWritable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

// Direct patch: write CSS into VS Code's workbench CSS file
async function patchDirect(cssPath) {
  let cssContent = fs.readFileSync(cssPath, 'utf-8');
  if (isPatched(cssContent)) {
    cssContent = removePatch(cssContent);
  }
  cssContent += generateDeepSpaceCSS();
  fs.writeFileSync(cssPath, cssContent, 'utf-8');
}

// Snap workaround: write CSS to user storage, then bind-mount over the read-only original
async function patchWithElevation(cssPath, context) {
  const storagePath = context.globalStorageUri.fsPath;
  fs.mkdirSync(storagePath, { recursive: true });

  // Read current CSS content from the original (unmounted) file
  let cssContent = fs.readFileSync(cssPath, 'utf-8');
  if (isPatched(cssContent)) {
    cssContent = removePatch(cssContent);
  }
  cssContent += generateDeepSpaceCSS();

  // Write patched content to persistent file
  const patchedCssPath = path.join(storagePath, 'workbench-patched.css');
  fs.writeFileSync(patchedCssPath, cssContent, 'utf-8');

  // Use bind mount to overlay the patched file over the read-only original
  return new Promise((resolve, reject) => {
    exec(`pkexec mount --bind "${patchedCssPath}" "${cssPath}"`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function unpatchWithElevation(cssPath) {
  // Unmount the bind mount to restore the original file
  return new Promise((resolve, reject) => {
    exec(`pkexec umount "${cssPath}"`, (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

async function enableBackground(context) {
  const cssPath = getWorkbenchCssPath();
  if (!cssPath) {
    vscode.window.showErrorMessage('Deep Space: Could not locate VS Code workbench CSS file.');
    return;
  }

  try {
    if (isWritable(cssPath)) {
      // Standard installation (apt, deb, manual) — patch directly
      await patchDirect(cssPath);
    } else {
      // Snap or read-only installation — needs elevated permissions
      const choice = await vscode.window.showWarningMessage(
        'VS Code files are read-only (Snap install detected). Deep Space needs admin permission to patch the CSS.',
        'Authenticate & Enable',
        'Cancel'
      );
      if (choice !== 'Authenticate & Enable') return;
      await patchWithElevation(cssPath, context);
    }

    const action = await vscode.window.showInformationMessage(
      'Deep Space background enabled! You may see "[Unsupported]" in the title bar — this is cosmetic and harmless.',
      'Reload Now',
      'Later'
    );
    if (action === 'Reload Now') {
      vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
  } catch (err) {
    if (err.killed || (err.message && err.message.includes('dialog was dismissed'))) {
      vscode.window.showInformationMessage('Deep Space: Authentication cancelled.');
    } else {
      vscode.window.showErrorMessage(`Deep Space: ${err.message || err}`);
    }
  }
}

async function disableBackground(context) {
  const cssPath = getWorkbenchCssPath();
  if (!cssPath) {
    vscode.window.showErrorMessage('Deep Space: Could not locate VS Code workbench CSS file.');
    return;
  }

  try {
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    if (!isPatched(cssContent)) {
      vscode.window.showInformationMessage('Deep Space background is not currently active.');
      return;
    }

    if (isWritable(cssPath)) {
      const cleaned = removePatch(cssContent);
      fs.writeFileSync(cssPath, cleaned, 'utf-8');
    } else {
      await unpatchWithElevation(cssPath);
    }

    const action = await vscode.window.showInformationMessage(
      'Deep Space background disabled. VS Code needs to reload.',
      'Reload Now',
      'Later'
    );
    if (action === 'Reload Now') {
      vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
  } catch (err) {
    vscode.window.showErrorMessage(`Deep Space: ${err.message || err}`);
  }
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('monokaiDeuteranopiaColorblind.enableBackground', () => enableBackground(context)),
    vscode.commands.registerCommand('monokaiDeuteranopiaColorblind.disableBackground', () => disableBackground(context))
  );

  // Auto-prompt if theme is active but stars aren't enabled
  const currentTheme = vscode.workspace.getConfiguration().get('workbench.colorTheme');
  if (currentTheme === 'Monokai Deuteranopia Colorblind') {
    const cssPath = getWorkbenchCssPath();
    if (cssPath) {
      try {
        const cssContent = fs.readFileSync(cssPath, 'utf-8');
        if (!isPatched(cssContent)) {
          vscode.window.showInformationMessage(
            'Monokai Deuteranopia Colorblind: Enable the animated deep space background?',
            'Enable',
            'No Thanks'
          ).then(choice => {
            if (choice === 'Enable') enableBackground(context);
          });
        }
      } catch {}
    }
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
