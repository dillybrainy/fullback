#!/usr/bin/env bash
# Build both contracts to contract/res/ (dipakai skrip deploy tanpa perlu Rust).
# Butuh cargo-near: https://github.com/near/cargo-near
# --no-abi: pembuatan ABI gagal di Windows, dan ABI tidak dipakai oleh web/agen.
set -euo pipefail
cd "$(dirname "$0")"
cargo near build non-reproducible-wasm --no-abi
(cd ft && cargo near build non-reproducible-wasm --no-abi)
mkdir -p res
cp target/near/fullback.wasm res/fullback.wasm
cp target/near/feur/feur.wasm res/feur.wasm
ls -l res
