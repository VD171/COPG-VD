#!/bin/sh
# SPDX-License-Identifier: Apache-2.0
# Copyright (C) 2026  VD171
# Release-workflow lint (preventive). Encodes the fleet release model as static checks so a
# workflow that breaks it fails CI before it ever publishes. The model (STANDARDS 7.1):
#   * main holds curated snapshots; releases are published by CI as github-actions[bot];
#   * the human's release decision is the workflow_dispatch (never an automatic trigger);
#   * the bump commit lands AFTER a successful publish (never before: a failed publish must not
#     leave the branch bumped with a dead zipUrl).
# Checks:
#   draft   -- a release workflow must NOT use draft (draft:true / --draft): a drafted release
#              published via the GitHub UI attributes the release to the human who clicks Publish.
#   token   -- warn if a non-GITHUB_TOKEN secret looks like the release token (author != bot).
#   A       -- no ungated auto-publish: a publish step on an automatic trigger (schedule/
#              branch-push/workflow_run/repository_dispatch) with no human gate. A human gate is
#              workflow_dispatch, a tag-push trigger (STANDARDS 7.1: a tag push IS the human
#              release decision), or an if: referencing inputs / a tag ref.
#   B       -- publish before bump-commit: a version-bump commit+push that precedes the publish
#              step in the same job (404-on-main risk).
#   seed    -- VDLU baseline seeding: a module that vendors the VDLU engine (has a module/vdlu/
#              dir) must SEED a content-addressed baseline (vdlu/baseline.json) so the first
#              on-device VDLU auto-update is INCREMENTAL instead of a full from:0 re-download.
#              There are TWO valid seeding paths, and EITHER one satisfies the check:
#                (a) CI keyless seed -- a seed_baseline() step in the publish workflow runs
#                    vdlu-pack (keyless) to write vdlu/baseline.json into the staged zip
#                    (VD-Installer / VD-Backup / dropbear). Detected: a publish workflow
#                    references baseline.json / seed_baseline.
#                (b) committed SIGNED baseline -- the module COMMITS module/vdlu/baseline.json
#                    to the repo, regenerated + SIGNED locally (signing key kept OUT of CI) via
#                    its release runbook (COPG-VD). This is the STRONGER, deliberate choice (a
#                    signed integrity-root baseline; the signing key never touches CI).
#              FLAG only when module/vdlu/ exists AND a release is published AND NEITHER (a) nor
#              (b) holds. App-only modules (no module/vdlu/) skip this check silently.
# Conservative by design (these run across the whole fleet): only the clear cases flag.
# Usage: release-workflow-lint.sh [repo_root]
set -eu
root="${1:-.}"
wfdir="$root/.github/workflows"
[ -d "$wfdir" ] || { echo "no .github/workflows in $root (nothing to lint)"; exit 0; }
rc=0

# VDLU baseline-seed tracking (aggregated across all publish workflows in the repo): does this repo
# publish at all, and does any publish workflow reference baseline seeding? Evaluated after the loop.
seen_publish=0
seen_baseline=0

# A publish step = gh release create|edit, softprops/action-gh-release, or ncipollo/release-action.
pub_re='gh release create|gh release edit|action-gh-release|ncipollo/release-action'

for wf in "$wfdir"/*.y*ml; do
  [ -f "$wf" ] || continue
  grep -qiE "$pub_re" "$wf" || continue
  base=$(basename "$wf")

  # This is a publish workflow: track it for the repo-level VDLU baseline-seed check. A publish
  # workflow that seeds the baseline references baseline.json or the seed_baseline() helper.
  seen_publish=1
  grep -qiE 'baseline\.json|seed_baseline' "$wf" && seen_baseline=1

  # -- draft anti-pattern (keep) --
  # Strip YAML comments first: a doc comment that merely MENTIONS "--draft" (e.g. this very
  # guard's own description, vendored into a module) must not trip the check.
  if sed 's/[[:space:]]#.*$//' "$wf" | grep -vE '^[[:space:]]*#' | grep -qiE '^[[:space:]]*draft:[[:space:]]*true|--draft'; then
    echo "FAIL $base: uses draft (draft:true / --draft) -- release must publish DIRECTLY from CI (github-actions[bot]); draft + manual UI publish attributes the release to a human"
    rc=1
  fi

  # -- non-GITHUB_TOKEN as a token (keep) --
  if grep -niE 'token:[[:space:]]*\$\{\{[[:space:]]*secrets\.(GH_|PAT|TOKEN_)' "$wf" >/dev/null 2>&1; then
    echo "WARN $base: a non-GITHUB_TOKEN secret appears as a token -- verify the release step uses \${{ secrets.GITHUB_TOKEN }} so author=github-actions[bot]"
  fi

  # -- does on: carry a human release gate? (workflow_dispatch OR a tag-push trigger) --
  # Scans only the top-level on: block (inline 'on: [..]' or a nested block), so a stray
  # reference elsewhere cannot mask an ungated auto-publish. A tag push counts as the human
  # decision (STANDARDS 7.1): dropbear/VDGoogle publish on a tag, by design (local signing).
  on_gate=$(awk '
    /^[Oo]n:/ { if ($0 ~ /workflow_dispatch|tags:/) { print "yes"; exit }; inon=1; next }
    inon==1 {
      if ($0 ~ /^[^[:space:]#]/) { exit }             # dedent to the next top-level key
      if ($0 ~ /workflow_dispatch|tags:/) { print "yes"; exit }
    }
  ' "$wf")

  # -- checks A and B: walk jobs/steps in order --
  findings=$(awk -v wf="$base" -v ongate="$on_gate" '
    function flush(   isPub, isCP, isBump, gated) {
      if (!have) return
      isPub = 0
      if (buf ~ /gh[ \t]+release[ \t]+(create|edit)/) isPub = 1
      if (buf ~ /action-gh-release/)                  isPub = 1
      if (buf ~ /ncipollo\/release-action/)           isPub = 1
      isCP = (buf ~ /git[ \t]+commit/) && (buf ~ /git[ \t]+push/)
      isBump = 0
      if (buf ~ /module\.prop/) isBump = 1            # version source / bump signals
      if (buf ~ /version\.sh/)  isBump = 1
      if (buf ~ /versionCode/)  isBump = 1
      # NOT the bare word "bump": it matches a comment or commit message that merely DESCRIBES the
      # bump process (e.g. a lock-seed step whose comment says "a change triggers a patch bump") with
      # no actual version write - a false positive. A real bump runs version.sh / writes module.prop
      # or versionCode, already caught above.
      if (isCP && isBump) bumpseen = 1                # a bump commit+push happened in this job
      if (isPub) {
        if (bumpseen && !bflag[job]) {
          printf "::error::%s: a version-bump commit is pushed BEFORE the release-publish step in job \047%s\047 -- a failed publish would leave the branch bumped with a dead zipUrl; publish first, then commit the bump\n", wf, job
          bflag[job] = 1
        }
        gated = (ongate == "yes")
        if (sif ~ /inputs\./ || jif ~ /inputs\./) gated = 1          # input-conditioned publish
        if (sif ~ /refs\/tags|ref_type|workflow_dispatch/) gated = 1 # tag/dispatch-conditioned step
        if (jif ~ /refs\/tags|ref_type|workflow_dispatch/) gated = 1 # or at the job level
        if (!gated) {
          printf "::error::%s: release-publish step in job \047%s\047 runs on an automatic trigger with no workflow_dispatch and no human/input gate -- a release must be gated by the human workflow_dispatch or an if: referencing inputs.\n", wf, job
        }
      }
      have = 0; buf = ""; sif = ""
    }
    BEGIN { jobsind = -1; have = 0; stepind = -1; instepctx = 0; job = ""; bumpseen = 0; jif = ""; sif = "" }
    {
      line = $0
      match(line, /^ */); ind = RLENGTH
      if (have == 1) {
        if (line ~ /^[ ]*-[ ]/ && ind == stepind) {
          flush()                                     # new sibling step: close the current one
        } else if (ind > stepind || line ~ /^[ ]*$/) {
          buf = buf "\n" line                         # continuation (deeper, or blank)
          if (ind == stepind + 2 && line ~ /^[ ]*if:/) sif = line
          next
        } else {
          flush()                                     # dedent out of the step; re-handle below
        }
      }
      if (jobsind < 0) {
        if (line ~ /^jobs:[ \t]*$/) jobsind = ind
        next
      }
      if (ind == jobsind + 2 && line ~ /^[ ]+[A-Za-z0-9_.-]+:[ \t]*$/ && line !~ /^[ ]*-/) {
        job = line; sub(/^[ ]+/, "", job); sub(/:.*$/, "", job)
        bumpseen = 0; jif = ""; instepctx = 0; stepind = -1
        next
      }
      if (instepctx == 0 && ind == jobsind + 4 && line ~ /^[ ]+if:/) { jif = line; next }
      if (ind == jobsind + 4 && line ~ /^[ ]+steps:[ \t]*/) { instepctx = 1; stepind = -1; next }
      if (instepctx == 1 && line ~ /^[ ]+-[ ]/ && (stepind < 0 || ind == stepind)) {
        if (stepind < 0) stepind = ind
        have = 1; buf = line; sif = ""
        if (line ~ /-[ ]+if:/) sif = line               # if: on the step-start line itself
        next
      }
    }
    END { flush() }
  ' "$wf")

  if [ -n "$findings" ]; then
    printf '%s\n' "$findings"
    rc=1
  fi
done

# -- VDLU baseline seeding (repo-level) --
# A module that vendors the VDLU engine (module/vdlu/) and publishes a release must SEED a
# content-addressed baseline (vdlu/baseline.json), else the first on-device auto-update does a full
# from:0 re-download instead of an incremental diff. The baseline is seeded by EITHER of two valid
# paths, and either one clears the check:
#   (a) CI keyless seed  -- a publish workflow references baseline.json / seed_baseline (seen_baseline).
#   (b) committed signed -- module/vdlu/baseline.json is COMMITTED to the repo (COPG-VD's deliberate,
#                           stronger choice: a signed integrity-root baseline, signing key kept out of CI).
# FLAG only when NEITHER path is taken. App-only modules (no module/vdlu/) are skipped.
seeded_committed=0
[ -f "$root/module/vdlu/baseline.json" ] && seeded_committed=1
if [ -d "$root/module/vdlu" ] && [ "$seen_publish" = 1 ] && [ "$seen_baseline" = 0 ] && [ "$seeded_committed" = 0 ]; then
  echo "::error::VDLU module ($root/module/vdlu present) publishes a release but seeds no baseline -- neither a CI seed step (grep baseline.json / seed_baseline) NOR a committed module/vdlu/baseline.json; the first on-device VDLU auto-update will do a full from:0 re-download instead of an incremental diff. Seed it one of two ways: a seed_baseline() step in the publish workflow (keyless, see VD-Backup.yml) OR commit a signed module/vdlu/baseline.json per release (see COPG-VD's runbook)"
  rc=1
fi

[ $rc -eq 0 ] && echo "OK: release workflows match the fleet release model (no draft-publish, no ungated auto-publish, publish before bump-commit, VDLU baseline seeded)" || echo "release-workflow-lint FAILED"
exit $rc
