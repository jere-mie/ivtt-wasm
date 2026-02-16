$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Push-Location $root

try {
    New-Item -ItemType Directory -Path .\dist -Force | Out-Null

    emcc .\ivtt.c `
        -O3 `
        '-sMODULARIZE=1' `
        '-sEXPORT_ES6=1' `
        '-sEXPORT_NAME=createIvttModule' `
        '-sENVIRONMENT=web,worker,node' `
        '-sEXPORTED_RUNTIME_METHODS=FS,callMain' `
        '-sFORCE_FILESYSTEM=1' `
        '-sALLOW_MEMORY_GROWTH=1' `
        -o .\dist\ivtt.mjs

    Write-Host 'Built dist/ivtt.mjs and dist/ivtt.wasm'
}
finally {
    Pop-Location
}
