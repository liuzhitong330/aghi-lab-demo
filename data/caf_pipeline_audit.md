# Culture-image workflow audit

Static source-code audit of the JCI 2023 CAF culture-image workflow; separate from the Nature Communications 2026 mouse survival/BLI analysis.

Source: [https://github.com/alexanderchang1/GBM_CAF_open](https://github.com/alexanderchang1/GBM_CAF_open) at `7f252ef0f73cff182aee6962fde4765769871f2f`. Upstream license: GPL-3.0.

This original audit parses source text and Python syntax without importing or executing the upstream scripts. It does not reproduce the classifier or analyze private images.

The pinned tree contains 9 files. Five source/license files were examined; no image, measurement table, or fitted model was present in the inspected data formats.

## 1. Record the biological split unit

The review script partitions pooled feature rows with a stratified 70/30 split. The call supplies no donor, culture, or image grouping key.

Next step: Retain biological_unit_id and image_pair_id, then assess held-out biological units where independent units are available.

Boundary: This is not proof that related images crossed the split. The missing source tables prevent checking row provenance or estimating held-out performance.

Evidence: [source 1](https://github.com/alexanderchang1/GBM_CAF_open/blob/7f252ef0f73cff182aee6962fde4765769871f2f/JCI_review_train_test.py#L97).

## 2. Retain exclusions before dropping incomplete rows

The review script contains 7 active dropna calls. It prints some post-filter counts but does not return a row-level exclusion ledger.

Next step: Keep qc_exclusion_reason for each original object and report retained/total counts by biological unit and condition.

Boundary: No claim is made about the number, balance, or consequences of exclusions in the original experiment.

Evidence: [source 1](https://github.com/alexanderchang1/GBM_CAF_open/blob/7f252ef0f73cff182aee6962fde4765769871f2f/JCI_review_train_test.py#L43), [source 2](https://github.com/alexanderchang1/GBM_CAF_open/blob/7f252ef0f73cff182aee6962fde4765769871f2f/JCI_review_train_test.py#L57), [source 3](https://github.com/alexanderchang1/GBM_CAF_open/blob/7f252ef0f73cff182aee6962fde4765769871f2f/JCI_review_train_test.py#L74), [source 4](https://github.com/alexanderchang1/GBM_CAF_open/blob/7f252ef0f73cff182aee6962fde4765769871f2f/JCI_review_train_test.py#L172), [source 5](https://github.com/alexanderchang1/GBM_CAF_open/blob/7f252ef0f73cff182aee6962fde4765769871f2f/JCI_review_train_test.py#L190), [source 6](https://github.com/alexanderchang1/GBM_CAF_open/blob/7f252ef0f73cff182aee6962fde4765769871f2f/JCI_review_train_test.py#L211), [source 7](https://github.com/alexanderchang1/GBM_CAF_open/blob/7f252ef0f73cff182aee6962fde4765769871f2f/JCI_review_train_test.py#L222).

## 3. Check nuclear and cytoplasmic object identity

The pairing function uses filename and rounded centroid matches, then Parent_Nuclei, to match nuclear and cytoplasmic features.

Next step: Require exactly one parent match for each object within its image pair and segmentation method; preserve unmatched or ambiguous objects in the QC ledger.

Boundary: The audit does not establish that any pair was misassigned. That requires the original CellProfiler and VAMPIRE tables.

Evidence: [source 1](https://github.com/alexanderchang1/GBM_CAF_open/blob/7f252ef0f73cff182aee6962fde4765769871f2f/train_test.py#L272-L318).

## 4. Verify channel-pair identity before segmentation

The supplied CellProfiler pipeline disables metadata extraction and matches image sets by order. It includes both propagation and watershed segmentation branches.

Next step: Store image_pair_id and segmentation method explicitly. Check DAPI/cytoplasm pairs rather than relying only on directory order.

Boundary: The original images are absent, so this is a preflight requirement for future use, not a measured pairing failure.

Evidence: [source 1](https://github.com/alexanderchang1/GBM_CAF_open/blob/7f252ef0f73cff182aee6962fde4765769871f2f/GroupedSegmentation.cppipe#L14), [source 2](https://github.com/alexanderchang1/GBM_CAF_open/blob/7f252ef0f73cff182aee6962fde4765769871f2f/GroupedSegmentation.cppipe#L35), [source 3](https://github.com/alexanderchang1/GBM_CAF_open/blob/7f252ef0f73cff182aee6962fde4765769871f2f/GroupedSegmentation.cppipe#L102), [source 4](https://github.com/alexanderchang1/GBM_CAF_open/blob/7f252ef0f73cff182aee6962fde4765769871f2f/GroupedSegmentation.cppipe#L131).

## 5. Separate held-out evaluation from descriptive projections

The script reports held-out X_test performance, separate projections to named cell lines and cultures, and an 'Internal Validation' section drawn from pooled sum_data.

Next step: Label test-set metrics, external-line projections, and pooled-data summaries separately in any future report.

Boundary: The pooled-data section includes training rows; it is not a second independent validation cohort. No original accuracy is reproduced here.

Evidence: [source 1](https://github.com/alexanderchang1/GBM_CAF_open/blob/7f252ef0f73cff182aee6962fde4765769871f2f/JCI_review_train_test.py#L126-L135), [source 2](https://github.com/alexanderchang1/GBM_CAF_open/blob/7f252ef0f73cff182aee6962fde4765769871f2f/JCI_review_train_test.py#L232-L241).

## 6. Request source measurements before reproducing prediction

The pinned tree has 9 tracked files and no tabular input, image, or fitted-model file with the inspected data extensions. The review script expects a local input directory.

Next step: Request de-identified image/object features, biological-unit annotations, and the exact analysis environment before claiming reproducibility.

Boundary: This statement concerns this pinned repository tree only, not all data the authors may hold or publish elsewhere.

Evidence: [source 1](https://github.com/alexanderchang1/GBM_CAF_open/tree/7f252ef0f73cff182aee6962fde4765769871f2f), [source 2](https://github.com/alexanderchang1/GBM_CAF_open/blob/7f252ef0f73cff182aee6962fde4765769871f2f/JCI_review_train_test.py#L36-L40).

## Three metadata fields to preserve

- `biological_unit_id`: Link donor/culture/batch provenance and define independent validation groups.
- `image_pair_id`: Join the matching nuclear/cytoplasm images and keep all objects from the same pair together.
- `qc_exclusion_reason`: Retain why an original object was excluded or not successfully paired; blank only for reviewed retained objects.

These three additions complement existing object IDs, filenames, and segmentation-method fields. They are not a replacement for a complete experimental metadata schema.

## Reproduce the static audit

Run from this demo repository with Python 3.9+ and Git. Use a separate, new source directory. These commands fetch public source code but do not run it.

```sh
git clone https://github.com/alexanderchang1/GBM_CAF_open.git /tmp/GBM_CAF_audit_source
git -C /tmp/GBM_CAF_audit_source checkout --detach 7f252ef0f73cff182aee6962fde4765769871f2f
python3 scripts/audit_caf_pipeline.py --repo /tmp/GBM_CAF_audit_source --output-dir data
```

The JSON includes SHA-256 hashes for the five inspected files and line-linked observations. Reusing an existing directory is not required; choose another new directory if the example path exists.
