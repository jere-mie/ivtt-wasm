/**
 * IVTT Web - Application Module
 *
 * Plain ES module. No framework dependencies.
 * Manages all UI state, DOM updates, and WASM interaction.
 */

import createIvttModule from '../dist/ivtt.mjs';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

const S = {
    presetFiles: [],
    inputText: '',
    outputText: '',
    uploadName: '',

    activePreset: 7,

    opts: { c: '', f: '', p: '', q: '', u: '', l: '', a: '', s: '', h: '', b: '', w: '', m: '' },

    sel: {
        I: { mode: '', value: '' },
        L: { mode: '', value: '' },
        H: { mode: '', value: '' },
        C: { mode: '', value: '' },
    },

    customFilters: [],

    locus: { P: '', L: '', C: '', R: '' },

    transcriberMode: '',
    transcriberId: '',

    manualArgs: '',

    activeTab: 'annotations',
    logOpen: false,
    logText: '',
    status: 'Ready',
    statusType: '',
    running: false,
    lastOutput: '',
    lastOutputName: '',
};

/* ------------------------------------------------------------------ */
/*  Computed helpers                                                    */
/* ------------------------------------------------------------------ */

function generatedArgs() {
    if (S.manualArgs.trim().length > 0) return S.manualArgs.trim();

    const parts = [];
    if (S.activePreset !== null) parts.push('-x' + S.activePreset);

    for (const [k, v] of Object.entries(S.opts)) {
        if (v !== '') parts.push('-' + k + v);
    }
    for (const [varName, s] of Object.entries(S.sel)) {
        if (s.mode && s.value) parts.push(s.mode + varName + s.value);
    }
    for (const cf of S.customFilters) {
        if (cf.mode && cf.varName && cf.value) {
            parts.push(cf.mode + cf.varName.toUpperCase() + cf.value);
        }
    }
    for (const [type, mode] of Object.entries(S.locus)) {
        if (mode) parts.push(mode + '@' + type);
    }
    if (S.transcriberMode && S.transcriberId.trim()) {
        parts.push(S.transcriberMode + 't' + S.transcriberId.trim());
    }
    return parts.join(' ');
}

function inputLines() { return S.inputText ? S.inputText.split('\n').length : 0; }
function outputLines() { return S.outputText ? S.outputText.split('\n').length : 0; }

/* ------------------------------------------------------------------ */
/*  DOM helpers                                                        */
/* ------------------------------------------------------------------ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

let R = {};

function cacheRefs() {
    R = {
        presetSelect:     $('#preset-select'),
        uploadInput:      $('#upload-input'),
        uploadBtn:        $('#btn-upload'),
        uploadNameEl:     $('#upload-name'),
        uploadHintDef:    $('#upload-hint-default'),

        presetCards:      $$('[data-preset]'),
        tabs:             $$('[data-tab]'),
        tabPanels:        $$('[data-tab-panel]'),

        optSelects:       $$('[data-opt]'),
        selModeSelects:   $$('[data-sel-mode]'),
        selValueSelects:  $$('[data-sel-value]'),
        locusSelects:     $$('[data-locus]'),

        transcriberMode:  $('#transcriber-mode'),
        transcriberId:    $('#transcriber-id'),

        customContainer:  $('#custom-filters'),
        addFilterBtn:     $('#btn-add-filter'),

        argsCode:         $('#args-code'),
        manualArgsInput:  $('#manual-args'),

        btnRun:           $('#btn-run'),
        btnDownload:      $('#btn-download'),
        btnCopy:          $('#btn-copy'),
        statusText:       $('#status-text'),

        inputTextarea:    $('#input-textarea'),
        outputTextarea:   $('#output-textarea'),
        inputBadge:       $('#input-badge'),
        outputBadge:      $('#output-badge'),

        logPanel:         $('#log-panel'),
        logHeader:        $('#log-header'),
        logOutput:        $('#log-output'),
    };
}

/* ------------------------------------------------------------------ */
/*  Render (state -> DOM)                                              */
/* ------------------------------------------------------------------ */

function render() {
    // Preset cards
    R.presetCards.forEach(c => {
        c.classList.toggle('active', S.activePreset === +c.dataset.preset);
    });

    // Tabs + panels
    R.tabs.forEach(t => {
        t.classList.toggle('active', S.activeTab === t.dataset.tab);
        t.setAttribute('aria-selected', String(S.activeTab === t.dataset.tab));
    });
    R.tabPanels.forEach(p => {
        p.classList.toggle('active', S.activeTab === p.dataset.tabPanel);
    });

    // Option selects
    R.optSelects.forEach(s => { s.value = S.opts[s.dataset.opt] || ''; });

    // Variable selection controls
    R.selModeSelects.forEach(s => { s.value = S.sel[s.dataset.selMode].mode; });
    R.selValueSelects.forEach(s => {
        const v = s.dataset.selValue;
        s.value = S.sel[v].value;
        s.disabled = !S.sel[v].mode;
    });

    // Locus selects
    R.locusSelects.forEach(s => { s.value = S.locus[s.dataset.locus] || ''; });

    // Transcriber
    R.transcriberMode.value = S.transcriberMode;
    R.transcriberId.value = S.transcriberId;
    R.transcriberId.disabled = !S.transcriberMode;

    // Upload hint
    R.uploadNameEl.textContent = S.uploadName;
    R.uploadNameEl.hidden = !S.uploadName;
    R.uploadHintDef.hidden = !!S.uploadName;

    // Generated args
    R.argsCode.textContent = generatedArgs() || '(no options)';
    R.manualArgsInput.value = S.manualArgs;

    // Run bar
    R.btnRun.disabled = S.running;
    R.btnDownload.disabled = !S.lastOutput;
    R.btnCopy.disabled = !S.lastOutput;

    // Status
    R.statusText.textContent = S.status;
    R.statusText.className = 'status-text' + (S.statusType ? ' ' + S.statusType : '');

    // Workspace
    R.inputBadge.textContent = inputLines() + ' lines';
    R.outputBadge.textContent = outputLines() + ' lines';
    if (R.inputTextarea.value !== S.inputText) R.inputTextarea.value = S.inputText;
    R.outputTextarea.value = S.outputText;

    // Log
    const logDisabled = !S.logText || !S.logText.trim();
    R.logPanel.classList.toggle('collapsed', !S.logOpen);
    R.logPanel.classList.toggle('disabled', logDisabled);
    R.logOutput.hidden = !S.logOpen;
    R.logOutput.textContent = S.logText;

    // Custom filters
    renderCustomFilters();
}

function renderCustomFilters() {
    const c = R.customContainer;
    c.innerHTML = '';

    S.customFilters.forEach((cf, idx) => {
        const row = document.createElement('div');
        row.className = 'custom-sel-row';

        const modeSel = document.createElement('select');
        modeSel.innerHTML = '<option value="+">Include (+)</option><option value="-">Exclude (-)</option>';
        modeSel.value = cf.mode;
        modeSel.addEventListener('change', () => { cf.mode = modeSel.value; render(); });

        const varIn = Object.assign(document.createElement('input'), {
            type: 'text', maxLength: 1, placeholder: 'Var', value: cf.varName,
        });
        varIn.addEventListener('input', () => { cf.varName = varIn.value; render(); });

        const valIn = Object.assign(document.createElement('input'), {
            type: 'text', maxLength: 1, placeholder: 'Val', value: cf.value,
        });
        valIn.addEventListener('input', () => { cf.value = valIn.value; render(); });

        const rmBtn = Object.assign(document.createElement('button'), {
            type: 'button', className: 'btn-remove', innerHTML: '\u2715',
        });
        rmBtn.addEventListener('click', () => { S.customFilters.splice(idx, 1); render(); });

        row.append(modeSel, varIn, valIn, rmBtn);
        c.append(row);
    });
}

/* ------------------------------------------------------------------ */
/*  Event binding                                                      */
/* ------------------------------------------------------------------ */

function bindEvents() {
    R.presetSelect.addEventListener('change', onPresetChange);

    R.uploadBtn.addEventListener('click', () => R.uploadInput.click());
    R.uploadInput.addEventListener('change', onUpload);

    R.presetCards.forEach(card => {
        card.addEventListener('click', () => {
            const n = +card.dataset.preset;
            S.activePreset = S.activePreset === n ? null : n;
            render();
        });
    });

    R.tabs.forEach(tab => {
        tab.addEventListener('click', () => { S.activeTab = tab.dataset.tab; render(); });
    });

    R.optSelects.forEach(sel => {
        sel.addEventListener('change', () => { S.opts[sel.dataset.opt] = sel.value; render(); });
    });

    R.selModeSelects.forEach(sel => {
        sel.addEventListener('change', () => {
            const v = sel.dataset.selMode;
            S.sel[v].mode = sel.value;
            if (!sel.value) S.sel[v].value = '';
            render();
        });
    });
    R.selValueSelects.forEach(sel => {
        sel.addEventListener('change', () => {
            S.sel[sel.dataset.selValue].value = sel.value;
            render();
        });
    });

    R.locusSelects.forEach(sel => {
        sel.addEventListener('change', () => { S.locus[sel.dataset.locus] = sel.value; render(); });
    });

    R.transcriberMode.addEventListener('change', () => {
        S.transcriberMode = R.transcriberMode.value;
        if (!S.transcriberMode) S.transcriberId = '';
        render();
    });
    R.transcriberId.addEventListener('input', () => {
        S.transcriberId = R.transcriberId.value;
        render();
    });

    R.addFilterBtn.addEventListener('click', () => {
        S.customFilters.push({ mode: '+', varName: '', value: '' });
        render();
    });

    R.manualArgsInput.addEventListener('input', () => {
        S.manualArgs = R.manualArgsInput.value;
        render();
    });

    R.btnRun.addEventListener('click', run);
    R.btnDownload.addEventListener('click', download);
    R.btnCopy.addEventListener('click', copy);

    R.inputTextarea.addEventListener('input', () => {
        S.inputText = R.inputTextarea.value;
        render();
    });

    R.logHeader.addEventListener('click', () => {
        if (!S.logText || !S.logText.trim()) return;
        S.logOpen = !S.logOpen;
        render();
    });
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

function setStatus(text, type) {
    S.status = text;
    S.statusType = type || '';
    render();
}

async function loadPresetFile(fileName) {
    const resp = await fetch('./static/transliterations/' + encodeURIComponent(fileName));
    if (!resp.ok) throw new Error('Unable to load ' + fileName);
    return resp.text();
}

async function onPresetChange(e) {
    try {
        const fileName = e.target.value;
        const text = await loadPresetFile(fileName);
        S.inputText = text;
        S.outputText = '';
        S.logText = '';
        S.logOpen = false;
        S.lastOutput = '';
        setStatus('Loaded: ' + fileName);
    } catch (err) {
        setStatus(err.message, 'error');
    }
}

async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    S.inputText = text;
    S.outputText = '';
    S.logText = '';
    S.logOpen = false;
    S.lastOutput = '';
    S.uploadName = file.name;
    setStatus('Loaded: ' + file.name);
}

async function run() {
    S.outputText = '';
    S.logText = '';
    S.logOpen = false;
    S.lastOutput = '';

    if (!S.inputText.trim()) return setStatus('Input is empty.', 'error');

    const firstLine = (S.inputText.split(/\r?\n/, 1)[0]) || '';
    if (!/^#=IVTFF\b/.test(firstLine) || !/\b2\.0\b/.test(firstLine)) {
        return setStatus('Input does not look like IVTFF 2.0. Expected header: #=IVTFF ... 2.0 ...', 'error');
    }

    const argsStr = generatedArgs().trim();
    const userArgs = argsStr ? argsStr.split(/\s+/g) : [];
    const stderrLines = [];
    const stdoutLines = [];

    setStatus('Running IVTT...');
    S.running = true;
    render();

    try {
        const Module = await createIvttModule({
            noInitialRun: true,
            noExitRuntime: true,
            print: (line) => stdoutLines.push(String(line)),
            printErr: (line) => stderrLines.push(String(line)),
        });

        try { Module.FS.mkdir('/work'); } catch (_) { /* exists */ }

        const inPath = '/work/input.ivtff';
        const outPath = '/work/output.txt';
        Module.FS.writeFile(inPath, S.inputText, { encoding: 'utf8' });

        let exitCode = 0;
        try {
            const rc = Module.callMain([...userArgs, inPath, outPath]);
            if (typeof rc === 'number') exitCode = rc;
        } catch (error) {
            if (error && typeof error.status === 'number') exitCode = error.status;
            else throw error;
        }

        const output = Module.FS.readFile(outPath, { encoding: 'utf8' });
        S.outputText = output;
        S.lastOutput = output;
        S.lastOutputName = 'ivtt_output_' + Date.now() + '.txt';

        const stderr = stderrLines.join('\n').trim();
        const stdout = stdoutLines.join('\n').trim();
        S.logText = [stderr, stdout].filter(Boolean).join('\n');
        if (S.logText) S.logOpen = true;

        setStatus('Completed (exit code ' + exitCode + ')', 'success');
    } catch (error) {
        S.logText = String(error?.stack || error?.message || error);
        S.logOpen = true;
        setStatus('Failed - check that dist/ivtt.mjs and dist/ivtt.wasm are built and served.', 'error');
    } finally {
        S.running = false;
        render();
    }
}

async function copy() {
    if (!S.lastOutput) return;
    try {
        await navigator.clipboard.writeText(S.lastOutput);
        setStatus('Copied to clipboard.', 'success');
    } catch (_) {
        setStatus('Could not copy to clipboard.', 'error');
    }
}

function download() {
    if (!S.lastOutput) return;
    const blob = new Blob([S.lastOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: S.lastOutputName });
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Initialization                                                     */
/* ------------------------------------------------------------------ */

async function init() {
    cacheRefs();
    bindEvents();

    try {
        const resp = await fetch('./static/transliterations/manifest.json', { cache: 'no-store' });
        if (!resp.ok) throw new Error('Failed to load manifest (' + resp.status + ')');
        const files = await resp.json();
        if (!Array.isArray(files)) throw new Error('Manifest must be an array.');
        S.presetFiles = files;

        for (const file of files) {
            const opt = Object.assign(document.createElement('option'), {
                value: file, textContent: file,
            });
            R.presetSelect.append(opt);
        }

        if (files.length > 0) {
            const text = await loadPresetFile(files[0]);
            S.inputText = text;
            setStatus('Loaded: ' + files[0]);
        }
    } catch (err) {
        setStatus(err.message, 'error');
    }

    render();
}

init();
