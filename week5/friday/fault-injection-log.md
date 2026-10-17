# Fault Injection Log

**Pipeline:** kijaniokiosk-ci-pipeline (Jenkinsfile on branch feature/week5-ci-pipeline)
**Method:** The Jenkins parameter `FAULT` (Build with Parameters) deliberately breaks one stage per run. The fault is injected at the end of the target stage, so the stage's normal checks run first. Default value `none` changes nothing.
**Date:** 2026-10-17
**Baseline green build:** #23 (all stages passed, package 1.0.0-4751c68 published to Nexus)
**Fault builds:** #25 to #30, all on commit 246c5d4

| # | FAULT value | Fault injected | Build | Stage that went red | Evidence in the console log |
|---|-------------|----------------|-------|---------------------|-----------------------------|
| 1 | lint | A file containing `var x = ;` was linted | #25 | Lint | `Parsing error: Unexpected token ;`, exit code 1 |
| 2 | build | Build step forced to `exit 1` | #26 | Build | `+ exit 1`, exit code 1 |
| 3 | test | Test step forced to `exit 1` | #27 | Verify / Test | `+ exit 1`, exit code 1 |
| 4 | audit | Known vulnerable package `minimist@0.0.8` installed before the audit | #28 | Verify / Security Audit | `1 critical severity vulnerability`, exit code 1 |
| 5 | archive | `tar` pointed at a folder that does not exist | #29 | Archive | `tar: missing-folder: Cannot stat: No such file or directory`, exit code 2 |
| 6 | publish | Nexus repository name changed to `wrong-repo` | #30 | Publish | `npm error code E404 Repository not found` |

## What happened after each failure

| Build | Stages after the failure | Failure message printed | Workspace cleaned | Notes |
|-------|--------------------------|-------------------------|-------------------|-------|
| #25 | Build, Verify, Archive, Publish skipped | Yes | Yes (`[WS-CLEANUP] done`) | The `changed` post block also fired, because the previous build was green |
| #26 | Verify, Archive, Publish skipped | Yes | Yes | Lint passed first |
| #27 | Archive, Publish skipped | Yes | Yes | The parallel Security Audit branch still passed |
| #28 | Archive, Publish skipped | Yes | Yes | The parallel Test branch still passed |
| #29 | Publish skipped | Yes | Yes | Nothing was published |
| #30 | None (it was the last stage) | Yes | Yes | Credentials stayed masked as `****`, and `rm -f .npmrc` still ran after the failure |

## Observations

- Every failure stopped the pipeline at the stage where the fault was injected, and no later stage ran.
- In the two parallel Verify tests (#27 and #28), only the faulty branch failed; the other branch completed normally.
- The `FAILURE` message from the post block and the workspace cleanup ran in all six failed builds.
- In the failed publish (#30) the Nexus password was never visible, and the temporary `.npmrc` file was still removed.
- Nothing reached Nexus in any of the six failed runs.

## Conclusion

Each of the six stages fails safely: it stops the line, reports where it failed, cleans up after itself, and never publishes a package.
