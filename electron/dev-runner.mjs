#!/usr/bin/env node
/**
 * Electron dev launcher script.
 * Waits for the Vite dev server to be ready, then starts Electron.
 * Usage: node electron/dev-runner.mjs
 */

import { spawn } from 'child_process';
import { createServer } from 'net';

const VITE_PORT = 5173;
const MAX_WAIT_MS = 30_000;
const POLL_INTERVAL_MS = 300;

function waitForPort(port, timeout) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    const tryConnect = () => {
      const sock = createServer();
      sock.once('error', () => {
        if (Date.now() > deadline) {
          reject(new Error(`Timed out waiting for port ${port}`));
        } else {
          setTimeout(tryConnect, POLL_INTERVAL_MS);
        }
      });
      // Actually try to connect, not create server
      const client = new (await import('net')).Socket();
      client.connect(port, '127.0.0.1', () => {
        client.destroy();
        resolve();
      });
      client.on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error(`Timed out waiting for port ${port}`));
        } else {
          setTimeout(tryConnect, POLL_INTERVAL_MS);
        }
      });
    };
    tryConnect();
  });
}

async function main() {
  console.log('⚡ Starting Vite dev server...');

  const vite = spawn('npx', ['vite'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  console.log(`⏳ Waiting for Vite on port ${VITE_PORT}...`);

  // Simple port poll
  const start = Date.now();
  await new Promise((resolve, reject) => {
    const { Socket } = await import('net');
    const poll = () => {
      const s = new Socket();
      s.setTimeout(500);
      s.connect(VITE_PORT, '127.0.0.1', () => {
        s.destroy();
        resolve();
      });
      s.on('error', () => {
        s.destroy();
        if (Date.now() - start > MAX_WAIT_MS) {
          reject(new Error('Vite did not start in time'));
        } else {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      });
      s.on('timeout', () => {
        s.destroy();
        setTimeout(poll, POLL_INTERVAL_MS);
      });
    };
    poll();
  });

  console.log('✅ Vite ready. Starting Electron...');

  const electron = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  electron.on('close', (code) => {
    vite.kill();
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    vite.kill();
    electron.kill();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
