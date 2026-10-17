# KijaniKiosk Payments: CI Pipeline

A small Node.js payments module (`processPayment`) with a Jenkins pipeline that checks it, packages it, and publishes it to a private Nexus npm registry. Every package gets a unique version made from the Git commit.

## Project layout

| Path | Purpose |
|------|---------|
| `index.js` | The payments module, exports `processPayment(amount)` |
| `dist/` | Build output that is archived and published |
| `.eslintrc.json` | Lint rules (`eslint:recommended`) |
| `Jenkinsfile` | The declarative Jenkins pipeline |
| `week5/friday/` | Week 5 evidence and documentation |

## npm scripts

| Command | What it does |
|---------|--------------|
| `npm run lint` | Runs ESLint over the project |
| `npm run build` | Placeholder build step |
| `npm test` | Placeholder test step (always passes, real tests still to be written) |

## The pipeline

The Jenkinsfile runs inside a pinned `node:18` Docker container:

1. **Set Version**: builds the version `1.0.0-<short git SHA>` so every package is traceable and unique.
2. **Lint**: `npm install`, then `npm run lint`. Lint runs before Build so cheap problems fail fast.
3. **Build**: `npm run build`.
4. **Verify**: **Test** and **Security Audit** (`npm audit --audit-level=high`) run in parallel.
5. **Archive**: packs `dist/` and `package.json` into `kijaniokiosk-payments-<version>.tar.gz` and stores it in Jenkins.
6. **Publish**: publishes the package to Nexus.
7. **Post actions**: `always` wipes the workspace with `cleanWs()`, and `success`, `failure` and `changed` print the outcome.

### Security

- The Nexus login is stored in the Jenkins credential store under the ID `nexus-creds`. The Jenkinsfile only ever references that ID through `withCredentials`, so no secret is in the code or in Git.
- The temporary `.npmrc` file is created and deleted inside the same shell block, and a `trap` removes it even if publishing fails.
- Jenkins masks the credentials as `****` in every log.

## Setup

**Jenkins job**
- Definition: **Pipeline script from SCM**, SCM **Git**
- Repository URL: `https://github.com/ob002/kijaniokiosk-devops-foundation-ip5.git`
- Branch Specifier: `*/feature/week5-ci-pipeline`
- Script Path: `Jenkinsfile`

**Nexus**
- A hosted npm repository named `kijaniokiosk-npm`, reachable at `192.168.0.106:8081` (the VM IP, not localhost, so the Docker container can reach it).
- The `nexus-creds` credential in Jenkins must belong to a Nexus user that can publish to it.

**Faster builds (optional)**
The Jenkinsfile mounts an npm cache from the Jenkins machine. Create it once:

```bash
sudo mkdir -p /var/lib/jenkins/npm-cache
sudo chown 126:128 /var/lib/jenkins/npm-cache
```

## Fault injection

The pipeline has a `FAULT` parameter (**Build with Parameters**) that deliberately breaks one stage, so you can prove each stage fails safely.

| FAULT value | Breaks | Expected result |
|-------------|--------|-----------------|
| `none` | nothing | Green build, package published |
| `lint` | Lint | Lint fails, later stages skipped |
| `build` | Build | Build fails, later stages skipped |
| `test` | Test | Test fails, Archive and Publish skipped |
| `audit` | Security Audit | Audit fails on a critical vulnerability, Archive and Publish skipped |
| `archive` | Archive | Archive fails, Publish skipped |
| `publish` | Publish | Nexus returns 404, nothing stored |

Results from the real runs are in `week5/friday/fault-injection-log.md`.

## Installing a published package

```bash
npm install kijaniokiosk-payments@<version> --registry http://192.168.0.106:8081/repository/kijaniokiosk-npm/
```

## Week 5 evidence

All in `week5/friday/`:
- `green-pipeline-run.txt`: console log of the green build
- `fault-injection-log.md`: one deliberate failure per stage
- `credential-audit.txt`: proof that no credentials leak
- `ci-pipeline-board-document.md`: plain-English explanation for the board
- `evidence/`: screenshots

## Known limits

- The pipeline runs when someone presses Build in Jenkins, not automatically on every GitHub push.
- `npm test` and `npm run build` are placeholders, so a green result does not yet prove the payment logic is correct.
