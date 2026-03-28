const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const CSS_PATCH_MARKER = '/* MONOKAI-DEUTERANOPIA-COLORBLIND-DEEPSPACE */';
const HTML_PATCH_MARKER = '<!-- MONOKAI-DEUTERANOPIA-DEEPSPACE -->';

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

function elevatedCopy(source, dest) {
  const platform = process.platform;
  let cmd;
  if (platform === 'win32') {
    const ps = `Copy-Item -Path '${source}' -Destination '${dest}' -Force`;
    cmd = `powershell -Command "Start-Process powershell -ArgumentList '-Command', '${ps.replace(/'/g, "''")}' -Verb RunAs -Wait"`;
  } else if (platform === 'darwin') {
    cmd = `osascript -e 'do shell script "cp \\"${source}\\" \\"${dest}\\"" with administrator privileges'`;
  } else {
    cmd = `pkexec cp "${source}" "${dest}"`;
  }
  return new Promise((resolve, reject) => {
    exec(cmd, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function elevatedMount(pairs) {
  const platform = process.platform;
  if (platform === 'win32' || platform === 'darwin') {
    return pairs.reduce((p, [src, dst]) => p.then(() => elevatedCopy(src, dst)), Promise.resolve());
  }
  const mounts = pairs.map(([src, dst]) => `mount --bind "${src}" "${dst}"`).join(' && ');
  return new Promise((resolve, reject) => {
    exec(`pkexec sh -c '${mounts}'`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function elevatedUnmount(paths) {
  if (process.platform !== 'linux') return Promise.resolve();
  const umounts = paths.map(p => `umount "${p}" 2>/dev/null`).join('; ');
  return new Promise((resolve, reject) => {
    exec(`pkexec sh -c '${umounts}; true'`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function generateStars(count, maxX, maxY, size = 0) {
  const shadows = [];
  const colors = ['#ffffff', '#ffffffcc', '#ffffffaa', '#b8d4ff', '#ffd6aa', '#e8e8ff'];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * maxX);
    const y = Math.floor(Math.random() * maxY);
    const color = colors[Math.floor(Math.random() * colors.length)];
    if (size === 0) {
      shadows.push(`${x}px ${y}px ${color}`);
    } else {
      shadows.push(`${x}px ${y}px ${size}px ${size}px ${color}`);
    }
  }
  return shadows.join(', ');
}

function generateDeepSpaceCSS() {
  const FIELD = 2000;
  const smallStars  = generateStars(700, FIELD, FIELD, 0);
  const mediumStars = generateStars(200, FIELD, FIELD, 1);
  const largeStars  = generateStars(40,  FIELD, FIELD, 2);

  return `
${CSS_PATCH_MARKER}

body {
  background: radial-gradient(ellipse at 50% 0%, #0d1b3e 0%, #060d1f 40%, #020510 100%) !important;
  background-attachment: fixed !important;
}

.monaco-workbench {
  background: transparent !important;
}

.monaco-editor-background,
.monaco-editor .overflow-guard {
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

/* Star layers — real DOM divs injected into workbench HTML
   (pseudo-elements on body/.monaco-workbench conflict with Cursor internals) */
.deepspace-stars {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  pointer-events: none !important;
  z-index: -1 !important;
}

.deepspace-stars-1 {
  width: 1px;
  height: 1px;
  border-radius: 50%;
  background: transparent;
  box-shadow: ${smallStars};
  animation: deepspace-drift-slow ${FIELD / 4}s linear infinite;
  opacity: 0.7;
}

.deepspace-stars-2 {
  width: 1px;
  height: 1px;
  border-radius: 50%;
  background: transparent;
  box-shadow: ${mediumStars};
  animation: deepspace-drift-med ${FIELD / 8}s linear infinite;
  opacity: 0.85;
}

.deepspace-stars-3 {
  width: 1px;
  height: 1px;
  border-radius: 50%;
  background: transparent;
  box-shadow: ${largeStars};
  animation: deepspace-drift-fast ${FIELD / 16}s linear infinite;
  opacity: 1;
}

.deepspace-stars-4 {
  width: 100%;
  height: 100%;
  background:
    radial-gradient(ellipse at 15% 40%, rgba(30, 60, 140, 0.12) 0%, transparent 55%),
    radial-gradient(ellipse at 85% 15%, rgba(60, 20, 100, 0.10) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 85%, rgba(10, 40, 90, 0.08) 0%, transparent 50%);
  animation: deepspace-nebula-pulse 30s ease-in-out infinite alternate;
}

@keyframes deepspace-drift-slow {
  from { transform: translate(0, 0); }
  to   { transform: translate(-${FIELD}px, -${Math.floor(FIELD / 3)}px); }
}

@keyframes deepspace-drift-med {
  from { transform: translate(0, 0); }
  to   { transform: translate(-${FIELD}px, -${Math.floor(FIELD / 3)}px); }
}

@keyframes deepspace-drift-fast {
  from { transform: translate(0, 0); }
  to   { transform: translate(-${FIELD}px, -${Math.floor(FIELD / 3)}px); }
}

@keyframes deepspace-nebula-pulse {
  0%   { opacity: 0.3; }
  50%  { opacity: 0.7; }
  100% { opacity: 0.4; }
}

.monaco-workbench .part.sidebar,
.monaco-workbench .part.panel,
.monaco-workbench .part.auxiliarybar {
  background: rgba(6, 10, 24, 0.85) !important;
}

.monaco-workbench .part.titlebar,
.monaco-workbench .part.statusbar,
.monaco-workbench .part.activitybar {
  background: rgba(5, 8, 22, 0.9) !important;
}

.terminal-wrapper {
  background: rgba(6, 10, 24, 0.85) !important;
}

${CSS_PATCH_MARKER}
`;
}

function generateDeepSpaceHTML() {
  return [
    HTML_PATCH_MARKER,
    '<div class="deepspace-stars deepspace-stars-1"></div>',
    '<div class="deepspace-stars deepspace-stars-2"></div>',
    '<div class="deepspace-stars deepspace-stars-3"></div>',
    '<div class="deepspace-stars deepspace-stars-4"></div>',
    HTML_PATCH_MARKER
  ].join('\n');
}

function isCssPatched(content) {
  return content.includes(CSS_PATCH_MARKER);
}

function isHtmlPatched(content) {
  return content.includes(HTML_PATCH_MARKER);
}

function removeCssPatch(content) {
  const startIdx = content.indexOf(CSS_PATCH_MARKER);
  if (startIdx === -1) return content;
  const endIdx = content.lastIndexOf(CSS_PATCH_MARKER) + CSS_PATCH_MARKER.length;
  return content.substring(0, startIdx) + content.substring(endIdx);
}

function removeHtmlPatch(content) {
  const startIdx = content.indexOf(HTML_PATCH_MARKER);
  if (startIdx === -1) return content;
  const endIdx = content.lastIndexOf(HTML_PATCH_MARKER) + HTML_PATCH_MARKER.length;
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

function patchCssFile(cssPath) {
  let content = fs.readFileSync(cssPath, 'utf-8');
  if (isCssPatched(content)) content = removeCssPatch(content);
  content += generateDeepSpaceCSS();
  fs.writeFileSync(cssPath, content, 'utf-8');
}

function buildPatchedHtml(htmlPath) {
  let content = fs.readFileSync(htmlPath, 'utf-8');
  if (isHtmlPatched(content)) content = removeHtmlPatch(content);
  const insertPoint = content.lastIndexOf('</html>');
  if (insertPoint !== -1) {
    return content.substring(0, insertPoint) + generateDeepSpaceHTML() + '\n' + content.substring(insertPoint);
  }
  return content + '\n' + generateDeepSpaceHTML();
}

function patchHtmlFile(htmlPath) {
  fs.writeFileSync(htmlPath, buildPatchedHtml(htmlPath), 'utf-8');
}

function patchHtmlElevated(htmlPath, context) {
  const storagePath = context.globalStorageUri.fsPath;
  fs.mkdirSync(storagePath, { recursive: true });
  const tempPath = path.join(storagePath, 'workbench-patched.html');
  fs.writeFileSync(tempPath, buildPatchedHtml(htmlPath), 'utf-8');
  return elevatedCopy(tempPath, htmlPath);
}

function unpatchCssFile(cssPath) {
  let content = fs.readFileSync(cssPath, 'utf-8');
  if (!isCssPatched(content)) return false;
  fs.writeFileSync(cssPath, removeCssPatch(content), 'utf-8');
  return true;
}

function unpatchHtmlFile(htmlPath) {
  let content = fs.readFileSync(htmlPath, 'utf-8');
  if (!isHtmlPatched(content)) return false;
  fs.writeFileSync(htmlPath, removeHtmlPatch(content), 'utf-8');
  return true;
}

function unpatchHtmlElevated(htmlPath, context) {
  const storagePath = context.globalStorageUri.fsPath;
  fs.mkdirSync(storagePath, { recursive: true });
  let content = fs.readFileSync(htmlPath, 'utf-8');
  if (!isHtmlPatched(content)) return Promise.resolve();
  const tempPath = path.join(storagePath, 'workbench-unpatched.html');
  fs.writeFileSync(tempPath, removeHtmlPatch(content), 'utf-8');
  return elevatedCopy(tempPath, htmlPath);
}

async function patchWithElevation(cssPath, htmlPath, context) {
  const storagePath = context.globalStorageUri.fsPath;
  fs.mkdirSync(storagePath, { recursive: true });

  let cssContent = fs.readFileSync(cssPath, 'utf-8');
  if (isCssPatched(cssContent)) cssContent = removeCssPatch(cssContent);
  cssContent += generateDeepSpaceCSS();
  const patchedCssPath = path.join(storagePath, 'workbench-patched.css');
  fs.writeFileSync(patchedCssPath, cssContent, 'utf-8');

  const pairs = [[patchedCssPath, cssPath]];

  if (htmlPath) {
    const patchedHtmlPath = path.join(storagePath, 'workbench-patched.html');
    fs.writeFileSync(patchedHtmlPath, buildPatchedHtml(htmlPath), 'utf-8');
    pairs.push([patchedHtmlPath, htmlPath]);
  }

  return elevatedMount(pairs);
}

async function unpatchWithElevation(cssPath, htmlPath) {
  if (process.platform === 'linux') {
    return elevatedUnmount([cssPath, htmlPath].filter(Boolean));
  }
  // Windows/macOS: files were copied, not mounted — unpatch by rewriting
  // This case is handled by the caller writing clean content with elevation
}

async function enableBackground(context) {
  const cssPath = getWorkbenchCssPath();
  const htmlPath = getWorkbenchHtmlPath();
  if (!cssPath) {
    vscode.window.showErrorMessage('Deep Space: Could not locate VS Code workbench CSS file.');
    return;
  }

  try {
    // Patch CSS
    if (isWritable(cssPath)) {
      patchCssFile(cssPath);
    } else {
      const choice = await vscode.window.showWarningMessage(
        'VS Code CSS is read-only. Deep Space needs admin permission.',
        'Authenticate & Enable', 'Cancel'
      );
      if (choice !== 'Authenticate & Enable') return;
      await patchWithElevation(cssPath, htmlPath, context);
    }

    // Patch HTML (star layer divs) — may need separate elevation
    if (htmlPath) {
      if (isWritable(htmlPath)) {
        patchHtmlFile(htmlPath);
      } else if (!isHtmlPatched(fs.readFileSync(htmlPath, 'utf-8'))) {
        await patchHtmlElevated(htmlPath, context);
      }
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
  const htmlPath = getWorkbenchHtmlPath();
  if (!cssPath) {
    vscode.window.showErrorMessage('Deep Space: Could not locate VS Code workbench CSS file.');
    return;
  }

  try {
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    const htmlContent = htmlPath ? fs.readFileSync(htmlPath, 'utf-8') : '';
    if (!isCssPatched(cssContent) && !isHtmlPatched(htmlContent)) {
      vscode.window.showInformationMessage('Deep Space background is not currently active.');
      return;
    }

    if (isWritable(cssPath)) {
      unpatchCssFile(cssPath);
    } else if (process.platform === 'linux') {
      await unpatchWithElevation(cssPath, htmlPath);
    } else {
      const storagePath = context.globalStorageUri.fsPath;
      fs.mkdirSync(storagePath, { recursive: true });
      const tempCss = path.join(storagePath, 'workbench-clean.css');
      fs.writeFileSync(tempCss, removeCssPatch(fs.readFileSync(cssPath, 'utf-8')), 'utf-8');
      await elevatedCopy(tempCss, cssPath);
    }

    if (htmlPath) {
      if (isWritable(htmlPath)) {
        unpatchHtmlFile(htmlPath);
      } else if (isHtmlPatched(fs.readFileSync(htmlPath, 'utf-8'))) {
        await unpatchHtmlElevated(htmlPath, context);
      }
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

  const currentTheme = vscode.workspace.getConfiguration().get('workbench.colorTheme');
  if (currentTheme === 'Monokai Deuteranopia Colorblind') {
    const cssPath = getWorkbenchCssPath();
    if (cssPath) {
      try {
        const cssContent = fs.readFileSync(cssPath, 'utf-8');
        if (!isCssPatched(cssContent)) {
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
