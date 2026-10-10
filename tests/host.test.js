const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const compiler = 'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe';
const root = path.join(__dirname, '..');
const output = path.join(root, 'native-host', 'bin');
const binary = path.join(output, 'ExamForegroundHost.exe');

test('Windows host compiles, frames category-only messages, and stops cleanly',
  { skip: process.platform !== 'win32' }, async () => {
    mkdirSync(output, { recursive: true });
    const build = spawnSync(compiler, [
      '/nologo', '/target:exe', `/out:${binary}`, '/reference:System.Web.Extensions.dll',
      path.join(root, 'native-host', 'ExamForegroundHost.cs')
    ], { encoding: 'utf8' });
    assert.equal(build.status, 0, build.stderr || build.stdout);

    const host = spawn(binary, ['chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/'],
      { stdio: ['pipe', 'pipe', 'pipe'] });
    const frames = [];
    let bytes = Buffer.alloc(0);
    host.stdout.on('data', chunk => {
      bytes = Buffer.concat([bytes, chunk]);
      while (bytes.length >= 4 && bytes.length >= 4 + bytes.readUInt32LE(0)) {
        const length = bytes.readUInt32LE(0);
        frames.push(JSON.parse(bytes.subarray(4, 4 + length).toString('utf8')));
        bytes = bytes.subarray(4 + length);
      }
    });
    await Promise.race([
      new Promise(resolve => {
        if (frames.some(frame => frame.kind === 'FOREGROUND_CHANGED')) return resolve();
        const onData = () => {
          if (!frames.some(frame => frame.kind === 'FOREGROUND_CHANGED')) return;
          host.stdout.off('data', onData);
          resolve();
        };
        host.stdout.on('data', onData);
      }),
      new Promise((_, reject) => setTimeout(() => reject(Error('Native host sent no foreground category')), 3000))
    ]);
    const stop = Buffer.from('{"kind":"STOP"}', 'utf8');
    const header = Buffer.alloc(4);
    header.writeUInt32LE(stop.length);
    host.stdin.write(Buffer.concat([header, stop]));
    const exitCode = await Promise.race([
      new Promise(resolve => host.once('exit', resolve)),
      new Promise((_, reject) => setTimeout(() => reject(Error('Native host did not stop')), 3000))
    ]);
    assert.equal(exitCode, 0);
    assert.equal(bytes.length, 0);
    assert.equal(frames[0].kind, 'READY');
    assert.ok(frames.some(frame => frame.kind === 'FOREGROUND_CHANGED'));
    for (const frame of frames) {
      assert.match(frame.timestamp, /^\d{4}-\d{2}-\d{2}T/);
      assert.deepEqual(Object.keys(frame).sort(), frame.kind === 'READY'
        ? ['kind', 'timestamp'] : ['appCategory', 'kind', 'timestamp']);
      if (frame.kind === 'FOREGROUND_CHANGED') {
        assert.ok(['WORD', 'NOTEPAD', 'PDF_READER', 'OTHER'].includes(frame.appCategory));
      }
    }
  });
