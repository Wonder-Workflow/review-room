import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');

function readJson(rel) {
  return JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
}

function filesUnder(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'state') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...filesUnder(full));
    else found.push(full);
  }
  return found;
}

function clockMinutes(stated) {
  const match = stated.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
  assert.ok(match, stated);
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (match[3] === 'PM' && hour !== 12) hour += 12;
  if (match[3] === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function hhmmMinutes(hhmm) {
  const [hour, minute] = hhmm.split(':').map(Number);
  return hour * 60 + minute;
}

test('every data file carries the TEST DATA mark', () => {
  const files = filesUnder(dataDir);
  assert.ok(files.length >= 6);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    if (file.endsWith('.json')) {
      assert.equal(JSON.parse(text).test_data, true, file);
    } else if (file.endsWith('.csv')) {
      assert.equal(text.startsWith('# TEST DATA\n'), true, file);
    } else {
      assert.fail(`unmarked data file ${file}`);
    }
  }
});

test('the close shift is exactly Sally, David, Cindi, and Troy', () => {
  const restaurant = readJson('data/restaurant.json');
  const staff = readJson('data/staff.json');
  const notLegit = readJson('data/cases/not-legit.json');
  const legit = readJson('data/cases/legit.json');
  assert.equal(notLegit.service_date, legit.service_date);
  assert.equal(notLegit.shift, legit.shift);
  assert.match(restaurant.name, /\(TEST\)/);
  assert.equal(restaurant.hours.kitchen_close_label, '10:00 PM');

  const lines = readFileSync(path.join(dataDir, 'schedule.csv'), 'utf8').trim().split('\n');
  assert.equal(lines[0], '# TEST DATA');
  assert.equal(lines[1], 'date,shift,role,name,start,end');
  const rows = lines.slice(2).map((line) => {
    const [date, shift, role, name, start, end] = line.split(',');
    return { date, shift, role, name, start, end };
  });
  const onShift = rows.filter((row) => row.date === notLegit.service_date && row.shift === notLegit.shift);
  assert.deepEqual(onShift.map((row) => row.name).sort(), ['Cindi', 'David', 'Sally', 'Troy']);
  for (const row of onShift) {
    assert.equal(row.start, '16:00');
    assert.equal(row.end, restaurant.hours.restaurant_close);
  }

  for (const person of staff.people) assert.match(person.name, /^[A-Z][a-z]+$/);
  const off = staff.people.filter((person) => person.on_case_shift === false);
  assert.ok(off.length >= 2);
  const onNames = new Set(onShift.map((row) => row.name));
  for (const person of off) assert.equal(onNames.has(person.name), false);
  for (const person of off) {
    assert.ok(rows.some((row) => row.name === person.name && row.shift !== notLegit.shift));
  }
});

test('the not-legit visit is after kitchen close and the dish is not on the menu', () => {
  const restaurant = readJson('data/restaurant.json');
  const review = readJson('data/cases/not-legit.json');
  assert.equal(review.stars, 1);
  assert.equal(review.posted_at.slice(0, 10) === review.visit_local.slice(0, 10), false);
  assert.equal(review.comment.includes(review.visit_stated), true);
  assert.equal(review.comment.toLowerCase().includes(review.dish), true);
  const visitMinutes = clockMinutes(review.visit_stated);
  assert.equal(visitMinutes, hhmmMinutes(review.visit_local.slice(11, 16)));
  assert.ok(visitMinutes > hhmmMinutes(restaurant.hours.kitchen_close));
  const menuText = JSON.stringify(restaurant.menu).toLowerCase();
  assert.equal(menuText.includes('lobster'), false);
  assert.equal(JSON.stringify(restaurant).toLowerCase().includes('lobster'), false);
  for (const item of restaurant.menu) {
    assert.equal(item.name.toLowerCase().includes(review.dish), false);
  }
});

test('the legit case matches the waitlist record', () => {
  const review = readJson('data/cases/legit.json');
  const waitlist = readJson('data/waitlist.json');
  const rows = readFileSync(path.join(dataDir, 'schedule.csv'), 'utf8').trim().split('\n').slice(2);
  const shiftEnd = rows[0].split(',')[5];
  const visitMinutes = clockMinutes(review.visit_stated);
  assert.equal(visitMinutes, hhmmMinutes(review.visit_local.slice(11, 16)));
  assert.ok(visitMinutes >= hhmmMinutes('16:00') && visitMinutes < hhmmMinutes(shiftEnd));
  assert.equal(review.posted_at.slice(0, 10) === review.visit_local.slice(0, 10), false);
  assert.equal(review.comment.includes(review.visit_stated), true);
  assert.equal(review.comment.includes(String(review.table)), true);
  assert.equal(review.comment.includes(String(review.wait_minutes)), true);
  assert.equal(review.table, waitlist.table);
  assert.equal(review.wait_minutes, waitlist.actual_wait_minutes);
  assert.equal(review.visit_local, waitlist.seated_local);
  assert.equal(review.service_date, waitlist.service_date);
  assert.equal(waitlist.table, 12);
  assert.equal(waitlist.actual_wait_minutes, 40);
  assert.equal(review.comment.toLowerCase().includes('lobster'), false);

  const replies = readJson('data/staff-replies.json');
  assert.match(replies.replies['not-legit'].Sally, /Kitchen closed at 10/);
  assert.match(replies.replies['not-legit'].Sally, /lobster/i);
  for (const name of ['Sally', 'David', 'Cindi', 'Troy']) {
    assert.match(replies.replies.legit[name], /40/);
    assert.match(replies.replies.legit[name], /table 12/i);
    assert.match(replies.replies['not-legit'][name], /10/);
  }
});
