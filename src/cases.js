import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { REVIEW_ID, repoRoot, starsToEnum } from './store.js';

const CASES = new Set(['not-legit', 'legit']);

export async function readJson(rel) {
  const file = path.join(repoRoot(), rel);
  let data;
  try {
    data = JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error(`missing ${rel}`);
    throw new Error(`invalid ${rel}`);
  }
  if (!data || data.test_data !== true) throw new Error(`${rel} missing test_data`);
  return data;
}

export async function loadCase(name) {
  if (!CASES.has(name)) throw new Error('case must be not-legit or legit');
  const data = await readJson(`data/cases/${name}.json`);
  if (typeof data.review_id !== 'string' || !REVIEW_ID.test(data.review_id)) {
    throw new Error(`case ${name} has a bad review_id`);
  }
  if (typeof data.comment !== 'string' || data.comment.length === 0) {
    throw new Error(`case ${name} is missing a comment`);
  }
  if (typeof data.reviewer !== 'string' || data.reviewer.length === 0) {
    throw new Error(`case ${name} is missing a reviewer`);
  }
  if (typeof data.posted_at !== 'string' || data.posted_at.length === 0) {
    throw new Error(`case ${name} is missing posted_at`);
  }
  starsToEnum(data.stars);
  return data;
}
