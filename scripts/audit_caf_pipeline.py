#!/usr/bin/env python3
"""Read-only static audit of the publication-pinned GBM CAF image pipeline.

Uses only Python's standard library. It does not import or execute upstream code,
train a classifier, or inspect private image data. The outputs describe source-code
assumptions, not measured errors in the authors' experiments.
"""

import argparse
import ast
import hashlib
import json
from pathlib import Path
import subprocess


COMMIT = "7f252ef0f73cff182aee6962fde4765769871f2f"
REPO_URL = "https://github.com/alexanderchang1/GBM_CAF_open"
REVIEWED = [
    "README.md", "JCI_review_train_test.py", "train_test.py",
    "GroupedSegmentation.cppipe", "LICENSE",
]


def command(repo, *args):
    return subprocess.check_output(["git", "-C", str(repo), *args], text=True).strip()


def link(filename, start, end=None):
    suffix = f"#L{start}" + (f"-L{end}" if end and end != start else "")
    return f"{REPO_URL}/blob/{COMMIT}/{filename}{suffix}"


def find_line(text, needle):
    matches = [i for i, line in enumerate(text.splitlines(), 1) if needle in line]
    if not matches:
        raise ValueError(f"Expected source evidence was not found: {needle}")
    return matches[0]


def call_name(node):
    if isinstance(node.func, ast.Name):
        return node.func.id
    if isinstance(node.func, ast.Attribute):
        return node.func.attr
    return ""


def audit(repo):
    if command(repo, "rev-parse", "HEAD") != COMMIT:
        raise ValueError("Repository HEAD must match the publication-pinned commit.")
    tracked = command(repo, "ls-tree", "-r", "--name-only", COMMIT).splitlines()
    texts = {}
    files = []
    for filename in REVIEWED:
        raw = subprocess.check_output(["git", "-C", str(repo), "show", f"{COMMIT}:{filename}"])
        texts[filename] = raw.decode("utf-8")
        files.append({"file": filename, "bytes": len(raw),
                      "sha256": hashlib.sha256(raw).hexdigest(),
                      "url": f"{REPO_URL}/blob/{COMMIT}/{filename}"})
    review = texts["JCI_review_train_test.py"]
    training = texts["train_test.py"]
    pipeline = texts["GroupedSegmentation.cppipe"]
    tree = ast.parse(review)
    splits = [n for n in ast.walk(tree) if isinstance(n, ast.Call) and call_name(n) == "train_test_split"]
    drops = sorted(n.lineno for n in ast.walk(tree) if isinstance(n, ast.Call) and call_name(n) == "dropna")
    if len(splits) != 1:
        raise ValueError("Expected one active train_test_split call.")
    split = splits[0]
    kwargs = {k.arg: ast.unparse(k.value) for k in split.keywords}
    assert kwargs == {"random_state": "0", "train_size": "0.7", "stratify": "y"}, kwargs
    data_suffixes = {".csv", ".tsv", ".xlsx", ".tif", ".tiff", ".png", ".jpg", ".jpeg", ".pickle", ".pkl"}
    data_files = [name for name in tracked if Path(name).suffix.lower() in data_suffixes]
    assert not data_files, "New input data detected; update this audit rather than reuse the old conclusion."

    findings = [
        {
            "id": "split_unit", "title": "Record the biological split unit",
            "observation": "The review script partitions pooled feature rows with a stratified 70/30 split. The call supplies no donor, culture, or image grouping key.",
            "evidence": [link("JCI_review_train_test.py", split.lineno)],
            "next_action": "Retain biological_unit_id and image_pair_id, then assess held-out biological units where independent units are available.",
            "limit": "This is not proof that related images crossed the split. The missing source tables prevent checking row provenance or estimating held-out performance."
        },
        {
            "id": "complete_case", "title": "Retain exclusions before dropping incomplete rows",
            "observation": f"The review script contains {len(drops)} active dropna calls. It prints some post-filter counts but does not return a row-level exclusion ledger.",
            "evidence": [link("JCI_review_train_test.py", line) for line in drops],
            "next_action": "Keep qc_exclusion_reason for each original object and report retained/total counts by biological unit and condition.",
            "limit": "No claim is made about the number, balance, or consequences of exclusions in the original experiment."
        },
        {
            "id": "pairing", "title": "Check nuclear and cytoplasmic object identity",
            "observation": "The pairing function uses filename and rounded centroid matches, then Parent_Nuclei, to match nuclear and cytoplasmic features.",
            "evidence": [link("train_test.py", find_line(training, "def process_row"), find_line(training, "match_nuc = nuc_table.loc") + 1)],
            "next_action": "Require exactly one parent match for each object within its image pair and segmentation method; preserve unmatched or ambiguous objects in the QC ledger.",
            "limit": "The audit does not establish that any pair was misassigned. That requires the original CellProfiler and VAMPIRE tables."
        },
        {
            "id": "image_matching", "title": "Verify channel-pair identity before segmentation",
            "observation": "The supplied CellProfiler pipeline disables metadata extraction and matches image sets by order. It includes both propagation and watershed segmentation branches.",
            "evidence": [link("GroupedSegmentation.cppipe", find_line(pipeline, "Extract metadata?:No")),
                         link("GroupedSegmentation.cppipe", find_line(pipeline, "Image set matching method:Order")),
                         link("GroupedSegmentation.cppipe", find_line(pipeline, "Select the method to identify the secondary objects:Propagation")),
                         link("GroupedSegmentation.cppipe", find_line(pipeline, "Select the method to identify the secondary objects:Watershed - Gradient"))],
            "next_action": "Store image_pair_id and segmentation method explicitly. Check DAPI/cytoplasm pairs rather than relying only on directory order.",
            "limit": "The original images are absent, so this is a preflight requirement for future use, not a measured pairing failure."
        },
        {
            "id": "validation_labels", "title": "Separate held-out evaluation from descriptive projections",
            "observation": "The script reports held-out X_test performance, separate projections to named cell lines and cultures, and an 'Internal Validation' section drawn from pooled sum_data.",
            "evidence": [link("JCI_review_train_test.py", find_line(review, "y_true = Y_test"), find_line(review, "accuracy = accuracy_score")),
                         link("JCI_review_train_test.py", find_line(review, 'print("Internal Validation")'), find_line(review, 'print("Internal Validation")') + 9)],
            "next_action": "Label test-set metrics, external-line projections, and pooled-data summaries separately in any future report.",
            "limit": "The pooled-data section includes training rows; it is not a second independent validation cohort. No original accuracy is reproduced here."
        },
        {
            "id": "inputs", "title": "Request source measurements before reproducing prediction",
            "observation": f"The pinned tree has {len(tracked)} tracked files and no tabular input, image, or fitted-model file with the inspected data extensions. The review script expects a local input directory.",
            "evidence": [f"{REPO_URL}/tree/{COMMIT}", link("JCI_review_train_test.py", find_line(review, "data_folder ="), find_line(review, "df = pd.read_csv"))],
            "next_action": "Request de-identified image/object features, biological-unit annotations, and the exact analysis environment before claiming reproducibility.",
            "limit": "This statement concerns this pinned repository tree only, not all data the authors may hold or publish elsewhere."
        },
    ]
    return {
        "schema_version": 1,
        "scope": "Static source-code audit of the JCI 2023 CAF culture-image workflow; separate from the Nature Communications 2026 mouse survival/BLI analysis.",
        "repository": REPO_URL, "commit": COMMIT,
        "upstream_license": "GNU General Public License v3.0",
        "upstream_code_executed": False,
        "classifier_reproduced": False,
        "tracked_file_count": len(tracked),
        "tracked_files": tracked,
        "reviewed_files": files,
        "available_input_data_files": data_files,
        "split": {"unit_supplied_to_function": "feature row", "train_fraction": 0.7, "stratification": "class label y", "random_state": 0, "explicit_group_argument": False, "source_line": split.lineno},
        "dropna_call_lines": drops,
        "findings": findings,
        "minimum_future_metadata": [
            {"field": "biological_unit_id", "purpose": "Link donor/culture/batch provenance and define independent validation groups."},
            {"field": "image_pair_id", "purpose": "Join the matching nuclear/cytoplasm images and keep all objects from the same pair together."},
            {"field": "qc_exclusion_reason", "purpose": "Retain why an original object was excluded or not successfully paired; blank only for reviewed retained objects."},
        ],
        "claims_not_supported": ["CAF identity or purity", "new classifier accuracy", "independent donor-level generalization", "any measured mispairing or data leakage", "a relationship between these culture images and the Nature 2026 BLI cohort"],
    }


def report(data):
    lines = ["# Culture-image workflow audit", "", data["scope"], "",
             f"Source: [{data['repository']}]({data['repository']}) at `{COMMIT}`. Upstream license: GPL-3.0.", "",
             "This original audit parses source text and Python syntax without importing or executing the upstream scripts. It does not reproduce the classifier or analyze private images.", "",
             f"The pinned tree contains {data['tracked_file_count']} files. Five source/license files were examined; no image, measurement table, or fitted model was present in the inspected data formats.", ""]
    for i, f in enumerate(data["findings"], 1):
        lines += [f"## {i}. {f['title']}", "", f["observation"], "",
                  "Next step: " + f["next_action"], "", "Boundary: " + f["limit"], "",
                  "Evidence: " + ", ".join(f"[source {j}]({url})" for j, url in enumerate(f["evidence"], 1)) + ".", ""]
    lines += ["## Three metadata fields to preserve", ""]
    lines += [f"- `{item['field']}`: {item['purpose']}" for item in data["minimum_future_metadata"]]
    lines += ["", "These three additions complement existing object IDs, filenames, and segmentation-method fields. They are not a replacement for a complete experimental metadata schema.", "", "## Reproduce the static audit", "",
              "Run from this demo repository with Python 3.9+ and Git. Use a separate, new source directory. These commands fetch public source code but do not run it.", "", "```sh",
              "git clone https://github.com/alexanderchang1/GBM_CAF_open.git /tmp/GBM_CAF_audit_source",
              f"git -C /tmp/GBM_CAF_audit_source checkout --detach {COMMIT}",
              "python3 scripts/audit_caf_pipeline.py --repo /tmp/GBM_CAF_audit_source --output-dir data",
              "```", "", "The JSON includes SHA-256 hashes for the five inspected files and line-linked observations. Reusing an existing directory is not required; choose another new directory if the example path exists.", ""]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    data = audit(args.repo)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "caf_pipeline_audit.json").write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    (args.output_dir / "caf_pipeline_audit.md").write_text(report(data), encoding="utf-8")
    print(json.dumps({"tracked_files": data["tracked_file_count"], "reviewed_files": len(data["reviewed_files"]), "findings": len(data["findings"]), "dropna_calls": len(data["dropna_call_lines"]), "upstream_code_executed": False}))


if __name__ == "__main__":
    main()
