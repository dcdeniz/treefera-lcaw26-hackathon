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
