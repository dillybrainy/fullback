# FULLBACK frontend

Visual authority: [FULLBACK Figma](https://www.figma.com/design/554rVc9k58NLyfZ1ygdDIY?node-id=0-1), sections 01–09. This implementation preserves the supplied visual world. Phase 2 requires the testnet integration first.

The public home page explains protected football transfer payments. Application pages support clubs, academies, and federation observers. All interface copy is English. Existing neutral example data remains the source for amounts and dates.

## Tokens

| Role | Value |
|---|---|
| Page background | #F3F4EF |
| Surface | #FFFFFF |
| Main text | #111111 |
| Secondary text | #666666 |
| Divider | #E9E9E9 |
| Segmented control | #E8EAE3 |
| Primary | #13235B |
| Footer | #0F1A3D |
| Attention | #FFD60A |
| Paid background / text | #E7F4EC / #1E6B3A |
| Error | #B42318 |

Schibsted Grotesk is self-hosted at weights 400, 500, and 600. Desktop hero uses 80/84px; section headings 56/58px; application headings 48/53px. Mobile uses the separate 390px Figma reference: hero 44/48px, section headings 34/37px.

Desktop content is 1280px inside a 1440px frame, with 80px side padding. Mobile padding is 20px. Cards use 24px corners; large panels 32px; buttons and inputs 12px. Public mobile sections follow their own comp, including the white royalty card, feature rows, white process section, collapsed FAQ, and 460px closing photograph.

## Motion

The Figma file returned no canvas keyframes. Additional motion implements the user's explicit request: a royalty receipt arrives once when the process section becomes visible (540ms); navigation menus arrive in 240ms; tab and disclosure state changes use 200–220ms. The receipt is visible by default, does not loop, and skips motion when reduced motion is enabled. CSS animations and smooth scrolling also honor reduced motion.

## Assets and behavior

Photos and logo assets are downloaded from the Figma file and served locally, never from temporary asset URLs. Next Image handles raster sizing and lazy loading. Club names, fees, dates, percentages, and example statuses are supplied by the existing mock data.

Unavailable wallet, AI reader, and contract actions stay explicitly unavailable. No successful transaction, wallet login, explorer receipt, or PDF match is simulated. PDF hashing stays local to the browser; uploads support PDF selection and drag-and-drop up to 20 MB.
