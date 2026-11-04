import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { repoRoot, runNode } from '../test-support/run.js';

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

test('inject-review posts to a stub webhook within 10s', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'review-room-inject-'));
  const hits = [];
  const stub = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      hits.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      res.writeHead(200);
      res.end('ok');
    });
  });
  const port = await listen(stub);
  try {
    const started = Date.now();
    const result = await runNode(['bin/inject-review', '--case', 'legit', '--stars', '2'], {
      STATE_DIR: dir,
      MATTERMOST_WEBHOOK_URL: `http://127.0.0.1:${port}/hooks/inbox`,
    });
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 10000, String(elapsed));
    assert.equal(result.code, 0, result.stderr);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].username, 'Fake Google feed (TEST)');
    assert.match(hits[0].text, /@watcher/);
    assert.match(hits[0].text, /Stars: 2/);
    assert.match(hits[0].text, /table 12/);
    assert.match(hits[0].text, /Review id: rev-legit/);
    assert.match(hits[0].text, /TEST DATA/);
    const store = JSON.parse(await readFile(path.join(dir, 'reviews.json'), 'utf8'));
    assert.equal(store.test_data, true);
    assert.equal(store.reviews['rev-legit'].starRating, 'TWO');
  } finally {
    await new Promise((resolve, reject) => stub.close((err) => (err ? reject(err) : resolve())));
    await rm(dir, { recursive: true, force: true });
  }
});

test('inject-review without a webhook prints the payload and exits 0', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'review-room-print-'));
  const env = { STATE_DIR: dir, MATTERMOST_WEBHOOK_URL: '' };
  const result = await runNode(['bin/inject-review', '--case', 'not-legit'], env);
  try {
    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.username, 'Fake Google feed (TEST)');
    assert.match(payload.text, /@watcher/);
    assert.match(payload.text, /TEST DATA/);
    const store = JSON.parse(await readFile(path.join(dir, 'reviews.json'), 'utf8'));
    assert.equal(store.reviews['rev-not-legit'].starRating, 'ONE');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('staff-sim posts the labeled reply to a stub', async () => {
  const hits = [];
  const stub = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      hits.push({
        url: req.url,
        authorization: req.headers.authorization,
        body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
      });
      res.writeHead(201);
      res.end('{}');
    });
  });
  const port = await listen(stub);
  const replies = JSON.parse(readFileSync(path.join(repoRoot(), 'data/staff-replies.json'), 'utf8'));
  const canned = replies.replies['not-legit'].Sally;
  try {
    const result = await runNode(
      ['bin/staff-sim', '--case', 'not-legit', '--name', 'Sally', '--channel', 'chan-test'],
      {
        MATTERMOST_URL: `http://127.0.0.1:${port}`,
        MM_TOKEN_SALLY: 'token-sally',
      },
    );
    assert.equal(result.code, 0, result.stderr);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].url, '/api/v4/posts');
    assert.equal(hits[0].authorization, 'Bearer token-sally');
    assert.equal(hits[0].body.channel_id, 'chan-test');
    assert.equal(hits[0].body.message, `simulated staff reply (TEST): ${canned}`);
  } finally {
    await new Promise((resolve, reject) => stub.close((err) => (err ? reject(err) : resolve())));
  }
});

test('staff-sim without MATTERMOST_URL prints the post', async () => {
  const result = await runNode(
    ['bin/staff-sim', '--case', 'legit', '--name', 'Troy', '--channel', 'chan-print'],
    { MATTERMOST_URL: '' },
  );
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.channel_id, 'chan-print');
  assert.match(payload.message, /^simulated staff reply \(TEST\): /);
  assert.match(payload.message, /table 12/i);
});
