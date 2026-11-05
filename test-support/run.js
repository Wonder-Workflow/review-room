import { spawn } from 'node:child_process';
import { repoRoot } from '../src/store.js';

export function runNode(args, env, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const childEnv = { ...process.env, ...env };
    for (const [key, value] of Object.entries(childEnv)) {
      if (value == null) delete childEnv[key];
    }
    const child = spawn(process.execPath, args, {
      cwd: repoRoot(),
      env: childEnv,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`timed out after ${timeoutMs}ms\n${stdout}\n${stderr}`));
    }, timeoutMs);
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr });
    });
  });
}

export { repoRoot };
