export function parseArgs(argv, options = {}) {
  const flags = options.flags || new Set();
  const lists = options.lists || new Set();
  const out = {};
  let i = 0;
  while (i < argv.length) {
    const key = argv[i];
    if (!key.startsWith('--') || key === '--') throw new Error(`unknown argument ${key}`);
    const name = key.slice(2);
    if (name.length === 0) throw new Error(`unknown argument ${key}`);
    if (flags.has(name)) {
      out[name] = true;
      i += 1;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${key}`);
    if (lists.has(name)) {
      if (!out[name]) out[name] = [];
      out[name].push(value);
    } else {
      out[name] = value;
    }
    i += 2;
  }
  return out;
}

export function rejectUnknown(args, allowed) {
  for (const key of Object.keys(args)) {
    if (!allowed.has(key)) throw new Error(`unknown argument --${key}`);
  }
}
