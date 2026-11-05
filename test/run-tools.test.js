import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import http from 'node:http';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { repoRoot, runNode } from '../test-support/run.js';

const root = repoRoot();
const fakeMmctl = path.join(root, 'test-support', 'fake-mmctl.js');

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function sha(file) {
  return createHash('sha256').update(file).digest('hex');
}

async function seedHashes() {
  const names = ['data/restaurant.json', 'data/cases/not-legit.json', 'data/cases/legit.json', 'data/staff.json'];
  const out = {};
  for (const name of names) out[name] = sha(await readFile(path.join(root, name)));
  return out;
}

test('reset clears runtime files and leaves seed data', async () => {
  const before = await seedHashes();
  const dir = await mkdtemp(path.join(tmpdir(), 'review-room-reset-'));
  await writeFile(path.join(dir, 'reviews.json'), '{"test_data":true,"reviews":{"rev-not-legit":{}}}\n');
  await writeFile(path.join(dir, 'replies.json'), '{"test_data":true,"replies":{}}\n');
  await writeFile(path.join(dir, 'reports.json'), '{"test_data":true,"reports":{}}\n');
  await writeFile(path.join(dir, 'notes.txt'), 'keep');
  try {
    const once = await runNode(['bin/reset'], { STATE_DIR: dir });
    assert.equal(once.code, 0, once.stderr);
    assert.match(once.stdout, /cleared runtime state/);
    await assert.rejects(readFile(path.join(dir, 'reviews.json')));
    await assert.rejects(readFile(path.join(dir, 'replies.json')));
    await assert.rejects(readFile(path.join(dir, 'reports.json')));
    assert.equal(await readFile(path.join(dir, 'notes.txt'), 'utf8'), 'keep');
    const twice = await runNode(['bin/reset'], { STATE_DIR: dir });
    assert.equal(twice.code, 0, twice.stderr);
    const after = await seedHashes();
    assert.deepEqual(after, before);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('staff-sim --all looks up rooms by name and posts every reply', async () => {
  const hits = [];
  const stub = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const match = url.pathname.match(/^\/api\/v4\/teams\/name\/([^/]+)\/channels\/name\/([^/]+)$/);
    if (req.method === 'GET' && match) {
      const name = decodeURIComponent(match[2]);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: `id-${name}`, name }));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/v4/posts') {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        hits.push({
          authorization: req.headers.authorization,
          body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
        });
        res.writeHead(201);
        res.end('{}');
      });
      return;
    }
    res.writeHead(404);
    res.end('{}');
  });
  const port = await listen(stub);
  try {
    const result = await runNode(['bin/staff-sim', '--all', '--case', 'not-legit'], {
      MATTERMOST_URL: `http://127.0.0.1:${port}`,
      MM_TEAM: 'review-room-test',
      MM_TOKEN_SALLY: 'token-sally',
      MM_TOKEN_DAVID: 'token-david',
      MM_TOKEN_CINDI: 'token-cindi',
      MM_TOKEN_TROY: 'token-troy',
    });
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(hits.map((hit) => hit.body.channel_id), [
      'id-review-rev-not-legit-sally',
      'id-review-rev-not-legit-david',
      'id-review-rev-not-legit-cindi',
      'id-review-rev-not-legit-troy',
    ]);
    assert.deepEqual(hits.map((hit) => hit.authorization), [
      'Bearer token-sally',
      'Bearer token-david',
      'Bearer token-cindi',
      'Bearer token-troy',
    ]);
    assert.match(hits[0].body.message, /^simulated staff reply \(TEST\): /);
    assert.match(hits[0].body.message, /lobster/i);
  } finally {
    await new Promise((resolve, reject) => stub.close((err) => (err ? reject(err) : resolve())));
  }
});

test('staff-sim --all posts nothing when a room is missing', async () => {
  const hits = [];
  const stub = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'POST') hits.push(url.pathname);
    res.writeHead(404);
    res.end('{}');
  });
  const port = await listen(stub);
  try {
    const result = await runNode(['bin/staff-sim', '--all', '--case', 'legit'], {
      MATTERMOST_URL: `http://127.0.0.1:${port}`,
      MM_TEAM: 'review-room-test',
      MM_TOKEN_SALLY: 'token-sally',
      MM_TOKEN_DAVID: 'token-david',
      MM_TOKEN_CINDI: 'token-cindi',
      MM_TOKEN_TROY: 'token-troy',
    });
    assert.equal(result.code, 1);
    assert.match(result.stderr, /no room review-rev-legit-sally/);
    assert.deepEqual(hits, []);
  } finally {
    await new Promise((resolve, reject) => stub.close((err) => (err ? reject(err) : resolve())));
  }
});

test('staff-sim --all without Mattermost prints room names', async () => {
  const result = await runNode(['bin/staff-sim', '--all', '--case', 'legit'], { MATTERMOST_URL: '' });
  assert.equal(result.code, 0, result.stderr);
  const posts = JSON.parse(result.stdout);
  assert.deepEqual(posts.map((post) => post.channel_id), [
    'review-rev-legit-sally',
    'review-rev-legit-david',
    'review-rev-legit-cindi',
    'review-rev-legit-troy',
  ]);
  for (const post of posts) assert.match(post.message, /table 12/i);
});

test('export-transcript writes json and markdown for named rooms', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'review-room-export-'));
  const out = path.join(dir, 'out');
  const postsByChannel = {
    'review-rev-not-legit': [
      { id: 'p2', create_at: 2_000, user_id: 'manager-test', message: 'verdict: not legit' },
      { id: 'p1', create_at: 1_000, message: 'Step 1 of 5: review received', props: { override_username: 'Fake Google feed (TEST)' } },
    ],
    'review-rev-not-legit-sally': [
      { id: 'p3', create_at: 3_000, user_id: 'sally-test', message: 'simulated staff reply (TEST): Kitchen closed at 10.' },
    ],
  };
  const stub = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname.startsWith('/api/')) assert.equal(req.headers.authorization, 'Bearer manager-token');
    const byName = url.pathname.match(/^\/api\/v4\/teams\/name\/([^/]+)\/channels\/name\/([^/]+)$/);
    if (req.method === 'GET' && byName) {
      const name = decodeURIComponent(byName[2]);
      if (name === 'review-rev-not-legit-troy') {
        res.writeHead(404);
        res.end('{}');
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: `id-${name}`, name }));
      return;
    }
    const postList = url.pathname.match(/^\/api\/v4\/channels\/([^/]+)\/posts$/);
    if (req.method === 'GET' && postList) {
      assert.equal(url.searchParams.get('per_page'), '200');
      const name = decodeURIComponent(postList[1]).replace(/^id-/, '');
      const posts = postsByChannel[name] || [];
      const body = { order: posts.map((post) => post.id), posts: Object.fromEntries(posts.map((post) => [post.id, post])) };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/v4/channels/abcdefghijklmnopqrstuvwxyz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: 'abcdefghijklmnopqrstuvwxyz', name: 'reviews-inbox' }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v4/accounts/test/locations/test/reviews') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        test_data: true,
        reviews: [{
          reviewId: 'rev-not-legit',
          starRating: 'ONE',
          reviewReply: { comment: 'Thanks for the note. (TEST)' },
          report: { status: 'Decision pending (simulated)' },
        }],
      }));
      return;
    }
    res.writeHead(404);
    res.end('{}');
  });
  const port = await listen(stub);
  const base = `http://127.0.0.1:${port}`;
  try {
    const result = await runNode([
      'bin/export-transcript',
      '--review', 'rev-not-legit',
      '--channel', 'abcdefghijklmnopqrstuvwxyz',
      '--out', out,
    ], {
      MATTERMOST_URL: base,
      MM_TOKEN_MANAGER: 'manager-token',
      MM_TEAM: 'review-room-test',
      FAKE_SERVICE_URL: base,
    });
    assert.equal(result.code, 0, result.stderr);
    const doc = JSON.parse(await readFile(path.join(out, 'transcript.json'), 'utf8'));
    assert.equal(doc.test_data, true);
    assert.equal(doc.state_source, 'http');
    assert.equal(doc.state.reviews[0].report.status, 'Decision pending (simulated)');
    assert.deepEqual(doc.channels.map((channel) => channel.name), [
      'review-rev-not-legit',
      'review-rev-not-legit-sally',
      'review-rev-not-legit-david',
      'review-rev-not-legit-cindi',
      'review-rev-not-legit-troy',
      'reviews-inbox',
    ]);
    assert.equal(doc.channels[0].posts[0].id, 'p1');
    assert.equal(doc.channels[0].posts[1].id, 'p2');
    assert.equal(doc.channels[4].missing, true);
    assert.equal(doc.channels[5].id, 'abcdefghijklmnopqrstuvwxyz');
    const markdown = await readFile(path.join(out, 'transcript.md'), 'utf8');
    assert.match(markdown, /# Transcript \(TEST DATA\)/);
    assert.match(markdown, /Fake Google feed \(TEST\)\. Step 1 of 5: review received/);
    assert.match(markdown, /manager-test\. verdict: not legit/);
    assert.match(markdown, /No posts\. The room was not found\./);
    assert.match(markdown, /rev-not-legit\. 1 star\. reply posted\. Decision pending \(simulated\)\./);
    const index = markdown.indexOf('Step 1 of 5');
    assert.ok(index !== -1 && index < markdown.indexOf('verdict: not legit'));
  } finally {
    await new Promise((resolve, reject) => stub.close((err) => (err ? reject(err) : resolve())));
    await rm(dir, { recursive: true, force: true });
  }
});

test('export-transcript keeps a file and exits 1 when the case room is missing', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'review-room-export-miss-'));
  const out = path.join(dir, 'out');
  const stub = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/v4/accounts/test/locations/test/reviews') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"test_data":true,"reviews":[]}');
      return;
    }
    res.writeHead(404);
    res.end('{}');
  });
  const port = await listen(stub);
  try {
    const result = await runNode([
      'bin/export-transcript',
      '--review', 'rev-legit',
      '--out', out,
    ], {
      MATTERMOST_URL: `http://127.0.0.1:${port}`,
      MM_TOKEN_MANAGER: 'manager-token',
      MM_TEAM: 'review-room-test',
      FAKE_SERVICE_URL: `http://127.0.0.1:${port}`,
    });
    assert.equal(result.code, 1, result.stdout);
    assert.match(result.stderr, /no room review-rev-legit/);
    const doc = JSON.parse(await readFile(path.join(out, 'transcript.json'), 'utf8'));
    assert.equal(doc.channels[0].missing, true);
  } finally {
    await new Promise((resolve, reject) => stub.close((err) => (err ? reject(err) : resolve())));
    await rm(dir, { recursive: true, force: true });
  }
});

test('inject-review reads the webhook from a dotenv file', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'review-room-dotenv-'));
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
  const envFile = path.join(dir, 'local.env');
  await writeFile(envFile, `MATTERMOST_WEBHOOK_URL=http://127.0.0.1:${port}/hooks/from-env\n`);
  try {
    const result = await runNode(['bin/inject-review', '--case', 'not-legit'], {
      STATE_DIR: dir,
      DOTENV_FILE: envFile,
      MATTERMOST_WEBHOOK_URL: null,
    });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(hits.length, 1);
    assert.match(hits[0].text, /Review id: rev-not-legit/);
  } finally {
    await new Promise((resolve, reject) => stub.close((err) => (err ? reject(err) : resolve())));
    await rm(dir, { recursive: true, force: true });
  }
});

function runBash(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', args, { cwd: root, env: { ...process.env, ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('exit', (code) => resolve({ code, stdout, stderr }));
    child.on('error', reject);
  });
}

test('setup-mattermost-test is idempotent and keeps secrets in the env file', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'review-room-mm-'));
  const envFile = path.join(dir, '.env');
  const statePath = path.join(dir, 'mm.json');
  await writeFile(statePath, `${JSON.stringify({
    log: [], config: {}, users: [], teams: [], channels: [], tokens: [], webhooks: [],
  })}\n`);
  const env = {
    MMCTL: `node ${fakeMmctl}`,
    MMCTL_STATE: statePath,
    MATTERMOST_URL: null,
    MM_TEAM: null,
    MM_CONTAINER: null,
  };
  const args = [
    'bin/setup-mattermost-test',
    '--container', 'mm-test',
    '--team', 'case-team',
    '--url', 'http://127.0.0.1:45065',
    '--env-file', envFile,
  ];
  try {
    const first = await runBash(args, env);
    assert.equal(first.code, 0, first.stderr);
    const saved = JSON.parse(await readFile(envFile, 'utf8').then((text) => {
      const out = {};
      for (const line of text.split('\n')) {
        if (!line) continue;
        const eq = line.indexOf('=');
        out[line.slice(0, eq)] = line.slice(eq + 1);
      }
      return JSON.stringify(out);
    }));
    assert.equal(saved.MM_CONTAINER, 'mm-test');
    assert.equal(saved.MM_TEAM, 'case-team');
    assert.equal(saved.MATTERMOST_URL, 'http://127.0.0.1:45065');
    assert.equal(saved.MM_USER_SALLY, 'sally-test');
    assert.equal(saved.MM_USER_MANAGER, 'manager-test');
    assert.match(saved.MM_PASS_SALLY, /^Aa1!/);
    assert.equal(saved.MM_TOKEN_MANAGER, 'a'.repeat(26));
    assert.equal(saved.MM_TOKEN_SALLY, 'b'.repeat(26));
    assert.equal(saved.MM_TOKEN_TROY, 'e'.repeat(26));
    assert.equal(saved.MATTERMOST_WEBHOOK_URL, `http://127.0.0.1:45065/hooks/${'f'.repeat(26)}`);
    assert.equal(first.stdout.includes(saved.MM_PASS_SALLY), false);
    assert.equal(first.stdout.includes(saved.MM_TOKEN_SALLY), false);
    assert.equal(first.stdout.includes(saved.MATTERMOST_WEBHOOK_URL), false);
    const mode = (await stat(envFile)).mode & 0o777;
    assert.equal(mode, 0o600);

    const state = JSON.parse(await readFile(statePath, 'utf8'));
    assert.deepEqual(state.users.map((user) => user.username), [
      'manager-test', 'sally-test', 'david-test', 'cindi-test', 'troy-test',
    ]);
    assert.deepEqual(state.users.map((user) => user.email), state.users.map((user) => `${user.username}@example.test`));
    assert.equal(state.users[0].admin, true);
    assert.equal(state.users[1].admin, false);
    assert.equal(state.users[1].nickname, 'Sally (TEST staff)');
    assert.deepEqual(state.teams, ['case-team']);
    assert.equal(state.channels[0].name, 'reviews-inbox');
    assert.equal(state.webhooks[0].channel, 'case-team:reviews-inbox');
    assert.equal(state.webhooks[0].display, 'Fake Google feed (TEST)');
    assert.equal(state.tokens.length, 5);

    const second = await runBash(args, env);
    assert.equal(second.code, 0, second.stderr);
    assert.match(second.stdout, /exists sally-test/);
    assert.equal(second.stdout.includes('created sally-test'), false);
    assert.equal(second.stdout.includes('wrote MM_TOKEN_SALLY'), false);
    const again = JSON.parse(await readFile(statePath, 'utf8'));
    assert.equal(again.users.length, 5);
    assert.equal(again.webhooks.length, 1);
    assert.equal(again.tokens.length, 5);
    const reread = await readFile(envFile, 'utf8');
    assert.equal(reread.includes(`MM_PASS_SALLY=${saved.MM_PASS_SALLY}`), true);
    assert.equal(reread.includes(`MM_TOKEN_SALLY=${saved.MM_TOKEN_SALLY}`), true);

    const stripped = reread.replace(/^MM_TOKEN_SALLY=.*$/m, '');
    await writeFile(envFile, stripped);
    const third = await runBash(args, env);
    assert.equal(third.code, 0, third.stderr);
    assert.match(third.stdout, /wrote MM_TOKEN_SALLY/);
    const restored = await readFile(envFile, 'utf8');
    assert.match(restored, new RegExp(`^MM_TOKEN_SALLY=${'b'.repeat(26)}$`, 'm'));
    const finalState = JSON.parse(await readFile(statePath, 'utf8'));
    assert.equal(finalState.tokens.filter((token) => token.username === 'sally-test').length, 2);
    assert.equal(finalState.users.length, 5);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('setup-mattermost-test rejects a non-local url before calling mmctl', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'review-room-mm-bad-'));
  const statePath = path.join(dir, 'mm.json');
  await writeFile(statePath, '{"log":[],"config":{},"users":[],"teams":[],"channels":[],"tokens":[],"webhooks":[]}\n');
  try {
    const result = await runBash([
      'bin/setup-mattermost-test',
      '--url', 'https://mattermost.example.test',
      '--env-file', path.join(dir, '.env'),
    ], {
      MMCTL: `node ${fakeMmctl}`,
      MMCTL_STATE: statePath,
    });
    assert.equal(result.code, 1);
    assert.match(result.stderr, /local/);
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    assert.deepEqual(state.log, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
