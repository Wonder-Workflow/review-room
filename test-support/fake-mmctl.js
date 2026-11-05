#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const statePath = process.env.MMCTL_STATE;
const state = JSON.parse(readFileSync(statePath, 'utf8'));
const args = process.argv.slice(2);
state.log.push(args);

const tokens = {
  'manager-test': 'a'.repeat(26),
  'sally-test': 'b'.repeat(26),
  'david-test': 'c'.repeat(26),
  'cindi-test': 'd'.repeat(26),
  'troy-test': 'e'.repeat(26),
};

function save() {
  writeFileSync(statePath, `${JSON.stringify(state)}\n`);
}

function flag(name) {
  const index = args.indexOf(name);
  if (index === -1 || args[index + 1] === undefined) {
    console.error(`missing ${name}`);
    save();
    process.exit(1);
  }
  return args[index + 1];
}

const command = args[0];
const action = args[1];

if (command === 'config' && action === 'set') {
  state.config[args[2]] = args[3];
  save();
  process.exit(0);
}

if (command === 'team' && action === 'list') {
  for (const name of state.teams) console.log(name);
  save();
  process.exit(0);
}

if (command === 'team' && action === 'create') {
  state.teams.push(flag('--name'));
  save();
  process.exit(0);
}

if (command === 'team' && action === 'users') {
  save();
  process.exit(0);
}

if (command === 'user' && action === 'search') {
  const name = args[2];
  if (state.users.some((user) => user.username === name)) console.log(`username: ${name}`);
  save();
  process.exit(0);
}

if (command === 'user' && action === 'create') {
  state.users.push({
    username: flag('--username'),
    email: flag('--email'),
    password: flag('--password'),
    nickname: flag('--nickname'),
    admin: args.includes('--system-admin'),
  });
  save();
  process.exit(0);
}

if (command === 'channel' && action === 'list') {
  const team = args[2];
  for (const channel of state.channels) {
    if (channel.team === team) console.log(channel.name);
  }
  save();
  process.exit(0);
}

if (command === 'channel' && action === 'create') {
  state.channels.push({ team: flag('--team'), name: flag('--name'), display: flag('--display-name') });
  save();
  process.exit(0);
}

if (command === 'webhook' && action === 'create-incoming') {
  const id = 'f'.repeat(26);
  state.webhooks.push({
    id,
    channel: flag('--channel'),
    user: flag('--user'),
    display: flag('--display-name'),
  });
  console.log(id);
  save();
  process.exit(0);
}

if (command === 'token' && action === 'generate') {
  const username = args[2];
  const id = tokens[username];
  if (!id) {
    console.error(`unknown user ${username}`);
    save();
    process.exit(1);
  }
  state.tokens.push({ username, description: args[3], id });
  console.log(id);
  save();
  process.exit(0);
}

console.error(`unknown mmctl ${args.join(' ')}`);
save();
process.exit(1);
