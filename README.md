# Bad Review Fixer

This repo is a local stand-in for a bad-review workflow at a made-up restaurant. A 1-star review comes in. Three agents open one room for that review, ask the closing crew what happened, and either draft a public reply or a report for Google to evaluate.

All names, reviews, and businesses here are made up. The label on every screen and payload is TEST DATA.

The Google stand-in listens on `127.0.0.1` port `8787` only. It never calls Google. A report saved here gets the status `Decision pending (simulated)`.

## Google policy limits

Google removes a review only when the review breaks a listed policy. A review that is unfair, or that you disagree with, is not enough. Do not promise removal, and do not promise a timeline.

Say "report for Google to evaluate". Do not say "removal". Google decides, and the real filing step is manual.

Do not offer a discount, a comp, or anything else in exchange for changing or removing a review. Do not name staff in a public reply. Do not draft a report after the manager marks the review legit. The manager approves every post to the fake service. The run sheet answer on a permission card is Allow once.

Policy text used by the drafter is Google's "Content that is not based on a real experience" (https://support.google.com/business/answer/2622994).

## Run one case without Switch

You can run the not-legit case from a fresh clone with Node 20 or newer. You do not need Mattermost for this path. The script prints the staff posts instead of sending them.

In one terminal:

```bash
npm start
```

You should see `listening http://127.0.0.1:8787`. Open that URL. The banner reads `TEST DATA, NOT GOOGLE`.

In a second terminal, from the repo root:

```bash
node bin/inject-review --case not-legit
node bin/staff-sim --all --case not-legit
```

The first command prints a Mattermost incoming-webhook payload from `Fake Google feed (TEST)`. The text includes `@watcher`, `Review id: rev-not-legit`, and `TEST DATA`. The second command prints four posts. The channel names are `review-rev-not-legit-sally`, `review-rev-not-legit-david`, `review-rev-not-legit-cindi`, and `review-rev-not-legit-troy`. Each message starts with `simulated staff reply (TEST):`.

Post the reply and the report the same way the drafter would, after a manager approval:

```bash
curl -s -X PUT http://127.0.0.1:8787/v4/accounts/test/locations/test/reviews/rev-not-legit/reply \
  -H 'content-type: application/json' \
  -d '{"comment":"We are sorry the visit went badly. We looked up that night. (TEST)"}'

curl -s -X POST http://127.0.0.1:8787/fake/reviews/rev-not-legit/report \
  -H 'content-type: application/json' \
  -d '{"reason":"Content that is not based on a real experience","policy_quote":"Content that is not based on a real experience or does not accurately represent the location or product in question.","evidence_summary":"Kitchen closes at 10 PM. The menu has no lobster dish. The review places the visit at 10:40 PM. Google decides. Removal is not promised."}'
```

Read the review back. The reply is on the review, and `report.status` is `Decision pending (simulated)`.

```bash
curl -s http://127.0.0.1:8787/v4/accounts/test/locations/test/reviews/rev-not-legit
curl -s http://127.0.0.1:8787/fake/reviews/rev-not-legit/report
```

For the legit case, inject `--case legit` (review id `rev-legit`) and post a reply only. Do not post a report. The canned staff posts mention table 12 and a 40 minute wait.

```bash
npm run reset
```

Reset deletes `reviews.json`, `replies.json`, and `reports.json` under `data/state/`. It does not change the files in `data/`. Run it before each case. `STATE_DIR` selects another directory. `PORT` selects another port. If `HOST` is anything other than `127.0.0.1`, the process exits and does not listen.

## Set up Switch Console

Install the local Switch server and its bundled Mattermost yourself. This repo does not ship Switch. Point Switch at that Mattermost, and use the clone of this repo as each agent's working directory.

The setup script defaults to Mattermost at `http://127.0.0.1:45065` and the container `switchdash-local-mattermost-mattermost-1`. Pass the flags below when yours differ.

From the repo root, create the test users, the `reviews-inbox` channel, and the incoming webhook:

```bash
bin/setup-mattermost-test --container switchdash-local-mattermost-mattermost-1 --team review-room-test --url http://127.0.0.1:45065
```

Those three flags are optional. The values shown are the defaults. The script talks to Mattermost with `docker exec <container> mmctl --local`. It creates `manager-test`, `sally-test`, `david-test`, `cindi-test`, and `troy-test`, all with `@example.test` mail. `manager-test` is a system admin for setup only. It is not the linked manager, and on this demo it is unlinked. Do not use it for confirms, a verdict, or `approve`. Running the script again leaves existing users, passwords, tokens, and the webhook in place. It fills a missing token without rotating the others.

Generated passwords and tokens are written to `.env` in the repo root. That file is gitignored. The script does not print them. The Node scripts load `.env` when the variable is not already set. A shell variable wins over the file.

`bin/setup-mattermost-test` writes `MM_TEAM` to `.env`. `bin/staff-sim` and `bin/export-transcript` read that file through `src/dotenv.js` when the shell has not set `MM_TEAM`.

`MM_TEAM` must equal the team name in Switch's Mattermost connection. Agents see rooms only on that team.

A new Mattermost from the setup script as written uses team `review-room-test`. The script writes that name to `.env`.

```bash
MM_TEAM=review-room-test
```

This existing demo connects Switch to team `switch`. For that demo, set the one line in `.env` to:

```bash
MM_TEAM=switch
```

`MATTERMOST_URL` must be `http://127.0.0.1` or `http://localhost` with a port. The script refuses any other host.

## Register the three agents

In Switch Console, register three agents. Paste each file into Agent instructions. Set "Who can talk to your agent" from `docs/agents/permissions.md`.

| Agent | Provider | Instructions | Who can talk to it |
| --- | --- | --- | --- |
| Watcher | Codex | `docs/agents/watcher-instructions.md` | Custom rules. Include the owner, the owner's agents, and the Fake Google feed (TEST) poster in `#reviews-inbox`. |
| Investigator | Codex | `docs/agents/investigator-instructions.md` | Custom rules. Include the owner, the owner's agents, and `sally-test`, `david-test`, `cindi-test`, `troy-test`. |
| Drafter | Cursor CLI, model grok-4.7 | `docs/agents/drafter-instructions.md` | Only me and my agents. The owner is the manager. |

Turn Auto mode on for all three. Leave Bypass off. Check the Drafter model is grok-4.7 before every run. On a Drafter card, choose Allow once.

Staff usernames are `sally-test`, `david-test`, `cindi-test`, and `troy-test`. The room alias for the owner is `@manager`. Post confirms, the verdict, and `approve` from the Mattermost account linked to the Switch user who owns the agents. Linking means Switch has claimed that Mattermost user for the owner. On this demo the linked account is `user`. On a fresh install, link your own account. Its username does not have to be `user`. `manager-test` is not an alternative manager.

## Set up the rooms

`#reviews-inbox` is the channel the setup script creates. The incoming webhook posts as `Fake Google feed (TEST)`. Put Watcher in that channel.

Each review gets a private Mattermost room named `review-<id>`, for example `review-rev-not-legit`. Members are the manager, Watcher, Investigator, and Drafter. Paste the instructions from `docs/agents/room-template.md`. The case file in that room holds the timeline, the schedule rows, the staff statements, the verdict, and who approved.

Staff rooms are private and named `review-<id>-<name>` with the staff name in lower case, for example `review-rev-not-legit-sally`. Investigator opens those rooms. `bin/staff-sim` looks them up. You do not copy channel ids.

## Run the not-legit case

Do every manager action in these steps from the Mattermost account linked to your Switch user. On this demo, post them as `user`. The Investigator refuses unclaimed users.

1. `npm run reset`
2. `npm start`
3. `node bin/inject-review --case not-legit`

   With `MATTERMOST_WEBHOOK_URL` in `.env`, this posts into `#reviews-inbox`. Without it, the command prints the payload and still saves the review.
4. Watcher opens `review-rev-not-legit`, adds the manager and the other agents, and posts `Step 1 of 5: review received`.
5. Investigator reads `data/schedule.csv` and posts the close shift (Sally, David, Cindi, Troy), then opens the four staff rooms.
6. `node bin/staff-sim --all --case not-legit`

   This looks up `review-rev-not-legit-sally` and the three other staff rooms on the team in `MM_TEAM`. Each post uses that person's token, `MM_TOKEN_SALLY` and the matching names. If any room is missing, the command posts nothing and exits 1.
7. Send `verdict: not legit`.
8. Drafter posts the reply draft and the report text, including `Removal is not promised`. Send `approve`. Choose Allow once on the card.
9. Confirm the fake service. `report.status` is `Decision pending (simulated)`.

```bash
curl -s http://127.0.0.1:8787/v4/accounts/test/locations/test/reviews/rev-not-legit
```

## Run the legit case

Repeat the not-legit steps with `--case legit`. The review id is `rev-legit`. Staff rooms are `review-rev-legit-sally` and the same pattern for David, Cindi, and Troy.

Send `verdict: legit`, then `approve`. Drafter posts a short apology and no report. The reply must not offer anything, and it must not name staff. A report request for this case is a failed run.

```bash
curl -s http://127.0.0.1:8787/v4/accounts/test/locations/test/reviews/rev-legit
```

The review has `reviewReply` and no `report`.

To post as one person instead of all four, pass `--name` and `--channel`:

```bash
node bin/staff-sim --case legit --name Sally --channel CHANNEL_ID
```

## Export a transcript

Export reads Mattermost with `MM_TOKEN_MANAGER` and writes `transcript.json` plus `transcript.md`. `--review` selects the case room and the four staff rooms. Repeat `--channel` for any other channel, by id or by name. `reviews-inbox` is the inbox name.

```bash
bin/export-transcript --review rev-not-legit --channel reviews-inbox --out transcripts/not-legit
```

Posts in the markdown are oldest first. A missing staff room is recorded as missing. A missing case room still writes the files, then the command exits 1.

The fake service state is included. Set `FAKE_SERVICE_URL` if the service is not at `http://127.0.0.1:8787`. If that variable is unset and nothing is listening there, the export reads `data/state/` instead.

`transcripts/` is gitignored.

## Run the tests

```bash
npm test
```
