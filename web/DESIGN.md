# FULLBACK frontend

Visual foundation: [FULLBACK Figma](https://www.figma.com/design/554rVc9k58NLyfZ1ygdDIY?node-id=0-1), sections 01–09. The user subsequently approved departures from its composition for a bolder public navbar and landing. The navy/yellow identity, local font, goal-frame logo, football assets and product truth remain established. Current public-navigation details: [NAVBAR.md](NAVBAR.md). Phase 2 requires the testnet integration first.

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

Schibsted Grotesk is self-hosted at weights 400, 500, and 600 through next/font/local, with hashed runtime files, preload, adjusted fallback metrics, and no synthesized weights. The current hero scales to 88px with 1.04 line height and -.035em tracking; mobile uses 52px. Section headings retain 56/58px desktop and 34/37px mobile; the closing statement scales to 64px. App headings retain their functional hierarchy.

Desktop content is 1280px inside a 1440px frame, with 80px side padding. Mobile padding is 20px. Cards use 24px corners; large panels 32px; buttons and inputs 12px. Public mobile sections follow their own comp, including the white royalty card, feature rows, white process section, collapsed FAQ, and 460px closing photograph.

Home revision: the hero photograph and navy footer extend to both viewport edges, including displays wider than 1440px. Their inner content and the remaining sections retain the centered 1440px frame. The closing photograph uses a navy overlay with a white headline for reliable readability.

Closing-photo copy and CTA sit in the upper sky area, leaving the players visible. Desktop top inset is 48px; mobile uses 24px, smaller display type, and a 25% horizontal photo position to retain the group in the crop.

Public-navbar revision: a fixed inset navy control bar, white goal-frame logo, active segmented links, outlined Verify, and yellow Connect wallet. Desktop control bar is at most 1280px; at 1100px and below it switches to a non-modal anchored popover with 44px controls. The hero now uses the existing night-stadium photograph, a navy wash, white display type, yellow CTA, and a four-step transfer rail. Cards touched by this revision use 16px corners; control radii are mapped through shadcn's semantic variants. Tailwind theme/utilities coexist with the original styles in a legacy layer, without Preflight. No new font or raster is shipped.

## Motion

The Figma file returned no canvas keyframes. The user later supplied [HelloNear](https://hellonear.xyz/) as motion inspiration while retaining the original Figma world. Its layered hero, coordinated movement, and responsive details informed FULLBACK's own payment-and-football theme; none of its code or assets were copied.

The hero opens with a short yellow-ball pass and two headline beats (800ms, 130ms stagger), while the pitch photo settles (1300ms). A scroll-linked touchline connects the four process steps and leads to the royalty receipt. The payment example branches one incoming ball into four recipient packets (1750ms); amounts stay still. It plays once and offers keyboard Replay. Desktop role photos retain CSS hover on the inner image. These remain marketing illustrations, never transaction confirmations.

All product values and factual copy remain intact. The approved navbar/hero amplification changes the resting composition and reuses the existing night-stadium photo. GSAP Timeline/ScrollTrigger drive the Home story; the engine loads only on Home when motion is enabled. Content is complete without JavaScript. Live reduced motion reverts effects and hides Replay. Contexts, listeners, and pending refresh work are cleaned up on unmount; timed sequences finish when the document is hidden. Navbar interactions use short CSS transitions and are instant for keyboard opening/closing. No idle loop, pinning, scroll hijacking, or loading gate is used. See [MOTION.md](MOTION.md) and [NAVBAR.md](NAVBAR.md).

## Assets and behavior

Photos and logo assets are downloaded from the Figma file and served locally, never from temporary asset URLs. Responsive WebP variants are pre-generated with content hashes; native picture selects dimensions and lazy loading without a request-time optimizer. Desktop-only photos use a mobile data-URI fallback. Original PNG files live outside public in design-assets. Club names, fees, dates, percentages, and example statuses are supplied by the existing mock data.

Unavailable wallet, AI reader, and contract actions stay explicitly unavailable. No successful transaction, wallet login, explorer receipt, or PDF match is simulated. PDF hashing stays local to the browser; uploads support PDF selection and drag-and-drop up to 20 MB.

Access revision: only Home, Sign in, and Verify are public. Private page entries render only an access notice, then navigate to Sign in. Workspace prototypes are retained as source without being rendered by these routes. Home navigation is explicit; role choices and wallet connection remain disabled until real sign-in is integrated. See [ACCESS-AND-PREVIEW.md](ACCESS-AND-PREVIEW.md).
