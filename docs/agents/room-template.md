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
A repeated post from Fake Google feed (TEST) does not update the current cycle.
Do not post pending after Drafter posted this cycle accepted reply or report success. Historical posts stay unedited.

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
