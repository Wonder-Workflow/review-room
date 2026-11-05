import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import {
  REVIEW_ID,
  STAR_NUMBER,
  clearReply,
  ensureStateDir,
  getReport,
  getReview,
  listReports,
  listReviews,
  repoRoot,
  setReply,
  setReport,
  starLabel,
} from './store.js';

const REVIEWS_PATH = '/v4/accounts/test/locations/test/reviews';

export function assertLoopback(host) {
  if (host !== '127.0.0.1') {
    const err = new Error(`refusing to bind ${host}; only 127.0.0.1 is allowed`);
    err.code = 'REFUSE_HOST';
    throw err;
  }
}

function send(res, status, body) {
  const payload = { ...body, test_data: true };
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
  });
  res.end(text);
}

function sendHtml(res, html) {
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'content-length': Buffer.byteLength(html),
  });
  res.end(html);
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) {
      const err = new Error('body too large');
      err.status = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readJsonBody(req) {
  const text = await readBody(req);
  if (text.trim() === '') return {};
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      const err = new Error('JSON object required');
      err.status = 400;
      throw err;
    }
    return body;
  } catch (err) {
    if (err.status) throw err;
    const invalid = new Error('invalid JSON');
    invalid.status = 400;
    throw invalid;
  }
}

function requireText(body, key) {
  const value = body[key];
  if (typeof value !== 'string' || value.trim() === '') {
    const err = new Error(`${key} is required`);
    err.status = 400;
    throw err;
  }
  return value;
}

function parseId(raw) {
  let id;
  try {
    id = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!REVIEW_ID.test(id)) return null;
  return id;
}

function averageRating(reviews) {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((total, review) => total + (STAR_NUMBER[review.starRating] || 0), 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

async function restaurantName() {
  try {
    const data = JSON.parse(await readFile(path.join(repoRoot(), 'data', 'restaurant.json'), 'utf8'));
    if (typeof data.name === 'string' && data.name.length > 0) return data.name;
  } catch {
    return 'Test restaurant (TEST)';
  }
  return 'Test restaurant (TEST)';
}

async function renderHome() {
  const [name, reviews, reports] = await Promise.all([
    restaurantName(),
    listReviews(),
    listReports(),
  ]);
  const reviewHtml = reviews.length === 0
    ? '<p>No reviews in the local store.</p>'
    : reviews.map((review) => {
      const reply = review.reviewReply
        ? `<p><strong>Reply.</strong> ${esc(review.reviewReply.comment)}</p>`
        : '<p class="meta">No reply.</p>';
      return `<article>
        <h2>${esc(starLabel(review.starRating))} from ${esc(review.reviewer?.displayName || 'Anonymous')}</h2>
        <p class="meta">Review id ${esc(review.reviewId)}</p>
        <p>${esc(review.comment)}</p>
        ${reply}
      </article>`;
    }).join('\n');
  const reportHtml = reports.length === 0
    ? '<p>No reports.</p>'
    : reports.map((report) => `<article>
        <h2>Report for ${esc(report.reviewId)}</h2>
        <p class="meta">${esc(report.status)}</p>
        <p><strong>Reason.</strong> ${esc(report.reason)}</p>
        <p><strong>Policy quote.</strong> ${esc(report.policy_quote)}</p>
        <p><strong>Evidence.</strong> ${esc(report.evidence_summary)}</p>
      </article>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)} reviews (TEST)</title>
<style>
  body { margin: 0; font: 16px/1.45 system-ui, sans-serif; background: #f4f1ea; color: #1c1917; }
  .banner { background: #9f1239; color: #fff; padding: 12px 16px; font-weight: 700; }
  main { max-width: 40rem; margin: 0 auto; padding: 16px; }
  article { background: #fff; border: 1px solid #e7e5e4; padding: 12px 14px; margin: 12px 0; }
  h1 { font-size: 1.35rem; }
  h2 { font-size: 1.05rem; }
  .meta { color: #57534e; }
  p { overflow-wrap: anywhere; }
</style>
</head>
<body>
  <p class="banner">TEST DATA, NOT GOOGLE</p>
  <main>
    <h1>${esc(name)}</h1>
    <h2>Reviews</h2>
    ${reviewHtml}
    <h2>Reports</h2>
    ${reportHtml}
  </main>
</body>
</html>
`;
}

async function route(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);

  if (pathname === '/') {
    if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
    return sendHtml(res, await renderHome());
  }

  if (pathname === REVIEWS_PATH) {
    if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
    const reviews = await listReviews();
    return send(res, 200, {
      reviews,
      averageRating: averageRating(reviews),
      totalReviewCount: reviews.length,
    });
  }

  if (pathname.startsWith(`${REVIEWS_PATH}/`)) {
    const rest = pathname.slice(REVIEWS_PATH.length + 1);
    if (rest.endsWith('/reply')) {
      const id = parseId(rest.slice(0, -'/reply'.length));
      if (!id) return send(res, 400, { error: 'bad review id' });
      if (req.method === 'PUT') {
        const body = await readJsonBody(req);
        const comment = requireText(body, 'comment');
        const reply = await setReply(id, { comment, updateTime: new Date().toISOString() });
        return send(res, 200, reply);
      }
      if (req.method === 'DELETE') {
        await clearReply(id);
        return send(res, 200, {});
      }
      return send(res, 405, { error: 'method not allowed' });
    }
    if (rest.includes('/')) return send(res, 404, { error: 'not found' });
    const id = parseId(rest);
    if (!id) return send(res, 400, { error: 'bad review id' });
    if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
    const review = await getReview(id);
    if (!review) return send(res, 404, { error: 'review not found' });
    return send(res, 200, review);
  }

  const reportMatch = pathname.match(/^\/fake\/reviews\/([^/]+)\/report$/);
  if (reportMatch) {
    const id = parseId(reportMatch[1]);
    if (!id) return send(res, 400, { error: 'bad review id' });
    if (req.method === 'GET') {
      const report = await getReport(id);
      if (!report) return send(res, 404, { error: 'report not found' });
      return send(res, 200, report);
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
    const body = await readJsonBody(req);
    const report = await setReport(id, {
      reason: requireText(body, 'reason'),
      policy_quote: requireText(body, 'policy_quote'),
      evidence_summary: requireText(body, 'evidence_summary'),
    });
    return send(res, 200, report);
  }

  return send(res, 404, { error: 'not found' });
}

function handle(req, res) {
  route(req, res).catch((err) => {
    if (res.headersSent) return;
    const status = err.status || 500;
    send(res, status, { error: status === 500 ? 'internal error' : err.message });
    if (status === 500) console.error(err);
  });
}

export async function start(options = {}) {
  const host = options.host ?? process.env.HOST ?? '127.0.0.1';
  const port = options.port ?? Number(process.env.PORT ?? 8787);
  assertLoopback(host);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('PORT must be an integer from 0 to 65535');
  }
  if (options.stateDir) process.env.STATE_DIR = options.stateDir;
  await ensureStateDir();
  const server = http.createServer(handle);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  return server;
}

function invokedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (invokedDirectly()) {
  start()
    .then((server) => {
      const { port } = server.address();
      console.log(`listening http://127.0.0.1:${port}`);
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
