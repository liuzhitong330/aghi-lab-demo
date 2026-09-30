# Aghi Lab — endpoint and measurement review

A Cathy Liu exploratory application demo, built with AI assistance. Not affiliated with UCSF or endorsed by the authors. The source experiments are the authors’ work, not Cathy's.

Live: https://liuzhitong330.github.io/aghi-lab-demo/

## Question

How do changing imaging denominators and the handling of non-tumor endpoints affect interpretation of a mouse tumor-treatment cohort?

The interface provides source-cell traceable BLI reviews, endpoint-definition sensitivity, and a minimal next-cohort recording schema. It does not identify optimal treatment, infer all-cause death, or match anonymous animals across worksheets.

## Reproduce

```sh
python -m pip install -r requirements.txt
python scripts/build_data.py
python scripts/verify_data.py
git clone https://github.com/alexanderchang1/GBM_CAF_open.git /tmp/aghi-caf-audit-source
git -C /tmp/aghi-caf-audit-source checkout --detach 7f252ef0f73cff182aee6962fde4765769871f2f
python scripts/audit_caf_pipeline.py --repo /tmp/aghi-caf-audit-source --output-dir data
python -m http.server 8038
```

Open http://localhost:8038/ . Choose a different new temporary clone directory if the example exists. No upstream code is executed. The static site needs no account, backend, API key or external plotting library. See [ANALYSIS_README.md](ANALYSIS_README.md) for source mappings, formulas and assumptions. All plotted values come from `data/data.json`, built from the pinned public source workbook; no simulated research values are used.

## Sources and licenses

- Haddad et al. (2026), *Non-lytic viral immunotherapy induces long-term glioblastoma survival and tumor-specific immunity without eliciting an antiviral response*, Nature Communications, [doi:10.1038/s41467-026-72746-5](https://www.nature.com/articles/s41467-026-72746-5). Source Data, Figure 6B and 6C–G, CC BY 4.0. Attribution and SHA-256 in `data/provenance.json`; original workbook retained under `research-inputs/`. JSON/CSV transformations and figures are this project's adaptations.
- Jain et al. (2023), [doi:10.1172/JCI147087](https://www.jci.org/articles/view/147087), links the CAF [GitHub repository](https://github.com/alexanderchang1/GBM_CAF_open). Pinned at `7f252ef0f73cff182aee6962fde4765769871f2f`. A separately labelled static audit derives image-record QA requirements; it is not the Nature paper's analysis code. The original repository is GPL-3.0. Upstream code is not redistributed here and is never executed by the audit.

## Interpretation boundaries

- There are 37 endpoint records and 37 within-sheet imaging series, not 74 independent animals. Cross-sheet identity is unavailable.
- 259 scheduled BLI cells include 238 numeric measurements, 15 `deceased` annotations, 2 `censor` annotations and 4 blanks after an earlier `deceased` annotation.
- Medians condition on currently observed, positive-baseline measurements. Missing values are never zero or carried forward.
- Non-tumor endpoints are censored in the paper-compatible analysis and events in the composite sensitivity. These are different estimands. Neither is automatically a clinical/all-cause survival estimate.
- The 60-day display horizon was chosen before calculating outcomes; other selectable horizons are exploratory. Leave-one-record-out ranges assess influence, not uncertainty intervals.
- All output is exploratory. Source data do not verify raw imaging acquisition, tumor volume, toxicity mechanisms or independent hands-on expertise.

## Reuse

`data/next-cohort-schema.csv` is an empty header-only planning artifact, not synthetic data. A new dataset would need stable animal IDs, documented units, acquisition metadata, endpoint adjudication and validation before this analysis could support a lab's decisions. The current extractor deliberately fails on a different source hash rather than silently accepting a new study.

Public contact: cathyliu014@gmail.com · 415-216-3799.
