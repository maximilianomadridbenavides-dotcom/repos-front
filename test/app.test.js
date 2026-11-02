import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setImmediate } from 'node:timers/promises';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const repositories = [
  { id: '1', nombre: '<script>alert(1)</script>', descripcion: 'Portal', lenguaje: 'JavaScript', rama: 'main', estrellas: 3, actualizado: '2026-11-01', estado: 'Activo' },
  { id: '2', nombre: 'infra', descripcion: 'Infraestructura', lenguaje: 'Python', rama: 'develop', estrellas: 0, actualizado: '2026-10-01', estado: 'En progreso' },
];

test('la página carga datos, filtra, muestra resultados vacíos y permite actualizar', async (t) => {
  const dom = new JSDOM(html);
  t.after(() => dom.window.close());
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/repositorios');
    assert.equal(options.headers.Accept, 'application/json');
    return { ok: true, json: async () => ({ ok: true, data: repositories }) };
  });
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  t.after(() => { delete globalThis.document; delete globalThis.Option; });
  await import('../app.js?success');
  await setImmediate();
  const $ = (selector) => document.querySelector(selector);
  assert.equal($('#repo-grid').children.length, 2);
  assert.equal($('.repo-name').textContent, repositories[0].nombre);
  assert.equal($('#repo-grid script'), null, 'los datos se muestran como texto seguro');
  assert.equal($('.is-progress').textContent, 'En progreso');
  assert.equal($('#metric-total').textContent, '2');
  assert.equal($('#metric-active').textContent, '1');
  assert.equal($('#metric-languages').textContent, '2');
  assert.equal($('#api-state-label').textContent, 'API conectada');
  assert.deepEqual([...$('#language-filter').options].map(o => o.value), ['all', 'JavaScript', 'Python']);
  $('#language-filter').value = 'Python';
  $('#language-filter').dispatchEvent(new dom.window.Event('change'));
  assert.equal($('#repo-grid').children.length, 1);
  assert.equal($('.repo-name').textContent, 'infra');
  $('#search-input').value = 'inexistente';
  $('#search-input').dispatchEvent(new dom.window.Event('input'));
  assert.equal($('#notice').className, 'notice notice-empty');
  assert.equal($('#result-count').textContent, 'Mostrando 0 de 2 repositorios');
  $('#search-input').value = '';
  $('#search-input').dispatchEvent(new dom.window.Event('input'));
  assert.equal($('#notice').hidden, true);
  $('#refresh-button').click();
  await setImmediate();
  assert.equal(globalThis.fetch.mock.callCount(), 2);
  assert.equal($('#repo-grid').children.length, 1);
});

for (const failure of ['http', 'network', 'payload']) {
  test(`la página informa y limpia métricas ante un error ${failure}`, async (t) => {
    const dom = new JSDOM(html);
    t.after(() => dom.window.close());
    globalThis.document = dom.window.document;
    globalThis.Option = dom.window.Option;
    t.after(() => { delete globalThis.document; delete globalThis.Option; });
    t.mock.method(globalThis, 'fetch', async () => {
      if (failure === 'network') throw new Error('Sin red');
      return { ok: failure !== 'http', status: 503, json: async () => ({ ok: false }) };
    });
    await import(`../app.js?${failure}`);
    await setImmediate();
    assert.equal(document.querySelector('#api-state-label').textContent, 'API sin conexión');
    assert.equal(document.querySelector('#metric-total').textContent, '0');
    assert.equal(document.querySelector('#notice').className, 'notice notice-error');
    assert.match(document.querySelector('#notice-message').textContent, /No se pudieron cargar/);
    assert.equal(document.querySelector('#repo-grid').children.length, 0);
    assert.equal(document.querySelector('#result-count').textContent, '');
  });
}
