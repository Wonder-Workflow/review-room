# Bad Review Fixer plan (copied from /workspace/app-team/switch-hackathon/plan.md, Nov 4 2026)

## Idea locked: Bad Review Fixer, Oct 29 2026 3:50 PM MT (Ian's own idea, in Pat's chat)
Ian: "What about a bad review fixer. Use resturaunt as the example right now. A 1 star review comes in. Agent flags it dumps it into switch. Pings the manager on slack, another agent pulls up 7 shifts or the schedule and tells switch that Sally, David, Cindi and Troy were all working last night when the review hit. Messages them on slack for details. Once it's proven if the review was worthy or legit it drafts a reply. If it's not true then the agent works with Google to remove the review. Updates as it goes."
Replaces the contractor quote workflow and ideas.md / ideas-v2.md picks.
Pat decisions:
- One Switch room per bad review. Slack bridge if workable (Ian named Slack), Mattermost fallback for repro.
- Two agents minimum: Watcher (detect, open room, ping manager) and Investigator (schedule lookup, staff DMs, collect statements). Reply drafter can be either; consider Codex + Cursor split per Ian's earlier idea.
- Manager verdict (legit / not legit) is the human step, via Switch approval or in-chat decision. Reply goes out only after manager approval.
- "Not true" path: Google only removes reviews that break its policies, not just untrue ones (to verify with source). Agent maps the review to a policy, drafts the report, manager files. Never promise removal.
- All fake data: fake restaurant, reviews, schedule, staff. Google review feed and reply/report steps simulated. No real posting.
Next: plan sync with Forge (task list, done checks, demo script). Nothing Switch-specific built before Nov 3 12:31 PM MT.

## Forge plan-sync: Bad Review Fixer (Oct 29)
Written by Forge, Thu Oct 29 2026, 3:51 PM to about 4:30 PM MT. Planning only. Nothing installed, no sign-ups, nobody contacted, no settings changed. Pat's and Ian's text above is unchanged.
Labels: **[Checked]** = I fetched the page today and the quote is from it. **[Not verified]** = my reading or a guess, test it before building on it.

### 0. Plan-sync status (skill plan-sync-before-build)
- Plan files today (box, /workspace/app-team/switch-hackathon/): plan.md (3:50 PM, this file, current), ideas-v2.md (3:41 PM), ideas.md (3:28 PM), research.md, START.md, HANDOFF.md (10:10 to 10:16 AM). No repo exists yet, so there is no remote copy to compare.
- ideas.md and ideas-v2.md are superseded by the "Idea locked" section above, but their own headers do not say so. I was told to edit only this section, so I did not touch them. Pat can add a "superseded, see plan.md" line at the top of each.
- Rule for Nov 3 on: before any Cursor cloud agent starts, this section is copied into the repo as `docs/plan.md`, read back from the remote branch, and the agent prompt names that exact path and the task number below. No cloud agent starts from a box-only plan.

### 1. Task list, Nov 3 to Nov 7 (all times MT)
Window: Tue Nov 3 12:31 PM to Sat Nov 7 12:29 PM. Internal deadline Fri Nov 6, 6 PM. Nothing below starts before Nov 3 12:31 PM.

| # | Day | Task | Owner | Done check |
|---|-----|------|-------|-----------|
| B1 | Tue Nov 3 PM | `bash prep.sh`, install Switch Linux build, local server with bundled Mattermost | Forge | `prep.sh --check` passes; Switch Console shows the server; Mattermost login page loads |
| B2 | Tue Nov 3 PM | Codex signed in (Ian, box screen, START.md option A) and registered as an agent | Ian + Forge | Codex agent answers an @mention in a Mattermost room; screenshot saved |
| B3 | Tue Nov 3 PM | Slack check (section 3): demo Slack workspace, Switch app from the manifest with the `agent_view` block removed | Ian signs up, Forge configures | `/invite @Agent Switch` makes the channel show under Your Rooms; agent answers there; agent-made private room with one test user works. If any part fails by 6 PM, Mattermost becomes primary |
| B4 | Tue Nov 3 PM | Second provider check: Cursor CLI signed in on the box, agent on grok-4.7, joined to a room | Ian + Forge | Agent answers in a room and the model shown is grok-4.7. If not possible, flag to Ian (section 2) |
| B5 | Tue Nov 3 PM | Repo created, this section pushed as `docs/plan.md` | Forge | `docs/plan.md` read back from the remote branch matches this section |
| B6 | Wed Nov 4 | Fake data and fake Google service (section 4) | Cursor cloud agent, grok-4.7, xhigh | Tests pass in the repo; `inject-review` posts to #reviews-inbox within 10 s; every data file and screen says TEST DATA |
| B7 | Wed Nov 4 | Agent instructions, room template, per-agent "who can talk to me" settings | Forge (config), cloud agent (any script) | One full "not legit" run start to finish, transcript saved |
| B8 | Thu Nov 5 | Both paths (legit, not legit) run 3 times each, instructions tuned | Forge | 5 of 6 runs finish with no hand fixes; transcripts saved |
| B9 | Thu Nov 5 | README (Switch setup, agents, rooms, run steps, TEST DATA note, Google policy limits) and Mattermost repro path | Cursor cloud agent | Pat clones fresh and runs one case from the README alone |
| B10 | Fri Nov 6, daytime | Record demo with Ian (about 20 min of his time) | Forge + Pat + Ian | Video under 3 min with the 90 s cut in section 5 |
| B11 | Fri Nov 6, by 6 PM | Submission | Ian only (rules 3(b)) | Ian submits; Pat checks the listing |
| B12 | Sat Nov 7 to 12:29 PM | Buffer only | Pat | Nothing new built |

### 2. Agent roles and providers
Two kinds of agents, kept apart:
- **Builders** (write repo code): Cursor cloud agents on grok-4.7, reasoning_effort xhigh, poteto-mode bar. No Claude, GPT or Codex models through Cursor.
- **Room agents** (run inside Switch during the demo): must be a Switch provider. Switch lists "Claude Code, OpenCode, Codex, Cursor, and Antigravity" [Checked earlier, ideas-v2.md section 2].

| Room agent | Job | Provider | Who can talk to it | Why |
|---|---|---|---|---|
| Watcher | Sees the new low review in #reviews-inbox, opens one room per review, adds the manager and Investigator, keeps a status line updated | Codex (Ian's ChatGPT Pro, outside Cursor) | Me and my agents | Codex Auto mode can "read files, make edits, and run commands in the working directory automatically" [Checked earlier, ideas-v2.md], so no card spam |
| Investigator | Reads the schedule file, names who worked, opens a private room per staff member, asks for details, collects statements, posts an evidence summary | Codex | Custom: the manager plus the 4 staff test users | Staff must reach it. Switch: "Anyone the agent takes messages from can answer its requests" (ideas-v2.md), so it must never need an approval. It only reads local files, which Codex Auto does without asking |
| Drafter | Drafts the public reply, or maps the review to a Google policy and drafts the report text. Calls the fake Google service only after the manager approves | Cursor CLI on grok-4.7 | Only the manager and the other two agents | Switch: "Cursor asks before every action" (ideas-v2.md), so every post to the fake Google service is an approval card only the manager can answer. That card is the human step |

Conflicts and flags:
1. **Cursor as a room agent needs grok-4.7.** Ian's rule bans Claude and GPT models through Cursor. Switch says "Model catalogues come from the provider on the execution host" (ideas-v2.md). Whether grok-4.7 shows up for a Cursor agent inside Switch, and whether reasoning_effort can be set there: **not verified**. Day-one check B4. Fallback: Drafter becomes a second Codex agent. That keeps the story, loses "two model families", and loses Cursor's built-in approval card (we would rely on the in-chat manager decision instead).
2. **Codex is fine under the rule** because it runs outside Cursor on Ian's ChatGPT Pro. It is a room agent only and writes no repo code.
3. **Builders can't see the box.** Cloud agents can't reach the local Switch server or Mattermost on the box, so they build and unit-test the fake service and scripts, and Forge does the live runs. Expect slower fix loops. Switch config (agents, rooms, settings) is done by Forge in Switch Console, which is setup, not repo code.
4. Two Codex agents share one ChatGPT Pro sign-in. Usage limits under a long test day: **not verified**.

### 3. Does Switch's Slack bridge work on a FREE Slack plan in Socket Mode?
**Short answer: yes per the docs, with three catches. Not tested by us.**
Evidence:
- Switch's Slack page [Checked, repo copy: https://raw.githubusercontent.com/sandbox-quantum/switch/main/docs/official/deploy/messaging-apps/slack.md, published at https://docs.switchagents.ai/flintai/switch/deploy/messaging-apps/slack]: "Slack reaches Switch over a connection Switch opens outwards, so **nothing needs to be publicly reachable**." Requirement: "A Slack workspace where you can install a custom app." The only paid item named: autocomplete needs "A paid Slack plan. User groups don't exist on the free tier." And: "Without user-group autocomplete, you can still address agents by typing `@agent-name`. This does not affect SDK status, permission requests, or reactions."
- Switch docs index [Checked, https://docs.switchagents.ai/llms-full.txt]: autocomplete "affects how agents look in Slack, not whether the bridge works."
- Slack Socket Mode page [Checked, https://docs.slack.dev/apis/events-api/using-socket-mode]: "Socket Mode allows your app to use the Events API and interactive features" ... "without exposing a public HTTP Request URL." The page names no plan requirement. Its only limits: "Socket Mode is only available for apps using granular permissions" and Socket Mode apps "are not currently allowed in the public Slack Marketplace" (not an issue, we install our own app).
- Slack free plan limits [Checked, https://slack.com/help/articles/115002422943]: "You can add up to 10 third-party or custom apps." Switch uses one app. Also a "High-volume message limit" on free plans, and 90-day message visibility (no issue for a demo).

The catches:
1. **The manifest declares the app an Agent.** Slack [Checked, https://docs.slack.dev/ai/developing-agents]: "Developing and using some AI features require a paid plan, despite being visible in the app settings on any plan." Switch [Checked, llms-full.txt]: "Switch doesn't use the declaration, so if your workspace has guests, delete the `agent_view` block from the manifest before you paste it." The slack.md warning says it "can't be undone". Plan: delete `agent_view` before pasting. Whether the progress card still draws on free without it: **not verified** (slack.md says "everything else on this page works without it").
2. **No DMs from agents in Slack.** Switch [Checked, slack.md]: "**Rooms are channels, not direct messages.**" and the docs table: Slack one-to-one chats "No. Use a private channel with you and the agent". So "messages them on Slack" becomes one private room per staff member. Agents have `create_room` and `add_users_to_room` [Checked, llms-full.txt agent protocol]. Whether `add_users_to_room` can add a Slack user from an agent: **not verified** (B3 check). Private channels on the Slack free plan: **not verified** (I did not open a Slack page that says so).
3. **Every person needs a Slack account.** Manager plus Sally, David, Cindi and Troy means 5 accounts, each needing an email. Someone has to sign up and invite them. Ian's call (section 7).

Fallbacks, in order:
1. **Bundled Mattermost** (already planned for repro). Forge can make local test users with no email. Switch table [Checked]: Mattermost one-to-one "Yes. Start a direct message with the agent's bot", but "Only a person can start one, so Switch can't open it for you", so we still use private rooms per staff member.
2. **Slack Developer Program sandbox** [Checked, https://docs.slack.dev/tools/developer-sandboxes]: "an Enterprise org environment ... that can be used to build against all Slack features safely and securely, without an additional cost." "All developers can provision a basic sandbox." A template gives "1 workspace, 7 system-created fake users, 7 channels". Basic sandboxes last "one month". Needs Ian to join the Developer Program. Whether we can log in as the template's fake users to type staff replies: **not verified**.

### 4. Fake review feed, fake schedule, staff messages
All test data. Fake restaurant name with "(TEST)" in it, fake reviewers, fake staff (the 4 first names from Ian's message are fine, no last names). Nothing touches real Google, real Slack users or real client data (rules section 5, research.md).
- **Fake Google service** (tiny local service in the repo, localhost only): `data/reviews.json` holds reviews. Endpoints shaped like the real Business Profile API reviews methods, which are only "deleteReply", "get", "list", "updateReply" [Checked, https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews]. That API page lists no method to report a review, so our "report" is a separate fake endpoint that only saves the report text and shows status "Decision pending (simulated)". Every response and page carries `"test_data": true` and a "TEST DATA, NOT GOOGLE" banner.
- **Feed trigger**: `inject-review --stars 1 --case not-legit` (or `--case legit`) adds a review, and the service posts it into #reviews-inbox as a separate "Fake Google feed (TEST)" app or webhook with `@watcher`. Switch [Checked, mention-and-message.md]: "Switch reads a post from a Slack app exactly as it reads one you typed". The same for a Mattermost webhook: **not verified**.
- **Fake schedule**: `data/schedule.csv` (date, shift, role, name, start, end), shaped like a scheduling-app export. Investigator reads the file in its working copy, so it never needs network or approval. The review time sits inside the closing shift that Sally, David, Cindi and Troy worked.
- **Staff messages**: Investigator creates one private room per staff member and asks 2 short questions. Staff answers come from people typing as the test users (preferred) or from a `staff-sim` script that posts canned answers labeled "simulated staff reply (TEST)". Pick in section 7.
- **Case file**: each review room keeps a room document with the timeline, the schedule rows, staff statements, the verdict and who approved it.
- **Two scripted cases**: Legit (staff confirm a long wait on table 12, reply apologises, no offer of anything). Not legit (review describes a dish the menu does not have and a time after the kitchen closed, and no staff remember it; Drafter maps it to Google's "Content that is not based on a real experience" and drafts the report text; the manager files it by hand in real life).

### 5. 90-second demo script (Ian is the manager on camera)
| Time | Beat |
|---|---|
| 0:00 to 0:08 | Ian to camera: "A 1-star review just hit from last night. Normally I'd spend my morning texting the closing crew. Watch." |
| 0:08 to 0:18 | Fake feed posts the review (TEST banner on screen). Watcher opens #review-0412, adds Ian and Investigator, pings Ian. |
| 0:18 to 0:32 | Investigator reads the schedule: "Sally, David, Cindi and Troy worked the 4 PM to close shift." Four private staff rooms appear. |
| 0:32 to 0:47 | Fast cut of two staff replies: "Kitchen closed at 10. We don't serve lobster." Investigator posts the evidence summary in the review room. |
| 0:47 to 0:58 | Drafter: "Closest Google policy: Content that is not based on a real experience" with the link, plus "Google decides. Removal is not promised." Report text and a short public reply shown. |
| 0:58 to 1:10 | Ian marks "not legit" and clicks the approval card. Fake Google shows the reply posted and the report "Decision pending (simulated)". Room status line updates. |
| 1:10 to 1:20 | Quick second case: staff confirm a real 40 minute wait. Verdict "legit", apology reply drafted, Ian approves. A staff member tries `@drafter post it` and gets the visible refusal. |
| 1:20 to 1:30 | Ian: "One room per review, three agents, two providers, and I made every call." Architecture slide and repo link. |

### 6. Google's actual policy (all [Checked] today, quotes copied from the fetched pages)
**Report a review** (https://support.google.com/business/answer/4596773):
- "You can report any review, but only those that violate Google policies are eligible for removal."
- "Do not report a review just because you disagree with it or dislike it. Google doesn’t get involved in conflict between businesses and customers."
- "Review evaluation typically takes several days. You can check the status of your report in the Reviews Management Tool."
- Statuses include "Report reviewed - no policy violation" and "If you disagree with the decision, you can submit a one-time appeal."

**Reviews Management Tool** (https://support.google.com/business/workflow/9945796): "Use this tool to report review removals and check review status." It needs a Google sign-in, so I read only the landing page.

**Prohibited & restricted content** (https://support.google.com/business/answer/2622994):
- "a review or rating should reflect an actual experience with a business, and be genuine and unbiased."
- Fake engagement includes "Content that is not based on a real experience or does not accurately represent the location or product in question."
- "We do not allow merchants or users to: Solicit or encourage the posting of content that does not represent a genuine experience. Offer incentives – such as payment, discounts, free goods and/or services - in exchange for posting any review or revision or removal of a negative review."
- Rating manipulation includes "Content that is based on a conflict of interest. A conflict of interest may include current or former employment".
- "We do not allow merchants to: ... Discourage or prohibit negative reviews, or selectively solicit positive reviews from customers"
- Offensive content includes "Unsubstantiated allegations of unethical behavior or criminal wrongdoing." and "We do allow content that describes negative experiences in a respectful manner."
- Personal information: "Content which contains personal information of another posted without their consent such as: full name, or last name".

**Replying** (https://support.google.com/business/answer/3474050):
- "Google reviews your replies: This makes sure that they follow Google’s content policies."
- "Customers can still change their review after reading your reply."

**Tips to get more reviews and write replies** (https://support.google.com/business/answer/3474122):
- "Offering incentives, like free or discounted goods or services, in exchange for customers to post reviews, change reviews, or remove negative reviews is considered fake & misleading content and is strictly prohibited."
- "Be conversational, not promotional: Your reviewers are already customers, so avoid using your response to offer deals or promotions."
- "Protect privacy and avoid personal attacks: Never share a reviewer's private information or engage in personal attacks."

**Extortion reviews** (https://support.google.com/business/answer/16404809): "Do not engage with or pay the malicious individuals." This page has its own report form, only for when someone demands money or favors to remove reviews.

**Bottom line**: Google removes a review only if it breaks a listed policy, not because it is untrue or unfair. "It's not true" only fits when the evidence suggests no real visit ("not based on a real experience") or a conflict of interest. Google decides, it takes days, and there is one appeal. The API page I checked has reply methods but no report method, so filing a report stays a manual owner step.

**What the tool must NOT do** (our rules, built from the quotes above):
1. Never post, write or suggest fake reviews, and never post from extra accounts.
2. Never offer a discount, comp or anything else in a reply or message in exchange for changing or removing a review.
3. Never gate reviews (asking only happy guests to review, or steering unhappy ones away from Google). Out of scope for this build entirely.
4. Never draft a removal report for a review the manager marked legit, and never call a report "removal". Wording is "report for Google to evaluate".
5. Never name staff or share reviewer details in a public reply. Never accuse the reviewer of lying or wrongdoing in public.
6. Never promise removal or a timeline.
7. Nothing goes to the fake Google service without the manager's approval card.

### 7. Objections and open questions
Objections from Forge:
1. "Works with Google to remove the review" can't be fully automated. The demo shows a drafted report and a manual filing step, which is honest but less flashy.
2. Slack needs real accounts and emails for 5 people. Mattermost is easier and fully reproducible for judges. Slack is the nicer story.
3. Agent-made staff rooms in Slack depend on `add_users_to_room` working through the bridge (not verified).
4. Cursor on grok-4.7 inside Switch is unproven (section 2, flag 1).
5. Live agents vary run to run; record the best of several runs, as ideas-v2.md already notes.

**Pat can decide**
1. Mattermost or Slack as primary for the recorded demo, after B3 on Nov 3.
2. Room naming (`#review-<id>`), case file layout, status line wording.
3. Whether the 90 s cut shows both cases or only "not legit".
4. Feed trigger: separate test app versus webhook.
5. Repo name and when it goes public (before submission).
6. Whether to mark ideas.md and ideas-v2.md as superseded.

**Only Ian can answer**
1. Slack: will you sign up for a new free Slack workspace for the demo (not the W&W one), or join the Slack Developer Program for a sandbox? Or skip Slack and use Mattermost?
2. Staff: who plays Sally, David, Cindi and Troy? Real people with their own test accounts (needs 4 emails if Slack), or a script posting replies clearly labeled as simulated?
3. Is it OK to sign the Cursor CLI into your Cursor account on the box for the Drafter agent, on grok-4.7? If grok-4.7 isn't offered there, is a second Codex agent OK instead?
4. Are you OK with the "not true" path ending at "report drafted, you file it, Google decides, no promise", since Google only removes policy-breaking reviews?
5. Are you on camera, voice only, or both, in the Nov 6 recording, and what time that day works?
6. Still open from before: have you registered yourself on WeMakeDevs (Q2)?

### 8. Pat decisions on Forge plan-sync (Oct 29 2026, ~4:00 PM MT)
1. Mattermost is primary for the recorded demo and the README repro: no emails, judges can reproduce it, and staff test users can be made locally. Slack (new free demo workspace, never the W&W one) is a stretch goal only if B3 passes on Nov 3 with zero Ian accounts beyond his own; otherwise skip. Ian may override.
2. Staff replies: `staff-sim` script posting as the 4 Mattermost test users, every message labeled "simulated staff reply (TEST)". No real people.
3. Drafter: Cursor CLI signed in to Ian's Cursor account on the box (sign-in is allowed; Ian does the login on the box screen), model grok-4.7 only. If grok-4.7 isn't offered inside Switch, Drafter becomes a second Codex agent and the manager's in-chat decision is the human step. No Claude/GPT models via Cursor.
4. "Not true" path ends at "report drafted, manager files it, Google decides, no promise". This is Google's policy, not a choice. Section 6 rules are binding.
5. Room naming `#review-<id>`; case file as a room document (timeline, schedule rows, statements, verdict, approver); status line "Step n of 5: <step>".
6. 90 s cut shows both cases (not legit first, legit short), as in section 5.
7. Feed trigger: Mattermost incoming webhook posting as "Fake Google feed (TEST)". If Switch ignores webhook posts, fall back to a separate test bot user.
8. Repo: new public repo `Wonder-Workflow/review-room`, created Nov 3 at B5, public from creation (rules need a public repo; fake data only).
9. ideas.md and ideas-v2.md marked superseded.
Still for Ian: on camera / voice / both and a time on Nov 6; has he registered on WeMakeDevs himself.

### Ian answers (Oct 29 2026 5:48 PM MT)
- Video role: Ian said "Whatever makes the most sense". Pat decided: 10-second on-camera intro by Ian, then Ian's voiceover on the screen recording for the rest.
- Recording time: Fri Nov 6, 10 AM MT (Pat's pick, leaves buffer before Nov 7 12:29 PM deadline).
- WeMakeDevs registration: Ian said "Yes" (registered himself).

## 9. Pre-build audit decisions (Pat, Oct 29 2026 8:35 PM MT)
Source: pre-build-audit.md (same folder). These override anything above that conflicts.
1. Prep before Nov 3 (Forge, prep.sh): create docker group, add box user, start dockerd, verify `docker info` works without sudo in a fresh session. Install Cursor CLI (`agent`) BEFORE first Switch Console launch. Pin Switch v0.40.1.
2. Codex is already signed in on the box (unknown account). Nobody logs it out. Pat is confirming whose it is.
3. Drafter: check model is grok-4.7 before every run. Handle Cursor folder-trust prompt in setup. Run sheet says "Allow once" on every card, never "Allow for this session".
4. Watcher custom rules must include the fake feed poster (webhook posts don't count under "Me and my agents").
5. Demo: cut the "staff tries @drafter post it" beat (no shared room). Not-true case outputs Google's closest report reason + policy quote + evidence summary (Google uses a reason picker, not free text).
6. Fake data adds: menu file, hours incl. 10 PM kitchen close, staff roster incl. off-shift staff, waitlist/POS record for legit case. Investigator matches the visit time stated in the review, not the post time.
7. Repo: LICENSE (MIT) and .gitignore for .switch/ and auth files in the first commit. Ship setup as a Switch template with agent provider as a field. B9 fresh-clone check runs in a clean container, not the box as-is.
8. Recording: backup full take Thu Nov 5. Daily backup of Switch data to /workspace. Edited cut 2:00 to 2:30 with speed-ups labeled. Check free memory (need 4 GB+) before recording; stop other heavy jobs.
9. B3 Slack dropped from Nov 3; stretch only after B1 to B8 pass. B6 live-post check done by Forge on the box, not a cloud agent.
10. Start time: official 12:31 PM MT Nov 3; routine at 12:35 PM is fine.
11. Top of this file still describes the old contractor idea; sections from "Idea locked: Bad Review Fixer" down are current.
Open for Ian: Cursor plan tier (Plus = grok-4.7 medium only), registration account made by himself vs Finn's bot, video host.
- Nov 2 2026, 3:33 PM MT, Pat: Ian's rule (Hatch's chat, 3:30 PM MT): "all things built in cloud agents on cursor should use /poteto-mode". Every Cursor cloud agent build prompt and steer for this project starts with /poteto-mode.

- Nov 3 2026, 9:35 AM MT, Pat: Ian in Pat chat: "Lets focus on Vultr Today and we will push both starting tomorrow". Switch build does NOT start today at 12:31 PM. Forge holds; Switch work (B1 on) starts Wed Nov 4. Window still closes Sat Nov 7 12:29 PM MT, so the build has 3 days, not 4. Pat replans the days on Nov 4.
- Nov 3 10:54 AM MT (Pat): Ian confirmed on call he needs no Switch account; Forge sets up Switch on the box. README needs a "all names and reviews are made up" note.

## Replan, Wed Nov 4 2026 1:20 PM MT (Pat)
Ian on call, Nov 4 ~1:16 PM MT: "you don't need me unless you do need me, just push both projects full tilt." Switch build starts now. 3 days left, so the days compress:
- Wed Nov 4 (today): B1 Switch install + Mattermost, B5 repo + docs/plan.md, B6 fake data + fake Google service started. B2 (Codex) and B4 (Cursor CLI grok-4.7) need Ian's sign-in on the box screen: Forge prepares both to the login screen, then tells Pat once; Pat batches both into ONE Ian moment. If Codex on the box is already signed in, Forge checks whose account (no logout) and reports.
- Thu Nov 5: B6 done, B7 full "not legit" run, B8 3+3 runs.
- Fri Nov 6: B9 README + fresh-clone check by Pat (morning), B10 demo with Ian (~20 min, Pat schedules), B11 Ian submits by 6 PM.
- Sat Nov 7 to 12:29 PM: buffer only.
- Repo Wonder-Workflow/review-room is created PRIVATE. Making it public is publishing publicly and needs Ian's own yes; Pat asks Ian once before B11.
