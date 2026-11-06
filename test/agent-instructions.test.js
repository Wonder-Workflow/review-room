import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { repoRoot } from '../test-support/run.js';

function readDoc(name) {
  return readFileSync(path.join(repoRoot(), 'docs/agents', name), 'utf8');
}

const silence = [
  'In a Mattermost room, do not narrate a displaced session, a retry, a duplicate notification, sandbox limits, a curl exit code, or the events of an older cycle.',
  'Do not post the words "session displaced" or "may interrupt work".',
  'Keep those notes in your own working notes.',
  'Do not write them into the Case file to hide a failed tool call.',
  'You may retry a read in your own context.',
  'If you already handled the current event, do not post it again.',
  'Record the current review once.',
  'Leave older posts in the room as they are.',
].join(' ');

test('existing agent constraints stay in the instruction files', () => {
  const watcher = readDoc('watcher-instructions.md');
  const investigator = readDoc('investigator-instructions.md');
  const drafter = readDoc('drafter-instructions.md');
  const room = readDoc('room-template.md');
  const permissions = readDoc('permissions.md');

  assert.match(
    watcher,
    /Check it (once )?with `curl -s http:\/\/127\.0\.0\.1:8787\/v4\/accounts\/test\/locations\/test\/reviews\/<id>`\./,
  );
  assert.match(watcher, /Never post anything to the fake Google service\. You only read it\./);
  assert.match(watcher, /Never promise removal\. Never contact the reviewer\./);
  assert.match(watcher, /Never name staff or the reviewer outside the case room\./);
  assert.match(watcher, /Only open one room per review id\./);
  assert.match(watcher, /1 review received, 2 schedule checked, 3 staff statements in, 4 manager verdict, 5 reply and report drafted\./);
  assert.match(watcher, /Never ask for or wait on a separate `manager-test` account\./);

  assert.match(investigator, /You do not decide if the review is legit\./);
  assert.match(investigator, /data\/schedule\.csv/);
  assert.match(investigator, /Do you remember this guest or table around <visit time>\?/);
  assert.match(investigator, /Never pressure staff or suggest answers\./);
  assert.match(investigator, /Never post to the fake Google service\./);
  assert.match(investigator, /verdict: legit` or `verdict: not legit/);

  assert.match(drafter, /Nothing goes to real Google\./);
  assert.match(drafter, /Promise nothing: no changes, staffing, coverage, offers, discounts or freebies\./);
  assert.match(drafter, /Google decides\. Removal is not promised\./);
  assert.match(drafter, /curl -s -X PUT http:\/\/127\.0\.0\.1:8787\/v4\/accounts\/test\/locations\/test\/reviews\/<id>\/reply/);
  assert.match(drafter, /curl -s -X POST http:\/\/127\.0\.0\.1:8787\/fake\/reviews\/<id>\/report/);
  assert.match(drafter, /Reply only after manager approval\./);
  assert.match(drafter, /Never draft a report for a review the manager marked legit\./);
  assert.match(drafter, /answers your permission request with Allow once/);

  assert.match(room, /5 reply and report drafted, then posted to the fake service only after the manager writes `approve`/);
  assert.match(room, /Never promise removal\./);
  assert.match(room, /Only the manager decides\./);

  assert.match(permissions, /always choose "Allow once", never "Allow for this session"/);
});

test('watcher keeps a successful direct read and does not call a failed read unreachable', () => {
  const watcher = readDoc('watcher-instructions.md');

  assert.match(watcher, /Check it with `curl -s http:\/\/127\.0\.0\.1:8787\/v4\/accounts\/test\/locations\/test\/reviews\/<id>`\./);
  assert.match(watcher, /If a try of that curl returns the review, use it and do not hand off\./);
  assert.match(watcher, /If every try fails, post one handoff and no second one/);
  assert.match(watcher, /service check unavailable to Watcher; awaiting Drafter verification/);
  assert.match(watcher, /post one handoff and no second one/);
  assert.match(watcher, /Do not call the service unreachable\./);
  assert.match(watcher, /Advance this check only when Drafter posts a successful read\./);
  assert.match(watcher, /If Drafter posts that the read failed, stop and report that blocker\./);
  assert.match(watcher, /Do not claim the check succeeded\./);
  assert.match(watcher, /Do not change the Case file to claim the service is unreachable or to hide the failed read\./);
  assert.match(watcher, /The handoff is only for the step 1 review read\./);
  assert.match(watcher, /Before the manager writes `approve`, do not say a reply or a report was published\./);
});

test('drafter does the host read Watcher could not do and does not publish it', () => {
  const drafter = readDoc('drafter-instructions.md');

  assert.match(drafter, /Do not refuse the request\./);
  assert.match(drafter, /The owner chooses Allow once on the tool card before the read\./);
  assert.match(drafter, /That choice is not `approve` and it does not publish anything\./);
  assert.match(drafter, /curl -s http:\/\/127\.0\.0\.1:8787\/v4\/accounts\/test\/locations\/test\/reviews\/<id>/);
  assert.match(drafter, /curl -s http:\/\/127\.0\.0\.1:8787\/fake\/reviews\/<id>\/report/);
  assert.match(drafter, /Drafter read <id>:/);
  assert.match(drafter, /Drafter read failed for <id>\. Blocked\./);
  assert.match(drafter, /Do not claim the read succeeded\./);
  assert.match(drafter, /A GET before `approve` does not show that the current draft was published\./);
  assert.match(drafter, /After those calls succeed, read the saved review and the saved report back with the GET commands above\./);
  assert.match(drafter, /Step 5 of 5 accepted\. Reply saved\. No report expected\./);
  assert.match(drafter, /Step 5 of 5 accepted\. Reply saved\. Report saved\. Report status: Decision pending \(simulated\)\./);
  assert.match(drafter, /On a legit review, no report saved is success\./);
  assert.match(drafter, /Do not ask for another `approve` after you have posted the acceptance line, unless the manager posts `owner refresh <id>`\./);
});

test('step 5 draft wording stays, and completion does not say results pending', () => {
  const watcher = readDoc('watcher-instructions.md');
  const drafter = readDoc('drafter-instructions.md');
  const room = readDoc('room-template.md');

  assert.match(watcher, /`Step 5 of 5: reply and report drafted` covers drafts only\. It is not acceptance\./);
  assert.match(drafter, /Step 5 of 5: reply and report drafted/);
  assert.match(room, /`Step 5 of 5: reply and report drafted` covers drafts only\. It is not acceptance\./);
  assert.match(watcher, /The completion line is `Current cycle complete\.` followed by Drafter's acceptance sentence and nothing else\./);
  assert.match(watcher, /Do not post `results pending` or `current state unverified` after acceptance\./);
  assert.match(room, /Do not post `results pending` or `current state unverified` after acceptance\./);
  assert.match(watcher, /Do not post an older cycle's pending line again\./);
  assert.match(watcher, /A missing report is success on a legit review\./);
  assert.match(watcher, /After the completion line, do not ask for a new `approve`\./);
  assert.match(watcher, /Do not reset the case to step 1\./);
  assert.match(watcher, /Do not ask the manager for a verdict again\./);
  assert.match(room, /Do not ask for a new verdict or a new `approve` unless the manager posts `owner refresh <id>`\./);
});

test('user-facing rooms stay quiet and older cycles stay in the room', () => {
  for (const name of [
    'watcher-instructions.md',
    'investigator-instructions.md',
    'drafter-instructions.md',
    'room-template.md',
  ]) {
    assert.ok(readDoc(name).includes(silence), name);
  }

  const watcher = readDoc('watcher-instructions.md');
  const room = readDoc('room-template.md');
  assert.match(watcher, /Keep one current cycle\./);
  assert.match(room, /Keep one current cycle\./);
  assert.match(watcher, /Historical cycle\. Left as posted\./);
  assert.match(room, /Historical cycle\. Left as posted\./);
  assert.match(watcher, /Do not delete older posts\./);
  assert.match(room, /Do not delete older posts\./);
});

test('owner refresh is the new cycle, and a queued investigator takes the newest request', () => {
  const watcher = readDoc('watcher-instructions.md');
  const investigator = readDoc('investigator-instructions.md');
  const room = readDoc('room-template.md');

  assert.match(watcher, /ignore a repeated post from Fake Google feed \(TEST\) for that id/i);
  assert.match(watcher, /A new cycle starts only when the manager posts `owner refresh <id>`/);
  assert.match(watcher, /no shared turn id/);
  assert.match(watcher, /If the post has no review id, do not start a cycle\./);
  assert.match(room, /no shared turn id/);
  assert.match(room, /Ignore a repeated post from Fake Google feed \(TEST\)/);
  assert.match(room, /If that post has no review id, do not start a cycle\./);

  assert.match(investigator, /do this job once for that id/);
  assert.match(investigator, /Do not sweep other case rooms because of that post\./);
  assert.match(investigator, /do not ask the staff again/);
  assert.match(investigator, /Leave staff replies that are already in the room unchanged\./);
  assert.match(investigator, /process the newest `owner refresh` first/);
  assert.match(investigator, /skip an older repeat of the same id/);
  assert.match(investigator, /Do not drop it and do not refuse it\./);
  assert.match(investigator, /cannot see a hidden queue id/);
  assert.match(investigator, /Ignore a repeated post from Fake Google feed \(TEST\)/);
});
