# KijaniKiosk Payments: How Our Automated Build Pipeline Works

**Prepared for:** Nia
**Project:** KijaniKiosk Payments Module
**Status:** Pipeline live and passing

## The short version

Every time a developer saves a change to the payments code, a robot checks it, packages it and files it in our company storage shelf, with no one doing the checking by hand. If anything is wrong, the robot stops the moment it finds the problem and tells us which step failed. This is called a *CI pipeline*, short for continuous integration. Its purpose is simple: bad code should never quietly reach the people who use it.

## What happens, step by step

Think of a factory line with six stations. A product only moves to the next station if it passed the one before.

1. **Set Version.** The robot gives this build a unique label made from our version number and a short code identifying the exact change, for example `1.0.0-4751c68`. Every package can be traced back to the precise code that created it, and no package ever overwrites another.
2. **Lint.** A style and mistake checker reads the code, like a proofreader reading a contract before it is signed. Typos, undefined names and risky patterns are caught here, which is the cheapest place to catch them.
3. **Build.** The code is assembled into the form that will actually be delivered.
4. **Verify.** Two checks run at the same time to save time. The *tests* confirm the payments logic still behaves correctly. The *security audit* checks every outside ingredient we use against a public list of known vulnerabilities. If anything rated "high" risk turns up, the line stops.
5. **Archive.** A sealed copy of the finished package is saved on the Jenkins server, so we can always retrieve exactly what was built.
6. **Publish.** The package is placed in Nexus, our private storage shelf for software. Nothing here leaves our own network.

## Why you can trust it

**It stops early and clearly.** The order is deliberate: the cheap, fast checks run first and the delivery step runs last. A failure at station two means stations three to six never run, so a broken package cannot reach the shelf.

**Passwords are never exposed.** The Nexus login is stored in Jenkins' locked vault and handed to the robot only for the few seconds it is needed. Jenkins hides it in all logs and displays it as asterisks. The temporary file holding it is deleted in the same command that uses it, so it is never left on disk. Nothing secret is written into the code that lives on GitHub.

**It cleans up after itself.** At the end of every run, pass or fail, the working area is wiped, so one build can never be contaminated by leftovers from the last.

**It tells us what happened.** Success, failure and status-change messages are produced automatically, so a result is never left to guesswork.

**Same result every time.** The robot works inside a sealed, version-pinned container. It does not depend on what happens to be installed on one person's laptop, which removes the classic excuse "it worked on my machine."

## How we know the safety nets work

A safety net you have never tested is only an assumption. We deliberately broke each of the six stations, one at a time, to confirm that the line stopped at the right place and reported the right reason. The results are recorded in the fault-injection log. We also reviewed the build output for leaked credentials and found none; that is recorded in the credential audit.

## What this means for the business

- **Fewer payment bugs reach customers**, because every change passes the same checks.
- **Faster delivery**, because the checking is automatic and takes only a few minutes.
- **Traceability**: any package on the shelf can be linked to the exact change that produced it, which matters for audits and for investigating incidents.
- **Lower security risk**, because known-vulnerable components are blocked automatically.

## Honest limits

The pipeline currently runs when someone presses Build in Jenkins, not automatically on every GitHub save. The tests are placeholders that always pass, so the "tests passed" signal will only carry real weight once genuine payment tests are written. Both are sensible next steps.

## What we need from you

Nothing now. If the board wants automatic runs on every change, or real payment tests added to the checks, we can schedule that as the next piece of work.
