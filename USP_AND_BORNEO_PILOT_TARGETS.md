<<<<<<< Updated upstream
# Through the Clouds — USP & Borneo Pilot Targets

> Replaces `Treefera Hackathon.md`. The old file listed generic EUDR commodity
> buyers (Nestlé, Cargill, JBS…) without tying back to our actual wedge or to
> Borneo-named operators. This rewrite is a buyer map for the SAR-through-cloud
> product we built in the hackathon, organised by who can buy it now.

## 0. The wedge in one paragraph

We deliver a **cloud- *and* canopy-penetrating L-band SAR deforestation alert
layer** for Borneo, validated against Hansen GFC + RADD + SPOT-7 high-res. The
output is a GeoJSON of polygon alerts with `area_ha`, `mean_delta_hv_db`,
`baseline_hv_db`, and a `candidate_plantation_frontier` flag, ready to drop
into the Treefera platform's first-mile evidence stack. Built on JAXA ALOS-2
PALSAR-2 annual mosaics fused with Sentinel-1 and AlphaEarth Foundation
embeddings.

## 1. Why we win versus what's already out there

| Existing layer | Owner | Sensor | Borneo failure mode |
|----------------|-------|--------|---------------------|
| **Hansen GFC** | UMD / Google | Landsat optical, annual | Months of cloud cover wipe the year |
| **Planet / NICFI** | Planet Labs / NICFI | Optical PlanetScope | Cloud-blocked; pay-per-tile |
| **RADD alerts** | WUR / Satelligence / WRI | Sentinel-1 C-band | Cloud-penetrating BUT C-band saturates under dense canopy and second-growth |
| **JJ-FAST** | JAXA / JICA | PALSAR-2 ScanSAR | Cloud-penetrating BUT ≥ 1.5 ha MMU, coarse |
| **Ours — Through the Clouds** | hackathon → Treefera | L-band PALSAR + Sentinel-1 fusion + AEF embedding cross-check | Cloud + canopy through-vision, 0.2 ha MMU, frontier-flag heuristic |

The honest sentence: **RADD already sees through cloud. We see through cloud
*and* through regrowth canopy, with a tighter MMU and a downstream-ready
frontier-candidate flag.**

## 2. Buyer segments (proof-of-concept long list)

### A. Borneo carbon-project developers (the bullseye for Treefera)
These projects sell credits to Shell, Microsoft, etc. and live or die by
defensible MRV of intact peat-forest stock under cloud. The L-band layer is
literally what their auditors ask for.

- **Katingan Mentaya Project** — PT Rimba Makmur Utama × Permian Global.
  ~150,000 ha Central Kalimantan. Verra triple-gold. ~6 M VCUs/year. Sells to
  Shell among others.
- **Rimba Raya Biodiversity Reserve** — InfiniteEARTH / Carbon Streaming.
  ~64,500 ha Central Kalimantan. Just restarted after 2024 court win
  overturning the 2021 moratorium — *needs to rebuild trust with fresh
  independent MRV.*
- **Other VCS / ART-TREES Indonesia portfolio** — Sungai Putri (West
  Kalimantan), Sebangau buffer, and dozens of jurisdictional REDD pilots
  surfacing under Indonesia's new framework.

### B. Palm-oil producers with Kalimantan / Sarawak / Sabah concessions
EUDR (Dec 2026 for large operators), NDPE, RSPO and ISPO all require
plot-level deforestation evidence. Cloud-cover is their biggest excuse for
missed alerts.

- **Wilmar International** — ~234k ha planted, ~66 % Indonesia (West & Central
  Kalimantan) + ~25 % East Malaysia. Already in the WRI RADD pilot.
- **Kuala Lumpur Kepong (KLK)** — ~301k ha; ~160k ha across Sumatra +
  Kalimantan, ~120k ha Peninsular Malaysia + Sabah.
- **Sime Darby Plantation** — Heavy Sarawak / Sabah footprint. RADD pilot
  member. Exited HCSA in 2020 but still RSPO-bound.
- **Sarawak Oil Palms Berhad (SOPB)** — Pure Sarawak. Vertically integrated,
  Bursa-listed.
- **Bumitama Agri** — ~44 % of estates in Kalimantan. Runs the BBCP 8,300 ha
  conservation block in West Kalimantan. Listed Singapore.
- **Golden Agri-Resources (Sinar Mas Agribusiness)** — RADD pilot.
- **Musim Mas** — RADD pilot.
- **IOI Corporation** — Sabah-heavy.
- **TSH Resources** — ~39k ha (3k Sabah, 36k Indonesia).
- **PT PP London Sumatra (Indofood Agri), Astra Agro Lestari, Sampoerna Agro**
  — Multiple Kalimantan mills.

### C. Pulp & paper — Kalimantan acacia
Acute deforestation exposure right now. From 2001–2022, APP + APRIL and
direct suppliers cleared 805,000 ha of forest, ~80 % of all
pulp-driven Indonesian deforestation. 2022 alone, the pulp industry cleared
23,000 ha in Indonesian Borneo.

- **APP / Asia Pulp & Paper (Sinar Mas)** — 2.6 M ha across 5 provinces incl.
  West & East Kalimantan.
- **APRIL Group (RGE / Tanoto)** — 1 M ha, 480 k planted. Just added
  Kalimantan suppliers PT Industrial Forest Plantation and PT Mayawana
  Persada, which lost ~80 k ha of forest 2015–2024 (54 k after 2020).
  *Acute reputational exposure → prime PALSAR L-band buyer.*

### D. Coal in Kalimantan (lender-pressure-driven, not EUDR-driven)
- **Adaro Energy** — Largest South Kalimantan concession via PT Adaro
  Indonesia.
- **Bumi Resources / PT Arutmin Indonesia** — South Kalimantan.
- **Berau Coal (Sinar Mas)** — East Kalimantan; cleared ≥ 1,100 ha since 2016.
- **Indika Energy / PT Teladan Resources**.

### E. Downstream EUDR buyers sourcing palm/pulp from Borneo
All of these already publish grievance trackers naming Borneo suppliers.

- **Nestlé, Unilever, Mars, Mondelēz, Ferrero, Hershey, PepsiCo, Reckitt**
  (consumer goods).
- **Cargill, ADM, Bunge, Louis Dreyfus, COFCO International, ofi / Olam**
  (commodity traders — Cargill, GAR, Musim Mas, Bunge, Mondelez, Nestlé,
  PepsiCo, Sime Darby, Unilever, Wilmar are already in the WRI RADD pilot).
- **McDonald's, Burger King, KFC** — supplier audits.

### F. Watchdog NGOs (data licensing)
These already pay for satellite layers; PALSAR L-band makes their cases harder
for plantation companies to deny.

- **Earthqualizer** (West Kalimantan origins; spun out of Aidenvironment).
  Runs the Supplier Group Monitoring Program. Geospatial-AI-first.
- **Aidenvironment** (Amsterdam) — Korindo investigations were satellite-led.
- **Mighty Earth — Rapid Response palm-oil reports** (50+ issued).
- **Greenpeace International**, **Rainforest Action Network (RAN)**,
  **Tropical Forest Alliance**, **WRI / Global Forest Watch**,
  **Nusantara Atlas**.

### G. Certifiers / auditors (sub-license as audit data layer)
- **RSPO** — certification body itself.
- **PEFC, FSC** — forestry.
- **SGS, Bureau Veritas, Intertek, Control Union, Preferred by Nature**
  — third-party EUDR DDS verifiers. SGS and Intertek already sell EUDR
  compliance services.

### H. ESG data houses (data layer license)
- **S&P Global (Trucost)**, **MSCI ESG**, **Sustainalytics / Morningstar**,
  **Bloomberg (BNEF)**, **ISS ESG**, **Moody's ESG**, **ERM**.

### I. Banks / insurers financing Borneo plantation & coal
- Lenders flagged in Forests & Finance: **Rabobank, HSBC, Standard
  Chartered, DBS, OCBC, CIMB, Maybank, Mizuho, MUFG**.
- Insurers: **Marsh McLennan, Munich Re, Swiss Re**.

### J. Government / multilateral
- **Indonesia KLHK** (Ministry of Environment & Forestry) — runs SiPongi.
- **JJ-FAST** (JICA × JAXA).
- **Malaysia MPOB, MPOCC**, **Sarawak Forestry Corporation**,
  **Sabah Forestry Department**.
- **FAO, UN-REDD, World Bank FCPF**.

## 3. Borneo pilots we can launch this week

Named contacts who run actual operations on the island today. Mix of carbon,
plantation, and watchdog so we get a portfolio of testimonials.

| # | Target & role | Why they buy *instantly* | Contact path |
|---|---------------|--------------------------|--------------|
| 1 | **Dharsono Hartono** — Director / co-founder, PT Rimba Makmur Utama (Katingan Mentaya, ~150 k ha Central Kalimantan) | Sells to Shell; perma-scrutinised; cloud-penetrating MRV makes Verra/CCB audits defensible. | `katinganproject.com` · via Permian Global (London) |
| 2 | **Todd Lemons** — co-founder InfiniteEARTH / Rimba Raya (64,500 ha Central Kalimantan) | Just restarted post 2021 moratorium and 2024 court win — rebuilding integrity needs fresh independent MRV. | `infinite-earth.com` |
| 3 | **Lim Gunawan Hariyanto** — Executive Chair & CEO, Bumitama Agri (44 % of estates in Kalimantan; BBCP 8,300 ha) | Active sustainability comms; runs RSPO + ISPO; would license layer for own concession + 8.3 k ha conservation block. | `bumitama-agri.com` investor relations |
| 4 | **Sustainability lead, Sarawak Oil Palms (SOPB)** (Dr Sherlyn Lim Sheau Chin has spoken publicly on the cert journey — verify current title before outreach) | Pure Sarawak; one geography to defend; smaller listed co. with shorter procurement cycle than the supermajors. | `sop.com.my` |
| 5 | **APRIL Group sustainability office (RGE)** — *via* `aprilasia.com` | Just added Kalimantan suppliers IFP + Mayawana Persada with ~80 k ha forest loss; Environmental Paper Network campaigning. They need defensive evidence yesterday. | `rgei.com` · `aprilasia.com` |
| 6 | **Kuok Khoon Hong** — Chair / co-founder, Wilmar International | Largest Kalimantan footprint of any plantation player; already in RADD pilot → L-band is a natural complement, not a replacement. | `wilmar-international.com` |
| 7 | **Garibaldi Thohir** — Pres Dir, Adaro Energy | Largest South Kalimantan coal concession; NZBA-aligned lender pressure to disclose deforestation footprint. | `adaro.com` |
| 8 | **Earthqualizer team** (HQ Indonesia, West Kalimantan field origins) | NGO that already runs an SGMP satellite-monitoring product; would white-label our alerts to extend SGMP into cloudy peat zones. | `earthqualizer.org` |
| 9 | **Mighty Earth — Rapid Response palm oil unit** (US/UK) | Issues alerts that name Wilmar, GAR, Musim Mas, IOI, etc.; PALSAR L-band makes their cases harder to deny. | `mightyearth.org` |
| 10 | **Permian Global, London** (manages Katingan finance + scouting new Indonesia projects) | Direct buyer for MRV evidence behind every credit they sell. | `permianglobal.com` |

## 4. The pilot offer (one-pager)

> **Free 30-day pilot, one Borneo concession or carbon project, no obligation.**
>
> You give us: bounding box / concession polygon, the year window you care about.
>
> We deliver:
> - L-band PALSAR alert layer for 2017 → 2024 (annual)
> - Sentinel-1 cross-check where you want sub-annual signal
> - GeoJSON polygons with `area_ha`, `mean_delta_hv_db`, `baseline_hv_db`,
>   `candidate_plantation_frontier`
> - Web map with the cloud-peel demo (the hackathon UI)
> - Independent benchmark vs Hansen GFC, RADD, and SPOT-7 high-res where
>   available — producer's accuracy, user's accuracy, F1 reported
>
> You keep the data and the map. We get a logo, a quote, and a public case
> study. Convert to annual subscription at fair market rate at pilot end.

## 5. Why this rides Treefera's existing motion

Treefera's platform already serves carbon-project developers, registries,
biofuel/bioenergy producers, financial-services carbon-credit buyers, and
supply-chain businesses (per the 2024 $12M Series A and the Anew / ACCIONA /
Maple Credits partnerships). The L-band SAR layer slots into the first-mile
evidence stack and extends Treefera coverage into the persistent-cloud tropics
where every other layer in the stack fails. The same account managers who
already sell into Katingan-style projects sell this — no new GTM motion
required.

## 6. Next actions

1. **Score the top-10** against (a) revenue at risk from EUDR or
   reputational exposure, (b) whether they're already a Treefera customer
   (warm intro vs. cold), (c) procurement cycle length.
2. **Send the pilot offer first** to Katingan, Bumitama, and Earthqualizer
   (one carbon, one plantation, one NGO — three testimonial profiles for
   different buyer narratives).
3. **Build a named-account dossier for Wilmar** — biggest plantation prize
   and the natural anchor case study for an L-band layer in Borneo.
4. **Verify current title / direct-contact** of any leader above before
   cold outreach — leadership at the Sarawak / RGE / RSPO entities rotates
   regularly.

---

## Sources

- [Wilmar — Oil Palm Plantation & Milling](https://www.wilmar-international.com/our-businesses/plantation/oil-palm-plantation-milling)
- [Sarawak Oil Palms Berhad](https://sop.com.my/) · [SOP leadership](https://sop.com.my/our-leaders/)
- [Bumitama Agri — About / Lim Gunawan Hariyanto](https://bumitama-agri.com/about-us/lim-gunawan-hariyanto/)
- [Palm Oil Magazine — Bumitama Agri 2025 Fortune SEA 500](https://www.palmoilmagazine.com/palm-oil-company/2025/06/28/bumitama-agri-returns-to-fortune-southeast-asia-500-list-for-2025/)
- [Mongabay — Paper giant APRIL adds major deforesters as suppliers (June 2026)](https://news.mongabay.com/2026/06/pulp-and-paper-giant-april-adds-major-deforesters-as-suppliers-after-revising-sustainability-policy/)
- [Environmental Paper Network — Pulping Borneo (2023)](https://environmentalpaper.org/2023/05/pulping-borneo/)
- [Permian Global — Katingan Mentaya Project](https://permianglobal.com/projects/katingan-mentaya-project/)
- [Katingan Mentaya Project — Who we are](https://katinganproject.com/who-we-are)
- [Carbon Credits — Rimba Raya resumes operations](https://carboncredits.com/rimba-raya-resumes-operations-in-borneo-with-epic-legal-victory/)
- [Bloomberg — Borneo carbon offset market (2025)](https://www.bloomberg.com/features/2025-indonesia-jungle-carbon-offset-market/)
- [Mongabay — Indonesian police probe coal miners over deforestation-linked floods](https://news.mongabay.com/2021/02/indonesia-police-investigate-coal-mine-companies-south-kalimantan-flood/)
- [Mongabay — Links to coal mining add to Indonesian palm oil risk](https://news.mongabay.com/2021/09/links-to-coal-mining-add-to-indonesian-palm-oil-sectors-risk-for-buyers/)
- [WRI — Palm Oil Industry to Jointly Develop Radar Monitoring Technology](https://www.wri.org/news/release-palm-oil-industry-jointly-develop-radar-monitoring-technology-detect-deforestation)
- [Satelligence — RADD](https://satelligence.com/radd/)
- [Global Forest Watch — New Radar Alerts Monitor Forests Through the Clouds](https://www.globalforestwatch.org/blog/data-and-tools/radd-radar-alerts/)
- [Earthqualizer — About](https://earthqualizer.org/about-earthqualizer) · [Component Guide](https://earthqualizer.org/component-guide)
- [Mighty Earth — 50th Palm Oil Rapid Response Report](https://mightyearth.org/article/celebrating-our-50th-palm-oil-rapid-response-report/)
- [TracExtech — EUDR Compliance for Palm Oil Exporters in Indonesia](https://tracextech.com/eudr-dds/palm-oil-exporters-indonesia/)
- [Sustainalytics — Palm Oil in Focus: EUDR](https://www.sustainalytics.com/esg-research/resource/investors-esg-blog/palm-oil-in-focus--the-eudr-and-corporate-efforts-on-transparent-sourcing)
- [Treefera — Series A](https://www.treefera.com/blog/treefera-raises-usd12m-series-a-for-ai-platform-bringing-transparency-to-nature-data)
- [Supply Chain Digital — Treefera company report](https://supplychaindigital.com/company-reports/treefera-unlocking-the-supply-chains-first-mile)
=======
# Through the Clouds - USP and Borneo Pilot Targets

This file is the commercial orchestration layer for the Borneo SAR proof of concept. Use it to decide who to sell to first, why they should care now, and which verified public route to use for outreach.

## 1. Product wedge

Sell a cloud- and canopy-penetrating deforestation alert layer for Borneo, built from local L-band SAR mosaics and packaged as auditable evidence for EUDR, NDPE, carbon MRV, concession monitoring, and NGO grievance work.

The core claim is simple: optical monitoring misses events under persistent cloud, and C-band systems struggle more under closed humid-tropical canopy. L-band PALSAR gives a stronger structural signal for forest loss and plantation conversion. The demo proves this on a known Borneo frontier with before/after SAR layers, alert polygons, area totals, and a web map a non-technical buyer can inspect.

## 2. Buyer pain

### Palm oil producers and traders

They need defensible proof that plantations, mills, and supplier catchments are not expanding into forest. The 2026 EUDR deadline turns geolocation and deforestation-free proof into a board-level compliance issue for palm oil exporters and downstream buyers. Lead with risk reduction: fewer blind spots during cloudy months, fewer disputed grievance cases, and faster internal escalation.

### Carbon project developers and MRV teams

They need independent monitoring over peat swamp and tropical forest where cloud-free optical scenes are irregular. Lead with audit support: project boundary monitoring, leakage screening, and a repeatable evidence pack for verification.

### NGOs, certifiers, and data providers

They need faster, cheaper triage for suspicious clearings, especially in remote concessions. Lead with case-building: polygons, dates, area estimates, and source rasters that can be checked against SPOT, Planet, Sentinel-2, Hansen, RADD, and concession maps.

### Banks, insurers, and downstream commodity buyers

They need portfolio-level exposure screening before financing, procurement, or insurance renewal. Lead with supplier risk scoring: which mills, concessions, or sourcing areas have new forest loss signals.

## 3. Why now

The European Commission states that the EU Deforestation Regulation covers palm oil, rubber, wood, cattle, soy, coffee, cocoa, and derived products, and requires operators and traders to prove that goods are deforestation-free. The revised application dates are 30 December 2026 for large and medium operators and 30 June 2027 for micro and small operators. This creates an immediate 2026 sales window for palm, rubber, timber, and downstream procurement teams with Borneo exposure.

Use this deadline in every first email. Do not pitch "AI monitoring" first. Pitch "L-band SAR evidence for cloudy Borneo supply areas before the EUDR enforcement date."

## 4. What to sell first

Sell a 30-day paid pilot, not a platform license.

Pilot package:

- One Borneo AOI: 50 km by 50 km around a known active frontier or supplier catchment.
- One historic comparison: 2022 versus 2023 PALSAR HV loss polygons.
- One current-risk appendix: Hansen/RADD/JJ-FAST cross-check where available.
- One browser map: prior SAR, later SAR, alert polygons, area statistics.
- One executive memo: total alert area, top 10 polygons, nearest concessions or mills if buyer provides boundaries.

Price anchor: USD 15k for a single AOI pilot. Move to USD 50k-150k annual monitoring only after the pilot produces buyer-specific evidence.

## 5. Proof-of-concept positioning

Use these claims only:

- "Works through cloud because the critical signal is SAR, not optical."
- "Uses L-band structure-sensitive backscatter for tropical forest loss screening."
- "Designed for Borneo, where cloud, peat, fragmented concession boundaries, and oil-palm expansion make optical-only monitoring weak."
- "Outputs buyer-readable evidence: polygons, hectares, dates, map, and source raster references."

Do not claim legal compliance certification, near-real-time alerts from annual mosaics, or perfect oil-palm species classification. The demo detects forest loss and crop-change candidates; it does not certify final land use.

## 6. Immediate outreach list

Use verified public executive routes. Do not guess private CEO email addresses. Address the email to the named executive and route it through the listed public sustainability, investor relations, corporate secretary, or contact channel.

| Priority | Account | Why they are viable now | Executive target | Verified route | First pitch |
|---|---|---|---|---|---|
| 1 | Wilmar International | Major palm trader and plantation operator with Indonesia, Sabah, and Sarawak exposure. Public plantation page lists West Kalimantan, Central Kalimantan, Sabah, and Sarawak operations. | Kuok Khoon Hong, Chairman and CEO | `csr@wilmar.com.sg`, `ir@wilmar.com.sg`, `palmandlaurics@wilmar.com.sg` | "Run a 30-day L-band SAR pilot on one Kalimantan supplier catchment before EUDR enforcement." |
| 2 | Bumitama Agri | Pure Borneo palm exposure, strong fit for West/Central Kalimantan frontier monitoring. | Lim Gunawan Hariyanto, Executive Chairman and CEO | `sustainability@bumitama-agri.com`, `investor.relations@bumitama-agri.com` | "Prove forest-loss monitoring under cloud for Bumitama estates and adjacent risk zones." |
| 3 | First Resources | Operates over 200,000 ha across Riau, East Kalimantan, and West Kalimantan. | Ciliandra Fangiono, CEO | Contact form: `https://www.first-resources.com/contact-us/` using Sustainability or Investors | "Screen East and West Kalimantan estates for annual SAR loss polygons and unresolved supplier risk." |
| 4 | Kuala Lumpur Kepong | Plantation group with sustainability and investor routes; strong buyer for EUDR and NDPE evidence. | Tan Sri Dato' Seri Lee Oi Hian, Executive Chairman; Patrick Ng, Group Plantations Director | `contactus@klk.com.my`, `corp.comms@klk.com.my`, `mktg@klk.com.my` | "Pilot an auditable Borneo SAR layer for plantation compliance and supplier screening." |
| 5 | SD Guthrie | Large plantation company, formerly Sime Darby Plantation, with board-level sustainability exposure. | Mohd Haris Mohd Arshad, President and Group CEO | Contact form: `https://www.sdguthrie.com/contact-us/` using Investor Relations or sustainability route | "Add L-band SAR evidence to existing responsible sourcing and grievance workflows." |
| 6 | Golden Agri-Resources | Major palm group with public sustainability contact pathway and Borneo exposure through Indonesian operations. | GAR executive management; verify current named leader before send | Contact form: `https://www.goldenagri.com.sg/contact-us/`, topic Sustainability Matters or Investor Relations; phone `+65 6590 0800` | "Run a Borneo proof point on one supplier landscape and package it for EUDR/NDPE review." |
| 7 | Musim Mas | Integrated palm group with supplier and grievance exposure; good buyer for catchment monitoring. | Bachtiar Karim, executive leadership target; verify title before send | Contact form: `https://www.musimmas.com/contact-us/`; corporate phone `(65) 6576 6500` | "Use L-band SAR to reduce blind spots in supplier catchments during cloudy months." |
| 8 | Permian Global / Katingan Mentaya | Central Kalimantan peat forest carbon project with 157,875 ha project area and 149,800 ha carbon accounting area. | CEO / MRV lead / project director | `info@permianglobal.com` | "Provide independent SAR monitoring for leakage, encroachment, and verification evidence." |
| 9 | Earthqualizer | Indonesia-based supply-chain monitoring organization; likely fast evaluator and resale/validation partner. | Secretariat / monitoring lead | `secretariat@earthqualizer.org` | "Test Borneo SAR polygons against your grievance and supply-chain intelligence workflow." |
| 10 | AidEnvironment / Sangga Bumi Lestari | NGO and supply-chain accountability team with Indonesia office and commodity deforestation focus. | Indonesia deforestation-free supply chains lead | `info@sanggabumilestari.org`, `info@aidenvironment.org` | "Use the demo as an independent L-band evidence layer for Borneo cases." |
| 11 | Mighty Earth | Campaign organization that uses company-linked deforestation evidence. | Palm oil campaign / rapid response lead | `inquiry@mightyearth.org`, `communications@mightyearth.org` | "Offer Borneo SAR polygons as a case-triage layer for cloudy frontier alerts." |
| 12 | RSPO GeoRSPO / GIS Team | Certification body needs hotspot and concession intelligence; public contact page lists GIS Team for Hotspot Hub/GeoRSPO. | GIS Team / GeoRSPO lead; verify current executive signer before send | Contact page: `https://rspo.org/contact-us/`, route to GIS Team or Standards | "Offer L-band SAR polygons as a supplemental monitoring layer for GeoRSPO and complaints triage." |
| 13 | Astra Agro Lestari | Indonesian plantation group with Kalimantan exposure and formal corporate secretary route. | Djap Tet Fa, President Director; Tingning Sukowignjo, Corporate Secretary | Corporate secretary page and phone `(021) 4616555` | "Send a compliance pilot to Corporate Secretary and Sustainability for Kalimantan estate screening." |
| 14 | Dharma Satya Nusantara | Indonesian palm and wood-products group with ESG reporting and public contact email. | President Director / ESG lead; verify current name before send | `info@dsngroup.co.id` | "Screen East Kalimantan palm and wood-product landscapes for forest-loss exposure." |
| 15 | Sarawak Oil Palms | Sarawak-focused operator; tight geography makes it a good demo buyer if contact is verified. | Managing Director / sustainability lead; verify current name before send | Contact form: `https://sop.com.my/contact-us/` | "Offer a Sarawak-only SAR pilot with mill/estate-adjacent alert polygons." |
| 16 | APRIL / RGE | Pulp and paper buyer with public scrutiny over Kalimantan supplier deforestation. | APRIL/RGE sustainability leadership | APRIL/RGE sustainability contact form; verify current route before send | "Run an independent SAR evidence pilot for Kalimantan supplier risk after recent public scrutiny." |

## 7. Email copy

### Palm producer / trader

Subject: Borneo L-band SAR pilot for EUDR and NDPE evidence

Hi [Name],

We built a Borneo proof of concept that detects forest-loss and plantation-change candidates through persistent cloud using L-band SAR. The output is not another dashboard demo: it is an auditable evidence pack with before/after SAR layers, alert polygons, hectares, and source raster references.

I want to run one 30-day pilot on a Kalimantan supplier catchment before the 30 December 2026 EUDR application date for large and medium operators. The pilot deliverable is a browser map and executive memo showing the top forest-loss polygons and the evidence behind them.

Can I send a one-page sample from the current Borneo run?

### Carbon MRV / project developer

Subject: Independent SAR monitoring for Central Kalimantan peat forest

Hi [Name],

We built a L-band SAR monitoring proof of concept for Borneo forest loss under persistent cloud. It is designed for peat forest and plantation-frontier settings where optical monitoring is intermittent.

For a carbon project, the useful deliverable is a simple audit pack: project boundary overlay, annual SAR loss polygons, area totals, and visual evidence layers that can be checked against SPOT, Sentinel-2, Hansen, RADD, or field reports.

I want to run a 30-day pilot on one Central Kalimantan project boundary and deliver a verification-ready map plus memo.

### NGO / certifier / data partner

Subject: Borneo SAR alert layer for cloudy-frontier deforestation cases

Hi [Name],

We built a Borneo proof of concept that uses L-band SAR to flag forest-loss and crop-change candidates where optical imagery is unreliable. The output is a polygon evidence layer, not a black-box score.

I want to test it against your existing Borneo cases and compare which polygons are useful, missed, or false positive. If the layer works, it becomes a cheap triage feed for complaint screening, hotspot review, or company engagement.

Can I send the current sample map?

## 8. Sales qualification rules

- Prioritize Borneo-exposed palm producers, palm traders, carbon MRV teams, and monitoring NGOs first.
- Do not lead with downstream CPGs until one operator or NGO pilot exists; their procurement cycles are slower.
- Do not sell "oil palm classification" as the primary claim. Sell "forest loss and crop-change candidates under cloud."
- Do not promise near-real-time alerts from annual PALSAR mosaics. Promise annual evidence first; add Sentinel-1 monthly monitoring only as a stretch.
- Do not use unverified CEO emails. Route to official sustainability, investor relations, corporate secretary, GIS, or contact-form channels.

## 9. Dead accounts for now

- Sawit Sumbermas Sarana: the visible contact page contains placeholder-looking email text. Do not email until a human verifies a current corporate route.
- Sampoerna Agro / Prime Agri Resources: the public site is not enough for a clean first outreach route. Revisit after the first 10 accounts.
- Generic "ESG data platforms": keep them for channel partnerships after the Borneo demo proves buyer-specific value.

## 10. Source links

- European Commission EUDR: `https://environment.ec.europa.eu/topics/forests/deforestation/regulation-deforestation-free-products_en`
- European Commission EUDR implementation: `https://green-forum.ec.europa.eu/nature-and-biodiversity/deforestation-regulation-implementation_en`
- Wilmar leadership: `https://www.wilmar-international.com/about-us/leadership`
- Wilmar plantation operations: `https://www.wilmar-international.com/our-businesses/plantation/oil-palm-plantation-milling`
- Wilmar contact: `https://www.wilmar-international.com/contact-us`
- Bumitama contact: `https://bumitama-agri.com/contact-us/`
- Bumitama leadership: `https://bumitama-agri.com/about-us/lim-gunawan-hariyanto/`
- First Resources corporate profile: `https://www.first-resources.com/about-us/corporate-profile/`
- First Resources board: `https://www.first-resources.com/about-us/board-of-directors/`
- First Resources contact: `https://www.first-resources.com/contact-us/`
- KLK contact: `https://www.klk.com.my/contact-us/`
- KLK board: `https://www.klk.com.my/board-of-directors/`
- KLK senior management: `https://www.klk.com.my/senior-management/`
- SD Guthrie leaders: `https://www.sdguthrie.com/who-we-are/our-leaders`
- SD Guthrie contact: `https://www.sdguthrie.com/contact-us/`
- Golden Agri contact: `https://www.goldenagri.com.sg/contact-us/`
- Musim Mas contact: `https://www.musimmas.com/contact-us/`
- Permian Global contact: `https://permianglobal.com/contact/`
- Katingan Mentaya project: `https://permianglobal.com/projects/katingan-mentaya-project/`
- Earthqualizer contact: `https://earthqualizer.org/contact/`
- AidEnvironment contact: `https://www.aidenvironment.org/contact/`
- Mighty Earth contact: `https://mightyearth.org/about/contact/`
- RSPO contact: `https://rspo.org/contact-us/`
- Astra Agro corporate secretary: `https://www.astra-agro.co.id/corporate-secretary-2/`
- Astra Agro directors: `https://www.astra-agro.co.id/management-profile-2/management-profile/`
- Dharma Satya Nusantara contact: `https://dsn.co.id/contact-us/`
- APRIL supplier scrutiny reference: `https://news.mongabay.com/2026/06/pulp-and-paper-giant-april-adds-major-deforesters-as-suppliers-after-revising-sustainability-policy/`
>>>>>>> Stashed changes
