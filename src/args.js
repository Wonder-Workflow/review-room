export function parseArgs(argv) {
  const out = {};
  let i = 0;
  while (i < argv.length) {
    const key = argv[i];
    if (!key.startsWith('--') || key === '--') throw new Error(`unknown argument ${key}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${key}`);
    out[key.slice(2)] = value;
    i += 2;
  }
  return out;
}

export function rejectUnknown(args, allowed) {
  for (const key of Object.keys(args)) {
    if (!allowed.has(key)) throw new Error(`unknown argument --${key}`);
  }
}
