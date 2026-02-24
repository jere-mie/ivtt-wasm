# IVTT WASM Web Tool

A browser-based interface for the **IVTT** (Intermediate Voynich Transliteration Tool) by Rene Zandbergen, compiled to WebAssembly via Emscripten. All processing runs locally in the browser - no server required.

## Features

- **Preset shortcuts** - one-click cards for common `-x0` through `-x8` compound transformations
- **Interactive option panels** - tabbed UI for every IVTT flag (filtering, comments, ligatures, spacing, wrapping, etc.)
- **Page/variable selection** - include/exclude loci by page type or variable value (`+@P` / `-@P`, `+Av` / `-Av`)
- **Transcriber selection** - pick a transcriber ID and control how IDs appear in output
- **Corpus browser** - choose from eight bundled IVTFF transliteration files or upload your own
- **Live arg preview** - the generated CLI invocation updates in real time as you change options
- **CLI override** - optionally supply raw argument strings for full control
- **Output workspace** - side-by-side input/output panes with download support
- **Runtime log** - collapsible accordion shows captured stdout/stderr for diagnostics

## How it works

1. The app dynamically imports the WASM module (`dist/ivtt.mjs` + `dist/ivtt.wasm`).
2. Input text is written to Emscripten's in-memory filesystem at `/work/input.ivtff`.
3. User-configured options are assembled into an argv array.
4. `Module.callMain([...args, inPath, outPath])` runs the native C logic.
5. Output is read back from `/work/output.txt` and displayed.
6. stdout/stderr are captured into the runtime log.

A fresh WASM module instance is created on every run because IVTT uses global mutable state internally.

## Technology

| Layer | Technology |
|---|---|
| C source | Original `ivtt.c` by Rene Zandbergen |
| Compilation | Emscripten (`emcc`) targeting WebAssembly |
| UI | Vanilla JavaScript ES module (no framework) |
| Styling | Custom CSS with dark "Scholar's Codex" theme |
| Fonts | Cormorant Garamond, Nunito, Fira Code (Google Fonts) |

## Minimal example

A self-contained [minimal.html](minimal.html) is included alongside the full app. It demonstrates the bare essentials needed to integrate the IVTT WASM module into your own interface:

- Load an IVTFF file (from bundled presets, upload, or direct text editing)
- Pass command-line options (defaults to `-x7`)
- Instantiate the Emscripten module, write input to the virtual filesystem, call `Module.callMain()`, and read the output back
- Display input/output side-by-side with a runtime log

All HTML, CSS, and JS live in a single file (~250 lines of script). Open it at `/minimal.html` when serving the project locally, or view it on the live site.

## Repository layout

```
index.html                  Main page
static/
  app.mjs                   ES module - UI state, DOM binding, WASM glue
  styles.css                Dark theme stylesheet
  transliterations/         Bundled IVTFF corpus files
    manifest.json           File list consumed by the app
    *.txt                   Eight transliteration files
dist/                       Build output (not committed)
  ivtt.mjs                  Emscripten JS loader
  ivtt.wasm                 Compiled WASM binary
ivtt.c                      IVTT C source (from Rene Zandbergen's original source, not included here)
```

## IVTT option cheat sheet

These flags can be applied via the interactive UI or the CLI override field.

| Option | What it does |
|---|---|
| `-x0` - `-x8` | Compound presets of common transformations (`-x7` is commonly used for cleanup). |
| `-f0` / `-f1` | Keep or remove foliation and file header metadata. |
| `-c0` - `-c3` | Comment filtering (textual, variable/tag, broader removal). |
| `-u0` - `-u5` | Uncertain reading handling (keep, first alt, `?`, remove words/lines). |
| `-l0` - `-l3` | Ligature handling (keep, strip brackets, capitalization modes). |
| `-s0` - `-s3` | Hard-space (`.`) handling (keep / blank / strip / newline). |
| `-h0` - `-h3` | Uncertain-space (`,`) handling (keep / dot-like / strip / `?`). |
| `-w0` - `-w9` | Wrapping mode (maintain, unwrap continuation, or wrap to width). |
| `-b0` / `-b1` | Keep or strip whitespace. |
| `-tX` / `+tX` | Select transcriber `X` and control ID retention in output. |
| `+@P` / `-@P` | Include or exclude locus type filters. |
| `+Av` / `-Av` | Include or exclude by page/tag variable values (`A`-`Z`). |

For complete semantics, consult the [IVTT manual (PDF)](https://www.voynich.nu/software/ivtt/IVTT_manual.pdf).

## Build instructions

### Prerequisites

- Emscripten SDK (`emcc` available in your shell)
- C source file: `ivtt.c` (from Rene Zandbergen's original source)

### Compile to WebAssembly

```bash
mkdir -p ./dist

emcc ./ivtt.c -O3 -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createIvttModule -sENVIRONMENT=web,worker,node -sEXPORTED_RUNTIME_METHODS=FS,callMain -sFORCE_FILESYSTEM=1 -sALLOW_MEMORY_GROWTH=1 -o ./dist/ivtt.mjs
```

This produces `dist/ivtt.mjs` and `dist/ivtt.wasm`.

### Run locally

You can use any static file server to serve the `index.html` and `dist/` files. A simple option is Python's built-in HTTP server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`.

## Prebuilt WASM artifacts

I've committed the prebuilt WASM artifacts to the `dist/` directory for convenience if you'd like to use them for your own projects, but you can also build them yourself using the instructions above. Keep in mind that ivtt is owned by Rene Zandbergen and is not currently licensed under an open-source license, so the prebuilt artifacts are provided here with express permission by Rene for this tool. If you want to use or modify the WASM module for your own projects, please reach out to Rene for permission.

- GitHub repo: <https://github.com/jere-mie/ivtt-wasm>
- `dist/ivtt.mjs` - JS loader
- `dist/ivtt.wasm` - compiled binary

Raw URLs (main branch):
- <https://raw.githubusercontent.com/jere-mie/ivtt-wasm/main/dist/ivtt.mjs>
- <https://raw.githubusercontent.com/jere-mie/ivtt-wasm/main/dist/ivtt.wasm>

## IVTFF input expectation

The app performs a lightweight header check before execution. The first line of input must contain `#=IVTFF` and `2.0`. This is a guard, not a full IVTFF validator.

## Sources and references

- Voynich portal: <https://www.voynich.nu/>
- IVTT overview: <https://www.voynich.nu/extra/sp_transcr.html#ivtt>
- IVTT manual: <https://www.voynich.nu/software/ivtt/IVTT_manual.pdf>
- IVTFF format spec: <https://www.voynich.nu/software/ivtt/IVTFF_format.pdf>
- Original `ivtt.c` source: <https://www.voynich.nu/software/ivtt/ivtt.c>
- Transliteration corpus: <https://www.voynich.nu/transcr.html>

## Attribution

- **IVTT and IVTFF** are copyright Rene Zandbergen.
- **Original `ivtt.c` source:** <https://www.voynich.nu/software/ivtt/ivtt.c>
- **Transliteration files:** <https://www.voynich.nu/transcr.html>

Permission to compile IVTT to WebAssembly and create this tool was granted by Rene Zandbergen. Please contact Rene for any use or modification of the IVTT logic or WASM module.
