#!/usr/bin/env bash
# Deploy ulang kontrak FULLBACK dan/atau fEUR ke akun yang sudah ada (testnet saja).
# Untuk dunia demo baru dari nol, pakai `npm run setup:demo`.
#
# Pakai near-cli-rs (https://github.com/near/near-cli-rs) dengan kunci di keychain.
#   ./scripts/deploy.sh fullback fullback.<master>.testnet feur.<master>.testnet
#   ./scripts/deploy.sh feur     feur.<master>.testnet
# Tambah --redeploy untuk memperbarui kode tanpa memanggil `new` lagi (state tetap).
set -euo pipefail
cd "$(dirname "$0")/.."

which="${1:?fullback|feur}"; target="${2:?account id}"
case "$which" in
  fullback) wasm=contract/res/fullback.wasm; init="{\"ft_id\":\"${3:?fEUR account id}\"}" ;;
  feur)     wasm=contract/res/feur.wasm;     init="{\"owner_id\":\"$target\"}" ;;
  *) echo "first argument must be fullback or feur" >&2; exit 1 ;;
esac
case "$target" in *.testnet) ;; *) echo "testnet accounts only" >&2; exit 1 ;; esac

if [[ " $* " == *" --redeploy "* ]]; then
  near contract deploy "$target" use-file "$wasm" without-init-call \
    network-config testnet sign-with-keychain send
else
  near contract deploy "$target" use-file "$wasm" \
    with-init-call new json-args "$init" prepaid-gas '30 Tgas' attached-deposit '0 NEAR' \
    network-config testnet sign-with-keychain send
fi
echo "https://testnet.nearblocks.io/address/$target"
