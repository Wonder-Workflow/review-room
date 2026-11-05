# Who can talk to each agent
Set in Switch Console: Your Agents > open the agent > "Who can talk to your agent". Options: Only me (default), Only me and my agents, Anyone, Custom rules (people, agents, rooms).
The owner is the Switch user who registers the agents. The manager must be that owner, or be named in Custom rules. The owner's Mattermost account must be linked to the Switch user, or the agent refuses the owner.

| Agent | Setting | Why |
|---|---|---|
| Watcher | Custom rules: owner, owner's agents, plus the "Fake Google feed (TEST)" poster in #reviews-inbox | It must wake on the feed post. Whether a webhook post counts as a sender at all is not verified; fallback is a test bot user `fakefeed` named in the rule. |
| Investigator | Custom rules: owner, owner's agents, plus users sally-test, david-test, cindi-test, troy-test | Staff must be able to answer it in their rooms. |
| Drafter | Only me and my agents (owner = manager) | Only the manager can approve its permission requests or give `approve`. Staff are refused. |

Auto mode and bypass:
- Watcher and Investigator (Codex): Auto mode on, Bypass off.
- Drafter (Cursor): Auto mode on, Bypass off. Run sheet: always choose "Allow once", never "Allow for this session".
