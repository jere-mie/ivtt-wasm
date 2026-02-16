import createIvttModule from '../dist/ivtt.mjs';

const presetSelect = document.getElementById('preset');
const uploadInput = document.getElementById('upload');
const argsInput = document.getElementById('args');
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const runBtn = document.getElementById('runBtn');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const statusEl = document.getElementById('status');
const stderrLog = document.getElementById('stderrLog');

let lastOutput = '';
let lastOutputName = 'ivtt_output.txt';

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? 'crimson' : '';
}

function isIvttV2(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  return /^#=IVTFF\b/.test(firstLine) && /\b2\.0\b/.test(firstLine);
}

function parseArgs(raw) {
  if (!raw.trim()) return [];
  return raw.trim().split(/\s+/g);
}

async function loadPresetManifest() {
  const response = await fetch('./static/transliterations/manifest.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load transliteration manifest (${response.status})`);
  }
  const files = await response.json();
  if (!Array.isArray(files)) {
    throw new Error('Transliteration manifest must be an array of filenames.');
  }
  return files;
}

async function loadPresetFile(fileName) {
  const response = await fetch(`./static/transliterations/${encodeURIComponent(fileName)}`);
  if (!response.ok) {
    throw new Error(`Unable to load ${fileName}`);
  }
  return response.text();
}

async function initPresetSelector() {
  const files = await loadPresetManifest();
  presetSelect.innerHTML = '';

  for (const fileName of files) {
    const option = document.createElement('option');
    option.value = fileName;
    option.textContent = fileName;
    presetSelect.append(option);
  }

  if (files.length > 0) {
    const text = await loadPresetFile(files[0]);
    inputText.value = text;
    setStatus(`Loaded preset: ${files[0]}`);
  } else {
    inputText.value = '';
    setStatus('No preset files listed in static/transliterations/manifest.json.');
  }
}

presetSelect.addEventListener('change', async () => {
  try {
    const fileName = presetSelect.value;
    const text = await loadPresetFile(fileName);
    inputText.value = text;
    outputText.value = '';
    stderrLog.textContent = '';
    downloadBtn.disabled = true;
    copyBtn.disabled = true;
    setStatus(`Loaded preset: ${fileName}`);
  } catch (error) {
    setStatus(error.message, true);
  }
});

uploadInput.addEventListener('change', async () => {
  const file = uploadInput.files?.[0];
  if (!file) return;

  const text = await file.text();
  inputText.value = text;
  outputText.value = '';
  stderrLog.textContent = '';
  downloadBtn.disabled = true;
  copyBtn.disabled = true;
  setStatus(`Loaded local file: ${file.name}`);
});

runBtn.addEventListener('click', async () => {
  outputText.value = '';
  stderrLog.textContent = '';
  lastOutput = '';
  downloadBtn.disabled = true;
  copyBtn.disabled = true;

  const rawInput = inputText.value;
  if (!rawInput.trim()) {
    setStatus('Input is empty.', true);
    return;
  }

  if (!isIvttV2(rawInput)) {
    setStatus('Input does not look like IVTFF 2.0. Expected header: #=IVTFF ... 2.0 ...', true);
    return;
  }

  const userArgs = parseArgs(argsInput.value);
  const stderrLines = [];
  const stdoutLines = [];

  setStatus('Running IVTT WASM...');

  try {
    const Module = await createIvttModule({
      noInitialRun: true,
      noExitRuntime: true,
      print: (line) => {
        stdoutLines.push(String(line));
      },
      printErr: (line) => {
        stderrLines.push(String(line));
      },
    });

    try {
      Module.FS.mkdir('/work');
    } catch {
    }

    const inPath = '/work/input.ivtff';
    const outPath = '/work/output.txt';
    Module.FS.writeFile(inPath, rawInput, { encoding: 'utf8' });

    let exitCode = 0;
    try {
      const maybeExit = Module.callMain([...userArgs, inPath, outPath]);
      if (typeof maybeExit === 'number') {
        exitCode = maybeExit;
      }
    } catch (error) {
      if (typeof error?.status === 'number') {
        exitCode = error.status;
      } else {
        throw error;
      }
    }

    const output = Module.FS.readFile(outPath, { encoding: 'utf8' });
    outputText.value = output;
    lastOutput = output;
    lastOutputName = `ivtt_output_${Date.now()}.txt`;
    downloadBtn.disabled = false;
    copyBtn.disabled = false;

    const stderrText = stderrLines.join('\n').trim();
    const stdoutText = stdoutLines.join('\n').trim();
    stderrLog.textContent = [stderrText, stdoutText].filter(Boolean).join('\n');

    setStatus(`Completed with IVTT exit code ${exitCode}.`);
  } catch (error) {
    stderrLog.textContent = String(error?.stack || error?.message || error);
    setStatus('Failed running IVTT WASM. Confirm dist/ivtt.mjs and dist/ivtt.wasm are built and served.', true);
  }
});

copyBtn.addEventListener('click', async () => {
  if (!lastOutput) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(lastOutput);
    } else {
      outputText.removeAttribute('readonly');
      outputText.select();
      document.execCommand('copy');
      outputText.setAttribute('readonly', 'readonly');
      outputText.setSelectionRange(0, 0);
    }
    setStatus('Output copied to clipboard.');
  } catch (error) {
    setStatus('Could not copy output to clipboard in this browser context.', true);
  }
});

downloadBtn.addEventListener('click', () => {
  if (!lastOutput) return;

  const blob = new Blob([lastOutput], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = lastOutputName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
});

(async () => {
  try {
    await initPresetSelector();
  } catch (error) {
    setStatus(error.message, true);
  }
})();
