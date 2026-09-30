# Endpoint and measurement-denominator audit

This independent, descriptive reanalysis uses Figure 6 of [Haddad et al., Nature Communications (2026)](https://www.nature.com/articles/s41467-026-72746-5), DOI `10.1038/s41467-026-72746-5`. It concerns recorded mouse endpoints and bioluminescent monitoring, not viral engineering, dosing optimization, or clinical treatment recommendations.

## Reproduce

Python 3.10+ and `openpyxl` are sufficient:

```sh
python -m pip install openpyxl
python scripts/build_data.py
python scripts/test_analysis.py
```

The script downloads the public Source Data workbook if absent, verifies the pinned SHA-256 before parsing, and writes `data/data.json`, `data/provenance.json`, and four checkable CSVs. It accepts `--source /path/to/workbook.xlsx` for an already downloaded, checksum-identical copy. The data source is CC BY 4.0, credited to the original authors; the source workbook is not Cathy's experimental data.

Source: `41467_2026_72746_MOESM4_ESM.xlsx`, 268,813 bytes, SHA-256 `3e302d90157981d46c04b72bc94633ad2fdf55381f016a33455d3986f35589e6`.

## Exact mappings

`Figure 6B`: time in column A; outcome code in C (PBS + Vehicle), D (PBS + TMZ), E (RRV-RLI + Vehicle), F (RRV-RLI + TMZ). Codes are `1` (endpoint), `0` (end of study), `0*` (non-tumor endpoint). The paper describes non-tumor endpoints as censored. Each nonempty row is an anonymous mouse record, not an identifier shared with the imaging sheet.

`Figure 6C-G`: dates in A2:A8 (3, 6, 10, 13, 17, 21, 26 days post-implantation); B:K (PBS + Vehicle), L:T (PBS + TMZ), U:AC (RRV-RLI + Vehicle), AD:AL (RRV-RLI + TMZ). Numeric columns are serial within-sheet trajectories. A stable synthetic series label such as `fig6CG-B` identifies that column only. The figure legend explicitly describes individual mouse trajectories. The raw imaging files and shared mouse IDs are unavailable here.

All source cell addresses are retained in the per-record CSVs. The BLI unit is copied as supplied (`ph/sec/ROI`); radiance is not converted into tumor volume. Every trajectory has a positive day-3 baseline. Numeric values are divided by that same column's baseline. Medians use only currently observed numeric measurements. `deceased`, `censor`, and blanks remain nonnumeric; blanks following an explicit terminal label retain that history, without inventing an exact event date.

## Two endpoint definitions

1. **Paper-compatible** Kaplan-Meier: code `1` is an event; `0` and `0*` are censored.
2. **All-recorded-endpoints composite**: `1` and `0*` are events; `0` remains censored. This intentionally changes the estimand. It is not all-cause mortality and does not disprove the paper's tumor-directed results.

At tied times, the risk set includes both events and censors, then events and censors leave it. Restricted mean event-free time is the integral of the KM step function to the stated horizon. The prespecified display default is 60 days; 20, 40, 120, and 399 days are exploratory sensitivity horizons. A positive survival tail is never extrapolated past the last observation. A tail already reaching zero contributes zero thereafter. Leave-one-record-out ranges are influence diagnostics, **not confidence intervals**; unsupported deletion estimates are omitted and counted explicitly.

The Figure 6 legend identifies seven RRV-RLI + TMZ non-tumor endpoints as TMZ toxicity. There is one additional non-tumor endpoint in RRV-RLI + Vehicle; its cause is not inferred. The source does not justify labelling every non-tumor endpoint a treatment toxicity or death.

## Research value and limits

The analysis makes the endpoint assumption, the current imaging denominator, and influential individual observations inspectable. It can inform how a future tumor-monitoring data table should retain stable animal IDs, imaging dates, missing-reason codes, endpoint type and time, and separate sample/assay identifiers. Those records would permit a genuinely matched early-readout validation later, without pretending that linkage already exists in this public workbook.

This is a small-cohort sensitivity and record-QC workflow. It does not independently replicate the experiments; determine a causal treatment-policy effect; provide raw flow-cytometry re-gating; or produce a treatment recommendation. No BLI column is joined to a survival row. No clinical claim, p-value-based ranking, imputed zero tumor burden, or subject-level outcome predictor is produced. Tail estimates with one mouse at risk are explicitly exposed as fragile.

The Nature paper's code availability statement says no custom code was developed or used. This script is new analysis code, not a reproduction of unavailable original software. Any separately audited Aghi GitHub repository must retain its own provenance and scientifically relevant contribution; unrelated code is not relabelled as the source of this experiment.

## Output schema

`data/data.json` contains `provenance`, `study`, `groups`, `survival`, `bli`, and `limitations`. `survival.modes` holds `paper_compatible` and `composite_endpoint`; each has group-keyed `curves` and long-form `rmst`. `bli.summaries` is long-form group × day; `bli.series` and `bli.records` retain the actual trajectories and source-cell traceability. Machine checks in the builder pin group sizes, source codes, measurement count, date grid, and last completely observed common date.
