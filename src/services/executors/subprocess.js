/**
 * Shared subprocess utilities for language executors.
 * All interpreted-language executors use runScript() to spin up a one-shot
 * subprocess, write a self-contained script file, and parse JSON from stdout.
 *
 * Security note: these subprocess executors provide NO OS-level sandboxing.
 * They rely solely on the static token validation in each language executor.
 * For production use with untrusted operators, consider running inside a
 * container or using OS-level restriction (seccomp, gVisor, etc.).
 */

import { execFile } from 'node:child_process';
import { writeFile, rm, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Write `script` to a temp file, run `cmd [...cmdArgs, file]`, parse JSON stdout.
 *
 * @param {object} opts
 * @param {string}   opts.script      - full script content to write
 * @param {string}   opts.cmd         - interpreter binary (e.g. 'python3', 'php')
 * @param {string[]} opts.cmdArgs     - arguments that come BEFORE the file path
 * @param {string}   opts.extension   - file extension (no leading dot)
 * @param {string}   [opts.filename]  - override the default 'transform.<ext>' filename
 * @param {number}   [opts.timeoutMs] - subprocess timeout in ms (default 10 000)
 * @returns {Promise<unknown>} parsed JSON result
 */
export async function runScript({ script, cmd, cmdArgs = [], extension, filename, timeoutMs = 10_000 }) {
  const dir = await mkdtemp(join(tmpdir(), 'hooksmith-'));
  const file = join(dir, filename ?? `transform.${extension}`);
  try {
    await writeFile(file, script, 'utf8');
    const { stdout, stderr } = await execFileAsync(cmd, [...cmdArgs, file], {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 // 1 MB stdout cap
    });
    const output = stdout.trim();
    if (!output) {
      const hint = stderr?.trim() ? `: ${stderr.trim().slice(0, 300)}` : '';
      throw new Error(`Executor produced no output${hint}`);
    }
    try {
      return JSON.parse(output);
    } catch {
      throw new Error(`Executor output is not valid JSON: ${output.slice(0, 200)}`);
    }
  } catch (err) {
    if (err.code === 'ETIMEDOUT') throw new Error(`Transformation timed out after ${timeoutMs} ms`);
    throw err;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Encode an arbitrary JS value as base64 JSON.
 * Used by all subprocess executors to embed payload data safely.
 */
export function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}
