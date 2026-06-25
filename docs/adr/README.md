# Architecture Decision Records

Decisions ratified in the ADR/contracts sprint (2026-06-25) for the **"Through the Clouds"**
Borneo SAR deforestation-alert build. These annotate `BUILD_CONTRACT.md` (§12) and
`INFRA_CONTRACT.md`; they do not replace them.

| ADR | Decision | Amends |
|-----|----------|--------|
| [0001](0001-classical-no-ml-change-detection.md) | Classical 2-date L-band HV Δ-threshold, no ML | BUILD §1–3 |
| [0002](0002-single-linear-agent.md) | Single linear agent; reject 6-agent split; human C→D gate | BUILD §2 |
| [0003](0003-calibration-dn-vs-db-preflight.md) | Blocking DN-vs-dB pre-flight before calibration | BUILD §3.4 |
| [0004](0004-mmu-from-native-resolution.md) | Derive MMU pixel-count from real resolution (fix 0.2 ha/32 px/25 m) | BUILD §3.9 |
| [0005](0005-hansen-cross-reference-not-truth.md) | Hansen = cross-reference, not truth; SPOT optional | BUILD §5 |
| [0006](0006-reuse-existing-venv.md) | Reuse existing 3.13 venv + folium (not fresh pinned 3.11) | BUILD §7 |
| [0007](0007-ship-caveated-demo.md) | Ship caveated demo over blocking on gates | BUILD §8.6 |
| [0008](0008-hosting-static-vercel.md) | Static bundle on Vercel CDN + QR; Mongo/SaaS optional | INFRA_CONTRACT |
| [0009](0009-isometric-demo-view.md) | Isometric / 2.5D pitch view (MapLibre extrusion / deck.gl) | BUILD §6 |

Status of all: **Accepted** (ADR-0009 renderer finalised in the pre-build prose review).
