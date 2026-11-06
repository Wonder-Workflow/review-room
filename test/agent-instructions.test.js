import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { repoRoot } from '../test-support/run.js';

function readDoc(name) {
  return readFileSync(path.join(repoRoot(), 'docs/agents', name), 'utf8');
}

test('existing agent constraints stay in the instruction files', () => {
  const watcher = readDoc('watcher-instructions.md');
  const investigator = readDoc('investigator-instructions.md');
  const drafter = readDoc('drafter-instructions.md');
  const room = readDoc('room-template.md');
  const permissions = readDoc('permissions.md');

  assert.match(
    watcher,
    /Check it with `curl -s http:\/\/127\.0\.0\.1:8787\/v4\/accounts\/test\/locations\/test\/reviews\/<id>`\./,
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

  assert.match(drafter, /You post only after the manager approves\./);
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

test('drafter instructions stay the publication gate', () => {
  const drafter = readDoc('drafter-instructions.md');
  assert.equal(drafter.includes('Do not refuse the request'), false);
  assert.equal(drafter.includes('I have asked Drafter'), false);
  assert.equal(drafter.includes('owner refresh'), false);
  assert.equal(drafter.includes('no report expected'), false);
});

test('a failed Watcher read stays private and step 5 waits for the sends', () => {
  const watcher = readDoc('watcher-instructions.md');
  assert.match(watcher, /record the curl result in your private working notes, not in the Case file/);
  assert.match(watcher, /Watcher could not read the current service/);
  assert.match(watcher, /Continue the case from the feed post\./);
  assert.match(watcher, /Do not say the service is unavailable\./);
  assert.match(watcher, /Do not ask Drafter to repeat this read\./);
  assert.match(watcher, /Do not call the failed read an unsupported service\./);
  assert.match(watcher, /until Drafter has posted the successful sends for the verdict/);
  assert.match(watcher, /stop reporting this cycle/);
  assert.match(watcher, /Do not post a late pending result\./);
  assert.match(watcher, /leave the current status unchanged rather than writing pending/);
  assert.match(watcher, /Please continue \/ refresh this case/);
  assert.match(watcher, /The first feed post still opens the room\./);
  assert.match(
    watcher,
    /Never repeat a displaced session, a duplicate feed, or sandbox or curl diagnostics in a user-facing room\./,
  );
  assert.equal(watcher.includes('I have asked Drafter'), false);
  assert.equal(watcher.includes('fake service accepted'), false);
  assert.equal(watcher.includes('updateTime'), false);
});

test('investigator keeps the original text', () => {
  const investigator = readDoc('investigator-instructions.md');
  assert.equal(investigator.includes('Do an owner refresh once'), false);
  assert.equal(investigator.includes('do the latest message'), false);
  assert.equal(investigator.includes('I have asked Drafter'), false);
});

test('the room ignores a repeated feed and a late pending line', () => {
  const room = readDoc('room-template.md');
  assert.match(room, /A repeated post from Fake Google feed \(TEST\) does not update the current cycle\./);
  assert.match(
    room,
    /Do not post pending after Drafter posted this cycle accepted reply or report success\. Historical posts stay unedited\./,
  );
  assert.equal(room.includes('Historical cycle'), false);
  assert.equal(room.includes('I have asked Drafter'), false);
  assert.equal(room.includes('owner refresh'), false);
});
