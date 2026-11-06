# Case room template: review-<id>
Use as the room Instructions (Console: Your Rooms > Create room > Instructions), or as the `instructions:` of a template room block.

## Room settings
- Name: `review-<id>`. Description: "Bad review case <id> (TEST DATA)".
- Messaging app: Mattermost. Channel type: private.
- Members: manager (person), Watcher, Investigator, Drafter. Aliases: `!set-alias @<watcher name> @watcher` and the same for `@investigator`, `@drafter`.

## Instructions text (paste this)
This room handles one bad Google review for the TEST restaurant in data/restaurant.json. All data is TEST DATA. The Google service at 127.0.0.1:8787 is fake.
Flow: 1 review received (Watcher), 2 schedule checked (Investigator), 3 staff statements in (Investigator), 4 manager verdict (manager only: `verdict: legit` or `verdict: not legit`), 5 reply and report drafted, then posted to the fake service only after the manager writes `approve` (Drafter).
Keep the status line "Step n of 5: <step>" current. Keep the "Case file" document current: timeline, schedule rows, staff statements, verdict, who approved.
Never promise removal. Never offer anything for a review. Never name staff or the reviewer in public text. Only the manager decides.
Keep one current cycle. `Step 5 of 5: reply and report drafted` covers drafts only. It is not acceptance. After Drafter posts acceptance, Watcher adds one completion line and quotes Drafter's exact final status. Do not post `results pending` or `current state unverified` after acceptance. Do not ask for a new verdict or a new `approve` unless the manager posts `owner refresh <id>`.
A legit review is complete when the saved reply is present and no report is expected. A missing report is success on a legit review.
An owner refresh is the only start of a new cycle in a room that already exists. The manager posts `owner refresh <id>` in this room. Ignore a repeated post from Fake Google feed (TEST) for status and for case creation. Mattermost and Switch give these instructions no shared turn id. The review id in the manager's refresh post is the mark every agent can see. If that post has no review id, do not start a cycle.
When a new cycle starts, Watcher posts `Historical cycle. Left as posted.` once. Do not delete older posts. Do not retell them.
In a Mattermost room, do not narrate a displaced session, a retry, a duplicate notification, sandbox limits, a curl exit code, or the events of an older cycle. Do not post the words "session displaced" or "may interrupt work". Keep those notes in your own working notes. Do not write them into the Case file to hide a failed tool call. You may retry a read in your own context. If you already handled the current event, do not post it again. Record the current review once. Leave older posts in the room as they are.

## Optional Switch template (YAML, not yet tested)
```yaml
version: 1
room:
  name: "review-{id}"
  description: "Bad review case {id} (TEST DATA)"
  bridge: "{bridge}"
  channel_type: channel_private
  agents: ["<watcher name>", "<investigator name>", "<drafter name>"]
  users: ["{$creator}"]
  instructions: |
    (paste the instructions text above)
kickoff: "@<investigator name> please check the schedule for review {id}."
```
Field names are from TEMPLATES.md at switch-console-v0.40.1. Watcher can instead create the room itself with `create_room` / `create_room_from_yaml`.
