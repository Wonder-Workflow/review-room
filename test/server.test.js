import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { start } from '../src/server.js';
import { runNode } from '../test-support/run.js';

async function readJson(url, options) {
  const res = await fetch(url, options);
  const body = await res.json();
  assert.equal(body.test_data, true);
  return { res, body };
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

test('server refuses to bind anything but 127.0.0.1', async () => {
  for (const host of ['0.0.0.0', 'localhost']) {
    const result = await runNode(['src/server.js'], { HOST: host, PORT: '8791' }, 3000);
    assert.equal(result.signal, null, host);
    assert.equal(result.code, 1, `${host}\n${result.stderr}`);
    assert.match(result.stderr, new RegExp(`refusing to bind ${host}`));
  }
});

test('review methods, reply, and report', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'review-room-'));
  const hooks = [];
  const stub = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      hooks.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      res.writeHead(200);
      res.end('ok');
    });
  });
  const hookPort = await listen(stub);
  const server = await start({ port: 0, stateDir: dir });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal(server.address().address, '127.0.0.1');
    const home = await fetch(`${base}/`);
    const html = await home.text();
    assert.equal(home.headers.get('content-type').includes('text/html'), true);
    assert.match(html, /TEST DATA, NOT GOOGLE/);

    const empty = await readJson(`${base}/v4/accounts/test/locations/test/reviews`);
    assert.equal(empty.res.status, 200);
    assert.deepEqual(empty.body.reviews, []);
    assert.equal(empty.body.totalReviewCount, 0);

    const started = Date.now();
    const injected = await runNode(['bin/inject-review', '--case', 'not-legit'], {
      STATE_DIR: dir,
      MATTERMOST_WEBHOOK_URL: `http://127.0.0.1:${hookPort}/hooks/test`,
    });
    assert.ok(Date.now() - started < 10000);
    assert.equal(injected.code, 0, injected.stderr);
    assert.equal(hooks.length, 1);
    assert.equal(hooks[0].username, 'Fake Google feed (TEST)');
    assert.match(hooks[0].text, /@watcher/);
    assert.match(hooks[0].text, /Stars: 1/);
    assert.match(hooks[0].text, /lobster thermidor/);
    assert.match(hooks[0].text, /Review id: rev-not-legit/);
    assert.match(hooks[0].text, /TEST DATA/);

    const list = await readJson(`${base}/v4/accounts/test/locations/test/reviews`);
    assert.equal(list.body.totalReviewCount, 1);
    assert.equal(list.body.reviews[0].reviewId, 'rev-not-legit');
    assert.equal(list.body.reviews[0].starRating, 'ONE');
    assert.equal(list.body.reviews[0].test_data, true);
    assert.equal(list.body.averageRating, 1);

    const got = await readJson(`${base}/v4/accounts/test/locations/test/reviews/rev-not-legit`);
    assert.equal(got.res.status, 200);
    assert.match(got.body.comment, /10:40 PM/);

    const missing = await readJson(`${base}/v4/accounts/test/locations/test/reviews/missing`);
    assert.equal(missing.res.status, 404);

    const reply = await readJson(`${base}/v4/accounts/test/locations/test/reviews/rev-not-legit/reply`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ comment: 'Thanks for the note. We looked up that visit. (TEST)' }),
    });
    assert.equal(reply.res.status, 200);
    assert.equal(reply.body.comment, 'Thanks for the note. We looked up that visit. (TEST)');
    assert.equal(typeof reply.body.updateTime, 'string');

    const withReply = await readJson(`${base}/v4/accounts/test/locations/test/reviews/rev-not-legit`);
    assert.equal(withReply.body.reviewReply.comment, reply.body.comment);

    const noReport = await readJson(`${base}/fake/reviews/rev-not-legit/report`);
    assert.equal(noReport.res.status, 404);

    const report = await readJson(`${base}/fake/reviews/rev-not-legit/report`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        reason: 'Content that is not based on a real experience',
        policy_quote: 'Content that is not based on a real experience or does not accurately represent the location or product in question.',
        evidence_summary: 'Kitchen closes at 10 PM. The menu has no lobster dish. The review places the visit at 10:40 PM.',
        status: 'removed',
      }),
    });
    assert.equal(report.res.status, 200);
    assert.equal(report.body.status, 'Decision pending (simulated)');
    assert.equal(JSON.stringify(report.body).toLowerCase().includes('removed'), false);
    assert.equal(report.body.reason, 'Content that is not based on a real experience');

    const withReport = await readJson(`${base}/v4/accounts/test/locations/test/reviews/rev-not-legit`);
    assert.equal(withReport.body.report.status, 'Decision pending (simulated)');
    assert.equal(withReport.body.report.reason, report.body.reason);

    const reportGet = await readJson(`${base}/fake/reviews/rev-not-legit/report`);
    assert.equal(reportGet.res.status, 200);
    assert.equal(reportGet.body.status, 'Decision pending (simulated)');

    const page = await fetch(`${base}/`);
    const after = await page.text();
    assert.match(after, /TEST DATA, NOT GOOGLE/);
    assert.match(after, /Decision pending \(simulated\)/);
    assert.match(after, /Thanks for the note/);
    assert.equal(after.toLowerCase().includes('removed'), false);

    const deleted = await readJson(`${base}/v4/accounts/test/locations/test/reviews/rev-not-legit/reply`, {
      method: 'DELETE',
    });
    assert.equal(deleted.res.status, 200);
    const cleared = await readJson(`${base}/v4/accounts/test/locations/test/reviews/rev-not-legit`);
    assert.equal(cleared.body.reviewReply, undefined);

    const again = await runNode(['bin/inject-review', '--case', 'not-legit', '--stars', '4'], {
      STATE_DIR: dir,
      MATTERMOST_WEBHOOK_URL: `http://127.0.0.1:${hookPort}/hooks/test`,
    });
    assert.equal(again.code, 0, again.stderr);
    assert.equal(hooks.length, 2);
    assert.match(hooks[1].text, /Stars: 4/);
    const once = await readJson(`${base}/v4/accounts/test/locations/test/reviews`);
    assert.equal(once.body.totalReviewCount, 1);
    assert.equal(once.body.reviews[0].starRating, 'FOUR');
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await new Promise((resolve, reject) => stub.close((err) => (err ? reject(err) : resolve())));
    await rm(dir, { recursive: true, force: true });
  }
});
