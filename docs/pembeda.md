# Pembeda FULLBACK dari solusi lain

Dikumpulkan 12 Nov 2026 oleh Orang 4. Dipakai untuk menjawab pertanyaan juri "apa bedanya dengan X?".

## Jawaban satu kalimat (EN)

> FIFA's Clearing House only handles training rewards. Nobody guarantees the installments or the sell-on clause. FULLBACK is the first escrow that holds the buyer's collateral and pays every party automatically, from the first installment to the next resale.

## Peta pesaing

| Solusi | Apa yang dilakukan | Apa yang tidak dilakukan (celah FULLBACK) | Sumber |
|---|---|---|---|
| **FIFA Clearing House** (Paris, sejak Nov 2022) | Menghitung dan menyalurkan training rewards (training compensation + solidarity) secara otomatis. Hampir $1 miliar dialokasikan, ±$639 juta dibayarkan. | Tidak memegang jaminan dan tidak menagih cicilan transfer. Sell-on tetap urusan dua klub. Memakai rel bank biasa, dan tidak ada bukti publik per transaksi. | [FIFA, 17 Jul 2026](https://inside.fifa.com/en/news/world-cup-2026-shines-spotlight-clearing-house-training-rewards-1-billion-usd-milestone), [Crypto Briefing](https://cryptobriefing.com/fifa-clearing-house-billion-training-rewards/) |
| **Blocsport.one** | Ledger (Hyperledger Fabric) untuk data pemain terverifikasi dan pencatatan komisi/solidarity. | Fokus pada pencatatan dan scouting, bukan escrow. Tidak menahan uang pembeli dan tidak membayar cicilan secara otomatis. | [Espeo case study](https://espeo.eu/?p=18566) |
| **Vasco da Gama × Mercado Bitcoin (Vasco Token / Futecoin)** | Menjual hak solidarity milik klub kepada investor dalam bentuk token. Pemegang token menerima bagian saat pemain dijual. | Produk investasi untuk fans dan investor, bukan alat penagihan. Tetap bergantung pada pembeli yang mau membayar. | [Cointelegraph](https://cointelegraph.com/news/leading-brazilian-soccer-team-to-tokenize-fifa-player-transfer-fees), [Ledger Insights](https://www.ledgerinsights.com/brazilian-soccer-blockchain-tokens-player-transfers/), [NetVasco: payout Coutinho 2023](https://www.netvasco.com.br/n/324460/investidores-do-vasco-token-receberam-rendimentos-relativos-a-transferencia-de-philippe-coutinho-para-o-al-duhail-cat) |
| **WIN Investments × MANTRA** | Tokenisasi pendapatan transfer dan hak solidarity untuk investor (RWA). | Sama seperti Vasco: memperdagangkan klaim, bukan menegakkan pembayaran. | [TechBullion](https://techbullion.com/tokenizing-talent-how-mantra-and-win-are-turning-football-transfers-into-onchain-assets/) |
| **RoadToPro** (ETHGlobal Buenos Aires, Chiliz) | NFT kepemilikan atlet dan pendanaan on-chain untuk pemain muda. | Pendanaan pemain, bukan pembayaran antarklub. | [ETHGlobal showcase](https://ethglobal.com/showcase/roadtopro-q20m1) |
| **Pembayaran transfer dengan stablecoin** (mis. São Paulo FC dengan USDC) | Membayar biaya transfer lebih cepat lewat kripto. | Hanya mempercepat pembayaran yang memang mau dibayar. Tidak ada jaminan, cicilan otomatis, atau pembagian. | [Cointelegraph opini, Sep 2025](https://cointelegraph.com/news/blockchain-football-transfer-system?rand=6792) |
| **Jalur hukum (FIFA Football Tribunal → CAS)** | Klub penjual menggugat lalu menunggu putusan. Sanksinya larangan transfer. | Lambat dan mahal, dengan bunga default hanya 5% per tahun. Contoh: AIK baru menang di CAS hampir dua tahun setelah menjual Omar Faraj. | [Football Legal](https://football-legal.com/content/acceleration-clause-cas-2025-a-11962-zamalek-sc-v-aik-ff-sweden), [AIK pressmeddelande](https://www.placera.se/pressmeddelanden/aik-fotboll-cas-har-avgjort-tvisten-med-zamalek-sc-till-aik-fotbolls-fordel-20260702) |

> Catatan: "TransferChain" dan "Sevilla Transfer Tracker" yang disebut di PLAN tidak ditemukan sebagai produk yang bisa diverifikasi. Jangan disebut di pitch sampai ada sumbernya.

## Yang hanya dimiliki FULLBACK

1. **Jaminan dipegang kontrak.** Cicilan telat langsung dibayar dari jaminan oleh siapa pun yang memanggil `settle_due`, tanpa menunggu tribunal.
2. **Satu transaksi, semua pihak dibayar.** Penjual, akademi (Academy royalties), dan pemegang sell-on dibayar bersamaan, baik saat cicilan maupun saat penjualan ulang.
3. **PDF perjanjian punya sidik jari on-chain.** Siapa pun bisa membuktikan bahwa PDF yang dipegang sama dengan yang disepakati.
4. **AI yang tidak bisa mencuri.** Agen Penagih memakai function-call access key yang hanya boleh memanggil `settle_due`, dan ini bisa didemokan langsung.
5. **Federasi bisa memantau tanpa memegang uang.** Federation view bersifat read-only dari data publik.

## Pertanyaan juri yang mungkin muncul

- **"Kenapa tidak pakai FIFA Clearing House saja?"** → Clearing House tidak menyentuh cicilan dan sell-on. FULLBACK bisa berjalan berdampingan: royalti akademi tetap sesuai aturan FIFA, sedangkan cicilan dan sell-on akhirnya punya penjamin.
- **"Klub mau menaruh jaminan?"** → Klausul akselerasi dan penalti sudah lazim di kontrak transfer (contoh AIK–Zamalek). Jaminan satu cicilan lebih murah daripada larangan transfer tiga periode.
- **"Kenapa NEAR?"** → Function-call access key bawaan NEAR membuat agen AI hanya bisa memanggil satu fungsi. Selain itu, akun yang mudah dibaca (`klub.near`) dan biaya transaksi rendah cocok untuk klub kecil.
- **"Uang asli?"** → Belum. Demo memakai testnet dan fEUR mainan. Langkah berikutnya adalah stablecoin euro dan NEAR Intents di mainnet.
