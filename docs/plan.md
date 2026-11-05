# Review Room plan

This file is `docs/plan.md`. It is the public snapshot for Nov 5, 2026. It replaces the Nov 4 snapshot at this path, sha256 `40927b05b5c4949f48693b1a2976489abe712d9ef963ddcb89c2e10a897fcadf`. That snapshot ended on the Nov 4 replan and said the repo was private. The canonical plan stays private. This file has no emails, names, keys, tokens, or passwords.

## What it is

Bad Review Fixer. A 1-star review lands in a TEST Mattermost inbox. Three Switch agents (Watcher, Investigator, Drafter) open a room, ask the closing crew, and draft either a public apology (legit) or a report for Google to evaluate (not legit). A local fake Google service at `127.0.0.1:8787` stands in. It never calls Google. Google decides. Removal is not promised.

## Phase now

Nov 5 QA documentation follow-up for B9. Docs only. No rebuild. No app behavior change. Base is main `2d2c6bf`.

## Repo docs checked

Git markdown on Nov 5 is `README.md`, this file, and `docs/agents/` (`watcher-instructions.md`, `investigator-instructions.md`, `drafter-instructions.md`, `permissions.md`, `room-template.md`). No other plan, spec, or prompt file is in git.

## Status

| Step | Status | Evidence |
|---|---|---|
| B1-B6 setup, agents, mirror | Done Nov 4 | Recorded in the canonical plan. Not re-checked here. |
| Repo public | Done Nov 5 AM, owner approved | GitHub visibility |
| PR1 tooling and README draft | Merged Nov 5 | PR #1. The PR reported 19/19 tests. |
| B7 not-legit run | PASS Nov 5 09:11 America/Edmonton, one retry | Manager confirms had to come from the linked account. Scrubbed transcript `not-legit-0911`. |
| PR2 README team and linked-account rule | Merged Nov 5 | PR #2 |
| B8 legit and not-legit, three each | Historical dual-account check. 6/6 PASS | Manager actions were dual-posted. Transcripts `legit-09xx` and `not-legit-09xx`. This is not the current account rule. |
| PR3 agent instructions | Merged Nov 5 | Manager is the linked account. A legit reply promises nothing. PR #3. main `2d2c6bf`. |
| Single-account check | Later check. Linked account only. 2/2 PASS Nov 5 09:44 to 09:48 America/Edmonton | `legit-0946-single`, `not-legit-0948-single`. This is the account rule that followed B8. |
| Prior independent QA on `2d2c6bf` | Reported 19/19 tests, offline flow OK, and 4 doc findings | Recorded by that QA run. This snapshot does not repeat the run. |
| B9 fresh-clone check | Pending | A fresh clone runs one case from the README alone. |
| B10 demo | Fri Nov 6, 10:00 America/Edmonton. Preflight readiness 9:30 America/Edmonton. | Recording. |
| B11 submit | Fri Nov 6, by 18:00 America/Edmonton. Owner only. | Owner submits. |

The window still closes Sat Nov 7 at 12:29 America/Edmonton. That time is buffer only.

## Open doc findings

These four items are open in this commit. The README phase of this follow-up is the fix. Do not treat them as still open after that fix lands.

1. README uses team `review-room-test` for a new setup. The existing demo connects team `switch` (`MM_TEAM=switch`). Say both.
2. README says usernames are the `*-test` accounts. Manager actions must come from the Mattermost account linked to the Switch user. `manager-test` is a setup admin, not the demo manager. On this demo the linked account is `user`. A fresh install links its own account. Agents refuse unclaimed accounts.
3. The sample report curl lacks `Google decides. Removal is not promised.` inside `evidence_summary`.
4. `docs/plan.md` was the Nov 4 snapshot. This file replaces it.

## Setup and demo rules still in force

These points come from the Nov 4 plan and still match the repo. The private log, names, and Slack research are not copied.

- Mattermost is the repro path. Staff replies come from `bin/staff-sim`. Each message starts with `simulated staff reply (TEST):`.
- Staff accounts are `sally-test`, `david-test`, `cindi-test`, and `troy-test`. Mail is `@example.test`.
- Drafter model is grok-4.7. On a permission card, choose Allow once.
- A not-legit run saves a report and stops. Status is `Decision pending (simulated)`. Google decides. Removal is not promised.
- Case rooms are named `review-<id>`. The status line is `Step n of 5`.
- The feed posts as `Fake Google feed (TEST)`.
- TEST DATA only. `.env` is gitignored.

## Rules kept

TEST data only. No secrets in git. The manager approves every post to the fake service.
