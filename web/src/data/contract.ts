// Frontend-only mirror of BUILD_CONTRACT.md sections 2, 3, 4, 5, 8.
// Hand-typed from the contract so the UI surfaces the same agent / step /
// gate / decision structure that the multi-agent reviewer is being asked to
// approve. Nothing here touches the backend pipeline.

export type AgentId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export type Agent = {
  id: AgentId
  name: string
  ownsLabel: string         // e.g. "§3.1–§3.3"
  ownsRange: [number, number] | null
  judgement: 'low' | 'medium' | 'high'
  parallelisable: string
  walltime_min: number | null
}

export const agents: Agent[] = [
  { id: 'A', name: 'Data Prep',          ownsLabel: '§3.1–§3.3',  ownsRange: [3.1, 3.3], judgement: 'low',    parallelisable: 'upstream of all',           walltime_min: 15 },
  { id: 'B', name: 'Calibrate & Filter', ownsLabel: '§3.4–§3.6',  ownsRange: [3.4, 3.6], judgement: 'low',    parallelisable: 'strict B → C',              walltime_min: 30 },
  { id: 'C', name: 'Change Detection',   ownsLabel: '§3.7–§3.10', ownsRange: [3.7, 3.10], judgement: 'medium', parallelisable: 'E may stub in parallel',    walltime_min: 60 },
  { id: 'D', name: 'Validation',         ownsLabel: '§5',         ownsRange: null,         judgement: 'high',   parallelisable: 'overlaps E once C emits',   walltime_min: 60 },
  { id: 'E', name: 'Demo / Map',         ownsLabel: '§6',         ownsRange: null,         judgement: 'low',    parallelisable: 'after C first-pass',         walltime_min: 45 },
  { id: 'F', name: 'Orchestrator',       ownsLabel: 'crosscut',   ownsRange: null,         judgement: 'high',   parallelisable: 'n/a',                        walltime_min: null },
]

export type PipelineStep = {
  num: string
  title: string
  owner: AgentId
  inOut: string
  thresholdOrParam: string | null
  gate: string
  cite?: string
}

export const pipelineSteps: PipelineStep[] = [
  {
    num: '3.1', title: 'Folder scaffold', owner: 'A',
    inOut: 'repo root → data/, outputs/, src/, notebooks/',
    thresholdOrParam: null,
    gate: 'outputs/intermediate exists',
  },
  {
    num: '3.2', title: 'Register AOI', owner: 'A',
    inOut: 'G_sar_borneo_aoi.geojson → hotspot + bbox',
    thresholdOrParam: 'EPSG:4326',
    gate: 'both files open · CRS == 4326',
  },
  {
    num: '3.3', title: 'Crop SAR mosaics', owner: 'A',
    inOut: 'palsar_G_sar_borneo_{2022,2023}.tif → cropped DN',
    thresholdOrParam: 'bbox [113.25,-1.25,113.75,-0.75]',
    gate: 'identical W/H/transform',
  },
  {
    num: '3.4', title: 'Calibrate DN → γ⁰ dB', owner: 'B',
    inOut: 'DN → gamma0 dB',
    thresholdOrParam: 'γ⁰ = 10·log₁₀(DN²) − 83.0',
    gate: 'histogram ∈ [−35, 5] dB',
    cite: 'Shimada 2014 · Motohka 2014',
  },
  {
    num: '3.5', title: 'Co-registration check', owner: 'B',
    inOut: 'hv_{2022,2023}_db → coreg_report.json',
    thresholdOrParam: 'bilinear resample on mismatch',
    gate: 'aligned == true',
  },
  {
    num: '3.6', title: 'Speckle filter', owner: 'B',
    inOut: 'dB → filtered dB',
    thresholdOrParam: 'Quegan–Yu 5×5 + Lee 7×7',
    gate: 'σ drop ≥ 30 %',
    cite: 'Quegan & Yu 2001 · Lee 1981 · Doblas 2022',
  },
  {
    num: '3.7', title: 'Build masks', owner: 'C',
    inOut: 'filtered HV → water · non-forest · slope',
    thresholdOrParam: 'water ≤ −24 dB · non-forest < −14 dB',
    gate: 'water < 15 % of AOI',
    cite: 'Shimada / JAXA FNF',
  },
  {
    num: '3.8', title: 'Detect HV loss', owner: 'C',
    inOut: 'Δ HV → raw loss mask',
    thresholdOrParam: 'Δ HV ≤ −2.0 dB',
    gate: 'alert area ∈ [0.1 %, 15 %] of AOI',
    cite: 'Doblas 2022 CFAR',
  },
  {
    num: '3.9', title: 'Clean alerts', owner: 'C',
    inOut: 'raw mask → cleaned mask',
    thresholdOrParam: 'open 3×3 · close 3×3 · MMU ≥ 0.2 ha',
    gate: '≥ 50 connected components',
    cite: 'Reiche 2021',
  },
  {
    num: '3.10', title: 'Polygonize', owner: 'C',
    inOut: 'mask → alerts_2023.geojson',
    thresholdOrParam: 'frontier = area ≥ 1 ha ∧ Δ ≤ −3 dB',
    gate: 'every feature has 5 props',
  },
  {
    num: '3.11', title: 'Drive AEF manifest', owner: 'F',
    inOut: 'gdown enum → drive_assets_used.json',
    thresholdOrParam: 'manifest-only · loaded: false',
    gate: 'two IDs recorded',
  },
]

// §4.4 demo gate
export const gateThresholds = {
  users_accuracy_min: 0.75,
  producers_accuracy_min: 0.65,
  f1_min: 0.70,
  alert_area_pct_min: 0.2,
  alert_area_pct_max: 8.0,
} as const

export type GateResult = {
  pass: boolean
  checks: { label: string; value: number; rule: string; pass: boolean }[]
}

export function evaluateGate(input: {
  users_accuracy: number
  producers_accuracy: number
  f1: number
  alert_area_pct: number
}): GateResult {
  const checks = [
    {
      label: 'User\'s accuracy',
      value: input.users_accuracy,
      rule: `≥ ${gateThresholds.users_accuracy_min}`,
      pass: input.users_accuracy >= gateThresholds.users_accuracy_min,
    },
    {
      label: 'Producer\'s accuracy',
      value: input.producers_accuracy,
      rule: `≥ ${gateThresholds.producers_accuracy_min}`,
      pass: input.producers_accuracy >= gateThresholds.producers_accuracy_min,
    },
    {
      label: 'F1',
      value: input.f1,
      rule: `≥ ${gateThresholds.f1_min}`,
      pass: input.f1 >= gateThresholds.f1_min,
    },
    {
      label: 'Alert area % of AOI',
      value: input.alert_area_pct,
      rule: `∈ [${gateThresholds.alert_area_pct_min}, ${gateThresholds.alert_area_pct_max}]`,
      pass:
        input.alert_area_pct >= gateThresholds.alert_area_pct_min &&
        input.alert_area_pct <= gateThresholds.alert_area_pct_max,
    },
  ]
  return { pass: checks.every((c) => c.pass), checks }
}

// §8 decisions
export const decisions: { n: number; title: string; body: string }[] = [
  { n: 1, title: 'Agent count', body: 'Six-agent split or single linear agent? 5-h budget may not amortise inter-agent overhead.' },
  { n: 2, title: 'Threshold ownership', body: 'Automate F\'s tuning loop (up to N retries) or always escalate to human on first miss?' },
  { n: 3, title: 'Validation labelling', body: 'May D auto-label `uncertain` samples from SPOT, or must a human eyeball all 100?' },
  { n: 4, title: 'Idempotency policy', body: 'Allow agents to overwrite outputs, or require timestamped subfolders per run?' },
  { n: 5, title: 'Drive auxiliaries', body: 'Confirm §3.11 stays manifest-only. Loading AEF adds ≥ 60 min to budget.' },
  { n: 6, title: 'Single-shot vs. tunable', body: 'On gate fail: ship the failing map with caveats, or block on §10 fallbacks?' },
  { n: 7, title: 'Run memory', body: 'Persist a structured run_log.jsonl for downstream review, or rely on outputs/README.md?' },
]

// §10 failure modes
export const failureModes: {
  failure: string
  detector: string
  fallback: string
  owner: string
}[] = [
  { failure: 'Calibration looks wrong (most pixels outside −35..5 dB)', detector: 'B at §3.4 gate', fallback: 'Print DN min/max; verify input is raw DN not dB; stop.', owner: 'B → human' },
  { failure: 'Mosaics not co-registered',                                detector: 'B at §3.5',     fallback: 'Warp 2023 to 2022 grid (bilinear); continue.',          owner: 'B' },
  { failure: 'Too many alerts (> 15 % AOI raw)',                         detector: 'C at §3.8 gate', fallback: 'Set Δ HV threshold = −3.0 dB; rerun once; log tuned.',  owner: 'F' },
  { failure: 'Too few alerts (< 0.1 % AOI raw)',                         detector: 'C at §3.8 gate', fallback: 'Set Δ HV threshold = −1.5 dB; rerun once; log tuned.',  owner: 'F' },
  { failure: 'Water false positives dominate',                           detector: 'D at §5',        fallback: 'Tighten water mask to ≤ −22 dB in both 2022 and 2023.', owner: 'F' },
  { failure: 'Oil palm indistinguishable from regrowth',                 detector: 'D',              fallback: 'Keep candidate_plantation_frontier as proxy; no claim.',owner: 'D' },
]
