const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const rules = require('../rules.js');
const desktop = require('../desktop.js');
const { buildReport } = require('../report.js');

const formUrl = 'https://docs.google.com/forms/d/e/demo/viewform';

function harness(stored = {}) {
  const listeners = {};
  const nativePorts = [];
  const tabs = new Map([[1, { id: 1, windowId: 7, active: true, url: formUrl }]]);
  const windows = new Map([[7, { id: 7, focused: true, state: 'normal' }]]);
  const event = name => ({ addListener(listener) { listeners[name] = listener; } });
  const chrome = {
    storage: { local: {
      async get(key) { return { [key]: structuredClone(stored[key]) }; },
      async set(value) { Object.assign(stored, structuredClone(value)); }
    } },
    tabs: {
      async get(id) { if (!tabs.has(id)) throw Error('Missing tab'); return tabs.get(id); },
      onActivated: event('activated'), onCreated: event('created'),
      onUpdated: event('updated'), onRemoved: event('removed')
    },
    windows: {
      async get(id) { if (!windows.has(id)) throw Error('Missing window'); return windows.get(id); },
      async update(id, changes) { Object.assign(windows.get(id), changes); return windows.get(id); },
      onFocusChanged: event('focusChanged'), onBoundsChanged: event('boundsChanged')
    },
    runtime: {
      getURL(file) { return `chrome-extension://demo/${file}`; },
      onMessage: event('message'),
      connectNative(name) {
        assert.equal(name, 'com.learningdar.exam_monitor');
        const handlers = {};
        const port = {
          onMessage: { addListener(listener) { handlers.message = listener; } },
          onDisconnect: { addListener(listener) { handlers.disconnect = listener; } },
          postMessage(message) { port.lastPosted = message; },
          disconnect() { handlers.disconnect?.(); },
          emit(message) { handlers.message(message); },
          drop() { handlers.disconnect(); }
        };
        nativePorts.push(port);
        return port;
      }
    }
  };
  const context = vm.createContext({
    chrome, crypto, URL, Date, Promise, Number, Set, console,
    setTimeout, clearTimeout, importScripts(...files) {
      for (const file of files) {
        vm.runInContext(readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
      }
    }
  });
  vm.runInContext(readFileSync(path.join(__dirname, '../background.js'), 'utf8'), context, { filename: 'background.js' });
  async function send(message, sender = {}) {
    return new Promise(resolve => listeners.message(message, sender, resolve));
  }
  async function flush() { await new Promise(resolve => setTimeout(resolve, 15)); }
  return { send, flush, tabs, windows, listeners, stored, nativePorts };
}

test('supported Form URLs and browser categories keep only hostnames', () => {
  assert.equal(rules.isSupportedFormUrl(`${formUrl}?usp=sharing`), true);
  assert.equal(rules.isSupportedFormUrl('https://docs.google.com/forms/d/demo/edit'), false);
  assert.equal(rules.classifyTabUrl('https://chatgpt.com/c/private').type, 'AI_SITE_OPENED');
  assert.equal(rules.classifyTabUrl('https://example.org/private/path?answer=1').hostname, 'example.org');
  assert.equal(rules.classifyTabUrl('https://example.org/guide.pdf?token=secret').type, 'PDF_OPENED');
  assert.equal(rules.classifyTabUrl('chrome://settings').hostname, null);
});

test('session lifecycle, classification, deduplication, privacy and end boundary', async () => {
  const h = harness();
  const before = await h.send({ kind: 'GET_STATUS' });
  assert.equal(before.result.incidents.length, 0);
  assert.equal((await h.send({ kind: 'START_EXAM', tabId: 1 })).ok, true);
  assert.equal((await h.send({ kind: 'START_EXAM', tabId: 1 })).ok, false);

  h.tabs.set(2, { id: 2, windowId: 7, active: true, url: 'https://chatgpt.com/c/private?message=secret' });
  h.tabs.get(1).active = false;
  h.listeners.activated({ tabId: 2 });
  h.listeners.activated({ tabId: 2 });
  await h.flush();
  h.tabs.set(3, { id: 3, windowId: 7, active: true, url: 'https://example.org/lesson?answer=secret' });
  h.tabs.get(2).active = false;
  h.listeners.activated({ tabId: 3 });
  await h.flush();

  const active = (await h.send({ kind: 'GET_STATUS' })).result;
  assert.equal(active.incidents.filter(x => x.type === 'AI_SITE_OPENED').length, 1);
  assert.equal(active.incidents.filter(x => x.type === 'WEBPAGE_OPENED').length, 1);
  assert.ok(active.incidents.every(x => x.sessionId === active.activeSession.id));
  assert.ok(active.incidents.every(x => x.source === 'CHROME' && x.appCategory === null));
  assert.ok(!JSON.stringify(active).includes('secret'));
  assert.ok(!JSON.stringify(active).includes('/lesson'));

  const ended = (await h.send({ kind: 'END_EXAM' })).result;
  assert.equal(ended.activeSession, null);
  assert.equal(ended.lastSession.endedAt !== null, true);
  const count = ended.incidents.length;
  h.listeners.activated({ tabId: 2 });
  await h.flush();
  assert.equal((await h.send({ kind: 'GET_STATUS' })).result.incidents.length, count);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify({ session: ended.lastSession, incidents: ended.incidents })));
});

test('content signals require the monitored Form and cannot control sessions', async () => {
  const h = harness();
  const sender = { tab: h.tabs.get(1), url: formUrl };
  assert.equal((await h.send({ kind: 'START_EXAM', tabId: 1 }, sender)).ok, false);
  await h.send({ kind: 'START_EXAM', tabId: 1 });
  await h.send({ kind: 'CONTENT_EVENT', type: 'COPY_ATTEMPT' }, { tab: { id: 99 }, url: formUrl });
  await h.send({ kind: 'CONTENT_EVENT', type: 'COPY_ATTEMPT' }, { tab: h.tabs.get(1), url: 'https://evil.example/' });
  await h.send({ kind: 'CONTENT_EVENT', type: 'COPY_ATTEMPT' }, sender);
  await h.send({ kind: 'CONTENT_EVENT', type: 'PASTE_ATTEMPT' }, sender);
  h.windows.get(7).focused = false;
  await h.send({ kind: 'CONTENT_EVENT', type: 'FORM_FOCUS_LOST' }, sender);
  const incidents = (await h.send({ kind: 'GET_STATUS' })).result.incidents;
  assert.equal(incidents.filter(x => x.type === 'COPY_ATTEMPT').length, 1);
  assert.equal(incidents.filter(x => x.type === 'PASTE_ATTEMPT').length, 1);
  assert.equal(incidents.filter(x => x.type === 'WINDOW_FOCUS_LOST').length, 1);
  assert.ok(incidents.every(x => x.appCategory === null));
});

test('stale Form content script survives synchronous extension invalidation', () => {
  const handlers = {};
  const document = {
    addEventListener(type, handler) { handlers[type] = handler; }
  };
  const window = { addEventListener() {} };
  const chrome = { runtime: { sendMessage() { throw Error('Extension context invalidated.'); } } };
  const context = vm.createContext({ location: { pathname: '/forms/d/e/demo/viewform' }, document, window, chrome });
  vm.runInContext(readFileSync(path.join(__dirname, '../content.js'), 'utf8'), context);
  assert.doesNotThrow(() => handlers.copy());
  assert.doesNotThrow(() => handlers.paste());
});

test('standalone extension control page can start while ordinary tabs cannot', async () => {
  const h = harness();
  const untrusted = { tab: { id: 2 }, url: 'https://example.com/' };
  assert.equal((await h.send({ kind: 'START_EXAM', tabId: 1 }, untrusted)).ok, false);
  const ownPage = { tab: { id: 3 }, url: 'chrome-extension://demo/popup.html' };
  assert.equal((await h.send({ kind: 'START_EXAM', tabId: 1 }, ownPage)).ok, true);
  assert.equal((await h.send({ kind: 'GET_STATUS' }, ownPage)).result.activeSession.formTabId, 1);
});

test('navigating the monitored tab away from Forms is recorded', async () => {
  const h = harness();
  await h.send({ kind: 'START_EXAM', tabId: 1 });
  h.tabs.get(1).url = 'https://example.com/search?q=secret';
  h.listeners.updated(1, { url: h.tabs.get(1).url }, h.tabs.get(1));
  await h.flush();
  const incidents = (await h.send({ kind: 'GET_STATUS' })).result.incidents;
  assert.equal(incidents.at(-1).type, 'WEBPAGE_OPENED');
  assert.equal(incidents.at(-1).hostname, 'example.com');
});

test('service worker restart preserves the active session and JSON report', async () => {
  const first = harness();
  await first.send({ kind: 'START_EXAM', tabId: 1 });
  const restarted = harness(first.stored);
  const state = (await restarted.send({ kind: 'GET_STATUS' })).result;
  assert.equal(state.activeSession.id, first.stored.monitorState.activeSession.id);
  const report = JSON.parse(JSON.stringify(buildReport(state)));
  assert.equal(report.incidents[0].sessionId, report.session.id);
  assert.deepEqual(Object.keys(report.session).sort(), ['endedAt', 'id', 'startedAt']);
  assert.equal(report.incidents[0].source, 'CHROME');
  assert.equal(report.incidents[0].appCategory, null);
  assert.match(report.note, /not proof of cheating/);
});

test('opening a blank tab does not double-count its first webpage and closing the Form interrupts monitoring', async () => {
  const h = harness();
  await h.send({ kind: 'START_EXAM', tabId: 1 });
  h.tabs.set(2, { id: 2, windowId: 7, active: true, url: 'chrome://newtab/' });
  h.tabs.get(1).active = false;
  h.listeners.activated({ tabId: 2 });
  await h.flush();
  h.tabs.get(2).url = 'https://example.org/lesson';
  h.listeners.updated(2, { url: h.tabs.get(2).url }, h.tabs.get(2));
  await h.flush();
  h.tabs.delete(1);
  h.listeners.removed(1);
  await h.flush();
  const incidents = (await h.send({ kind: 'GET_STATUS' })).result.incidents;
  assert.equal(incidents.filter(x => x.type === 'WEBPAGE_OPENED').length, 1);
  assert.equal(incidents.filter(x => x.type === 'TAB_SWITCHED').length, 0);
  assert.equal(incidents.filter(x => x.type === 'MONITORING_INTERRUPTED').length, 1);
});

test('Chrome window focus and fullscreen transitions produce review signals', async () => {
  const h = harness();
  await h.send({ kind: 'START_EXAM', tabId: 1 });
  h.windows.get(7).state = 'normal';
  h.listeners.boundsChanged(h.windows.get(7));
  await h.flush();
  h.windows.get(7).state = 'fullscreen';
  h.listeners.boundsChanged(h.windows.get(7));
  await h.flush();
  h.listeners.focusChanged(-1);
  h.windows.get(7).focused = false;
  h.listeners.focusChanged(-1);
  await h.send({ kind: 'CONTENT_EVENT', type: 'FORM_FOCUS_LOST' }, { tab: h.tabs.get(1), url: formUrl });
  await h.flush();
  h.windows.get(7).focused = true;
  h.listeners.focusChanged(7);
  h.listeners.focusChanged(7);
  await h.send({ kind: 'CONTENT_EVENT', type: 'FORM_FOCUS_RESTORED' }, { tab: h.tabs.get(1), url: formUrl });
  await h.flush();
  const incidents = (await h.send({ kind: 'GET_STATUS' })).result.incidents;
  for (const type of ['FULLSCREEN_EXITED', 'FULLSCREEN_RESTORED', 'WINDOW_FOCUS_LOST', 'WINDOW_FOCUS_RESTORED']) {
    assert.equal(incidents.filter(x => x.type === type).length, 1, type);
  }
});

test('normal-window start keeps Chrome controls visible and still records fullscreen changes', async () => {
  const h = harness();
  const started = await h.send({ kind: 'START_EXAM', tabId: 1, fullscreen: false });
  assert.equal(started.ok, true);
  assert.equal(h.windows.get(7).state, 'normal');
  assert.equal(started.result.activeSession.fullscreenState, 'other');
  assert.equal(started.result.activeSession.fullscreenRequested, false);

  h.windows.get(7).state = 'fullscreen';
  h.listeners.boundsChanged(h.windows.get(7));
  await h.flush();
  h.windows.get(7).state = 'normal';
  h.listeners.boundsChanged(h.windows.get(7));
  await h.flush();
  const incidents = (await h.send({ kind: 'GET_STATUS' })).result.incidents;
  assert.equal(incidents.filter(x => x.type === 'FULLSCREEN_RESTORED').length, 1);
  assert.equal(incidents.filter(x => x.type === 'FULLSCREEN_EXITED').length, 1);
});

test('Windows host categories are validated, private, and session-bound', async () => {
  const h = harness();
  await h.send({ kind: 'START_EXAM', tabId: 1 });
  const port = h.nativePorts[0];
  const timestamp = new Date().toISOString();
  port.emit({ kind: 'READY', timestamp });
  port.emit({ kind: 'FOREGROUND_CHANGED', appCategory: 'WORD', timestamp });
  port.emit({ kind: 'FOREGROUND_CHANGED', appCategory: 'NOTEPAD', timestamp });
  port.emit({ kind: 'FOREGROUND_CHANGED', appCategory: 'PDF_READER', timestamp });
  port.emit({ kind: 'FOREGROUND_CHANGED', appCategory: 'OTHER', timestamp });
  port.emit({ kind: 'FOREGROUND_CHANGED', appCategory: 'WINWORD.EXE', timestamp });
  await h.flush();
  const state = (await h.send({ kind: 'GET_STATUS' })).result;
  assert.equal(state.desktopStatus, 'CONNECTED');
  const appIncidents = state.incidents.filter(x => x.type === 'DESKTOP_APP_ACTIVE');
  assert.deepEqual(appIncidents.map(x => x.appCategory), ['WORD', 'NOTEPAD', 'PDF_READER']);
  assert.ok(appIncidents.every(x => x.source === 'WINDOWS_HOST' && x.hostname === null));
  assert.ok(!JSON.stringify(state).includes('WINWORD.EXE'));
  assert.equal(desktop.validateHostMessage({ kind: 'FOREGROUND_CHANGED', appCategory: 'WORD', timestamp: 'invalid' }), null);

  await h.send({ kind: 'END_EXAM' });
  port.emit({ kind: 'FOREGROUND_CHANGED', appCategory: 'WORD', timestamp });
  await h.flush();
  assert.equal((await h.send({ kind: 'GET_STATUS' })).result.incidents.length, state.incidents.length + 1);
});

test('native-host disconnect records one interruption and browser monitoring continues', async () => {
  const h = harness();
  await h.send({ kind: 'START_EXAM', tabId: 1 });
  const port = h.nativePorts[0];
  port.emit({ kind: 'READY', timestamp: new Date().toISOString() });
  await h.flush();
  port.drop();
  await h.flush();
  const disconnected = (await h.send({ kind: 'GET_STATUS' })).result;
  assert.equal(disconnected.desktopStatus, 'DISCONNECTED');
  const interruptions = disconnected.incidents.filter(x => x.type === 'MONITORING_INTERRUPTED');
  assert.equal(interruptions.length, 1);
  assert.equal(interruptions[0].source, 'WINDOWS_HOST');
  assert.equal(interruptions[0].appCategory, null);
  h.tabs.set(2, { id: 2, windowId: 7, active: true, url: 'https://example.org/' });
  h.listeners.activated({ tabId: 2 });
  await h.flush();
  assert.equal((await h.send({ kind: 'GET_STATUS' })).result.incidents.at(-1).type, 'WEBPAGE_OPENED');
  await h.send({ kind: 'END_EXAM' });
});
