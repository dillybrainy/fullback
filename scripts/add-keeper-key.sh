#!/usr/bin/env bash
# Menambah kunci terbatas untuk Agen Penagih: hanya boleh memanggil `settle_due`
# di kontrak FULLBACK, tidak bisa memanggil fungsi lain atau mengirim NEAR/fEUR.
# (`npm run setup:demo` sudah melakukan ini; skrip ini untuk akun Penagih lain.)
#
#   ./scripts/add-keeper-key.sh keeper.<master>.testnet fullback.<master>.testnet ed25519:<public key>
#
# Pasangan kunci baru bisa dibuat dengan `near account add-key ... autogenerate-new-keypair`;
# simpan kunci privatnya hanya di .env / env Vercel sebagai KEEPER_PRIVATE_KEY.
set -euo pipefail

keeper="${1:?keeper account id}"; contract="${2:?FULLBACK contract id}"; pubkey="${3:?ed25519:... public key}"
allowance="${ALLOWANCE:-2 NEAR}"
case "$keeper" in *.testnet) ;; *) echo "testnet accounts only" >&2; exit 1 ;; esac

near account add-key "$keeper" \
  grant-function-call-access --allowance "$allowance" --contract-account-id "$contract" --function-names settle_due \
  use-manually-provided-public-key "$pubkey" \
  network-config testnet sign-with-keychain send
