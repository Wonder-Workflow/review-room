# Bad Review Fixer test data

Fake restaurant records and a localhost stand-in for the Google Business Profile review methods. All names, reviews and businesses here are made up (TEST DATA).

## Run the fake Google service

From the repo root:

```bash
npm start
```

The process listens on `127.0.0.1` port `8787`. Set `PORT` to use another port. If `HOST` is set to anything other than `127.0.0.1`, the process exits and does not listen.

You should see `listening http://127.0.0.1:8787`. Open that URL for the review list. The page banner reads `TEST DATA, NOT GOOGLE`.

Runtime state is written under `data/state/`. That directory is gitignored. Set `STATE_DIR` to use another directory.

## Inject a review

```bash
node bin/inject-review --case not-legit
```

`--case` is `not-legit` or `legit`. Add `--stars N` (1 through 5) to override the case rating.

The script copies that case into the local store. If `MATTERMOST_WEBHOOK_URL` is set, it also posts a Mattermost incoming webhook payload. The username is `Fake Google feed (TEST)`. The text includes `@watcher`, the star count, the review text, the review id, and `TEST DATA`.

If `MATTERMOST_WEBHOOK_URL` is unset, the script prints that payload and exits 0.

## Post a simulated staff reply

```bash
MATTERMOST_URL=http://127.0.0.1:8065 MM_TOKEN_SALLY=your-token node bin/staff-sim --case not-legit --name Sally --channel CHANNEL_ID
```

`--name` is a first name from `data/staff-replies.json`. The token variable is `MM_TOKEN_` plus that name in uppercase, for example `MM_TOKEN_SALLY`.

The message starts with `simulated staff reply (TEST):`.

If `MATTERMOST_URL` is unset, the script prints the post and does not call Mattermost.

## Run the tests

```bash
npm test
```
