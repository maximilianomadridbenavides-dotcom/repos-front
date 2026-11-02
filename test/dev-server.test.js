import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';

test('servidor local: archivos públicos, métodos, proxy y API desconectada', { timeout: 15000 }, async (t) => {
  let redirect = false;
  const upstream = http.createServer((req, res) => {
    assert.equal(req.url, '/api/repositorios');
    assert.equal(req.headers['x-injected'], undefined);
    if (redirect) {
      res.writeHead(302, { Location: 'https://example.com' });
      res.end();
      return;
    }
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  t.after(() => upstream.close());
  const reservation = http.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, ['--import', './test/support/shutdown.js', 'dev-server.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, FRONTEND_PORT: String(port), API_PORT: String(upstream.address().port) },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  t.after(async () => { const exited = once(child, 'exit'); child.send('shutdown'); await exited; });
  await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(() => { throw new Error('El servidor terminó antes de iniciar'); })]);
  const base = `http://127.0.0.1:${port}`;
  for (const file of ['/', '/index.html', '/app.js', '/catalog.js', '/styles.css']) {
    const response = await fetch(base + file);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.ok((await response.text()).length > 0);
  }
  const head = await fetch(base, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  assert.equal((await fetch(base + '/package.json')).status, 404);
  assert.equal((await fetch(base + '/api/privado')).status, 404);
  assert.equal((await fetch(base + '/api/repositorios', { method: 'POST' })).status, 405);
  const proxied = await fetch(base + '/api/repositorios?limit=1', { headers: { 'X-Injected': 'no reenviar' } });
  assert.equal(proxied.status, 201);
  assert.deepEqual(await proxied.json(), { ok: true });
  redirect = true;
  const rejected = await fetch(base + '/api/repositorios', { redirect: 'manual' });
  assert.equal(rejected.status, 502);
  assert.equal(rejected.headers.get('location'), null);
  await new Promise(resolve => upstream.close(resolve));
  const unavailable = await fetch(base + '/api/repositorios');
  assert.equal(unavailable.status, 502);
  assert.equal((await unavailable.json()).ok, false);
});
