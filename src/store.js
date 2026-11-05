import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REVIEW_ID = /^[A-Za-z0-9_-]+$/;
export const STAR_NUMBER = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
export const REPORT_STATUS = 'Decision pending (simulated)';

const STAR_BY_NUMBER = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];

const DOCS = {
  reviews: 'reviews.json',
  replies: 'replies.json',
  reports: 'reports.json',
};

export function repoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function resolveStateDir() {
  if (process.env.STATE_DIR) return path.resolve(process.env.STATE_DIR);
  return path.join(repoRoot(), 'data', 'state');
}

export function starsToEnum(value) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    throw new Error('stars must be an integer from 1 to 5');
  }
  return STAR_BY_NUMBER[n];
}

export function starLabel(starRating) {
  const n = STAR_NUMBER[starRating];
  if (!n) return String(starRating);
  return n === 1 ? '1 star' : `${n} stars`;
}

export async function ensureStateDir(dir = resolveStateDir()) {
  await mkdir(dir, { recursive: true });
  return dir;
}

async function readDoc(dir, key) {
  const name = DOCS[key];
  try {
    const data = JSON.parse(await readFile(path.join(dir, name), 'utf8'));
    if (!isDoc(data, key)) throw new Error(`${name} is not a test_data store`);
    return data;
  } catch (err) {
    if (err.code === 'ENOENT') return { test_data: true, [key]: {} };
    throw err;
  }
}

function isDoc(data, key) {
  return Boolean(data)
    && data.test_data === true
    && data[key]
    && typeof data[key] === 'object'
    && !Array.isArray(data[key]);
}

async function saveDoc(dir, key, value) {
  const name = DOCS[key];
  const file = path.join(dir, name);
  const tmp = path.join(dir, `.${name}.${process.pid}.tmp`);
  await mkdir(dir, { recursive: true });
  await writeFile(tmp, `${JSON.stringify({ test_data: true, [key]: value }, null, 2)}\n`);
  await rename(tmp, file);
}

export async function loadState(dir = resolveStateDir()) {
  const [reviewsDoc, repliesDoc, reportsDoc] = await Promise.all([
    readDoc(dir, 'reviews'),
    readDoc(dir, 'replies'),
    readDoc(dir, 'reports'),
  ]);
  return {
    reviews: reviewsDoc.reviews,
    replies: repliesDoc.replies,
    reports: reportsDoc.reports,
  };
}

function compose(state, id) {
  const review = state.reviews[id];
  if (!review) return null;
  const copy = { ...review };
  if (state.replies[id]) copy.reviewReply = state.replies[id];
  if (state.reports[id]) copy.report = state.reports[id];
  return copy;
}

export async function listReviews() {
  const state = await loadState();
  return Object.keys(state.reviews).sort().map((id) => compose(state, id));
}

export async function getReview(id) {
  const state = await loadState();
  return compose(state, id);
}

export async function listReports() {
  const state = await loadState();
  return Object.keys(state.reports).sort().map((id) => state.reports[id]);
}

export async function getReport(id) {
  const state = await loadState();
  return state.reports[id] || null;
}

export async function clearRuntimeState(dir = resolveStateDir()) {
  await mkdir(dir, { recursive: true });
  await Promise.all(Object.values(DOCS).map((name) => rm(path.join(dir, name), { force: true })));
}

export async function upsertReview(review) {
  const dir = resolveStateDir();
  const { reviews } = await loadState(dir);
  reviews[review.reviewId] = review;
  await saveDoc(dir, 'reviews', reviews);
  return review;
}

async function requireReview(dir, id) {
  const state = await loadState(dir);
  if (!state.reviews[id]) {
    const err = new Error('review not found');
    err.status = 404;
    throw err;
  }
  return state;
}

export async function setReply(id, reply) {
  const dir = resolveStateDir();
  const state = await requireReview(dir, id);
  state.replies[id] = reply;
  await saveDoc(dir, 'replies', state.replies);
  return reply;
}

export async function clearReply(id) {
  const dir = resolveStateDir();
  const state = await requireReview(dir, id);
  delete state.replies[id];
  await saveDoc(dir, 'replies', state.replies);
}

export async function setReport(id, fields) {
  const dir = resolveStateDir();
  const state = await requireReview(dir, id);
  const report = {
    test_data: true,
    reviewId: id,
    reason: fields.reason,
    policy_quote: fields.policy_quote,
    evidence_summary: fields.evidence_summary,
    status: REPORT_STATUS,
  };
  state.reports[id] = report;
  await saveDoc(dir, 'reports', state.reports);
  return report;
}
