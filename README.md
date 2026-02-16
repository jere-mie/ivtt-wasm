# IVTT WASM Web Tool

This project runs the IVTT command-line tool (Intermediate Voynich Transliteration Tool) in the browser via WebAssembly.

Users can:
- pick a transliteration file from the repository corpus,
- upload their own IVTFF text file,
- apply IVTT command options,
- run the tool in-browser,
- inspect output and stderr,
- download transformed output.

IVTT is designed for processing IVTFF transliteration files used in Voynich manuscript research. It acts as a configurable text transformation/filtering engine: selecting loci/pages, handling comments and foliation metadata, normalizing spaces/ligatures/alternate readings, and producing output tailored for specific analysis steps.

## What this is

- A browser adapter around the original IVTT CLI model (`main(argc, argv)`) compiled with Emscripten.
- A thin UI that maps user input into the Emscripten virtual filesystem and invokes `Module.callMain(...)`.
- A practical way to reuse proven C behavior without rewriting IVTT logic in JavaScript.

## How it works

At runtime:
1. The app instantiates the WASM module (`dist/ivtt.mjs` + `dist/ivtt.wasm`).
2. Input text is written to the in-memory Emscripten FS (e.g. `/work/input.ivtff`).
3. User-supplied IVTT options are tokenized.
4. `Module.callMain([...args, inPath, outPath])` invokes native CLI behavior.
5. Output is read from `/work/output.txt` and shown in the UI.
6. stderr/stdout are captured for diagnostics.

## Repository layout

- `index.html` — interactive web interface
- `app.mjs` — browser glue code for module loading, file IO, and CLI invocation
- `transliterations/` — sample corpus files + `manifest.json`
- `scripts/build_wasm.ps1` — reproducible Emscripten build script (Windows)
- `dist/ivtt.mjs` — prebuilt JS loader for the WASM module (if present)
- `dist/ivtt.wasm` — prebuilt compiled IVTT binary (if present)

## IVTT option cheat sheet

Use these flags in the web app "command options" field (for example: `-x7` or `-f1 -c3 -u1`).

| Option | What it does |
|---|---|
| `-x0..-x8` | Compound presets of common transformations (`-x7` is commonly used for cleanup). |
| `-f0/-f1` | Keep or remove foliation and file header metadata. |
| `-c0..-c3` | Comment filtering behavior (textual, variable/tag comments, broader removal). |
| `-u0..-u5` | Uncertain reading handling (keep, first alt reading, `?`, remove words/lines). |
| `-l0..-l3` | Ligature handling (keep, strip brackets, capitalization modes). |
| `-s0..-s3` | Hard-space (`.`) handling (keep/blank/strip/newline). |
| `-h0..-h3` | Uncertain-space (`,`) handling (keep/dot-like/strip/`?`). |
| `-w0..-w9` | Wrapping mode (maintain, unwrap continuation, or wrap to configured width). |
| `-b0/-b1` | Keep or strip whitespace. |
| `-tX` / `+tX` | Select transcriber `X` and control transcriber ID retention in output. |
| `+@P` / `-@P` | Include or exclude locus type filters. |
| `+Av` / `-Av` | Include or exclude by page/tag variable values (`A..Z`). |

For complete option semantics and caveats, consult the official IVTT manual.

## Build instructions

### Prerequisites

- Windows PowerShell
- Emscripten SDK (`emcc` available in current shell)
- Node.js (for smoke test and optional local server tooling)
- Optional: Python for `python -m http.server`

### Compile to WebAssembly

From workspace root:

```powershell
./scripts/build_wasm.ps1
```

Expected artifacts:
- `dist/ivtt.mjs`
- `dist/ivtt.wasm`

### Compile to WebAssembly (Linux/macOS)

If `emcc` is available in your shell:

```bash
mkdir -p ./dist

emcc ./ivtt.c \
	-O3 \
	-sMODULARIZE=1 \
	-sEXPORT_ES6=1 \
	-sEXPORT_NAME=createIvttModule \
	-sENVIRONMENT=web,worker,node \
	-sEXPORTED_RUNTIME_METHODS=FS,callMain \
	-sFORCE_FILESYSTEM=1 \
	-sALLOW_MEMORY_GROWTH=1 \
	-o ./dist/ivtt.mjs
```

This produces the same expected artifacts:
- `dist/ivtt.mjs`
- `dist/ivtt.wasm`

### Run the web app locally

Serve the folder over HTTP (required for ES module + WASM loading):

```powershell
python -m http.server 8000
```

Then open:

`http://localhost:8000/`

## Prebuilt WASM artifacts

You can consume the prebuilt artifacts directly:

- Local module path: `dist/ivtt.mjs`
- Local wasm path: `dist/ivtt.wasm`
- GitHub repo: https://github.com/jere-mie/ivtt-wasm

Raw-hosted artifact URLs (main branch):
- https://raw.githubusercontent.com/jere-mie/ivtt-wasm/main/dist/ivtt.mjs
- https://raw.githubusercontent.com/jere-mie/ivtt-wasm/main/dist/ivtt.wasm

Please consider building your own research tools, web UIs, or data-processing pipelines on top of this WASM packaging.

## IVTFF input expectation

The UI checks for an IVTFF 2.0-style header before execution. The first line is expected to include:

- `#=IVTFF`
- `2.0`

This is a lightweight guard, not a full validator of every IVTFF rule.

## How this was made

Implementation approach:
- Started from existing C CLI behavior and analysis docs.
- Chose CLI-in-WASM architecture to preserve parity with native option semantics.
- Implemented minimal UI for:
	- preset corpus selection,
	- local file upload,
	- raw IVTT args entry,
	- run + output/download,
	- stderr visibility.
- Added reproducible build and a smoke test script.

## Sources and references

Primary project/domain references:
- https://www.voynich.nu/
- https://www.voynich.nu/extra/sp_transcr.html#ivtt
- https://www.voynich.nu/software/ivtt/IVTT_manual.pdf
- https://www.voynich.nu/software/ivtt/IVTFF_format.pdf

Original IVTT C source location:
- https://www.voynich.nu/software/ivtt/ivtt.c

Transliteration corpus source page:
- https://www.voynich.nu/transcr.html

## Important attribution and provenance

- **IVTT and IVTFF copyright ownership:** René Zandbergen.
- **Original IVTT C source in this repo:** not provided.
- **Where to obtain original `ivtt.c`:** https://www.voynich.nu/software/ivtt/ivtt.c
- **Where transliteration files were procured:** https://www.voynich.nu/transcr.html

## Notes

- Browser filesystem usage is in-memory unless persistence is explicitly added.
- Since IVTT uses global mutable state internally, creating a fresh module instance per run is the safest default.
