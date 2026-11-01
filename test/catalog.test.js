import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterRepositories,
  listRepositoryLanguages,
  readRepositoryPayload,
  summarizeRepositories,
} from '../catalog.js';

const repositories = [
  {
    id: 'REP-001',
    nombre: 'portal-web',
    descripcion: 'Interfaz de operaciones',
    lenguaje: 'TypeScript',
    estado: 'Activo',
  },
  {
    id: 'REP-002',
    nombre: 'repos-api',
    descripcion: 'API del catálogo',
    lenguaje: 'JavaScript',
    estado: 'En progreso',
  },
  {
    id: 'REP-003',
    nombre: 'infra-demo',
    descripcion: 'Manifiestos de Kubernetes',
    lenguaje: 'Python',
    estado: 'Activo',
  },
];

describe('catálogo del frontend', () => {
  it('filtra por texto sin distinguir mayúsculas y minúsculas', () => {
    assert.deepEqual(filterRepositories(repositories, '  API  '), [repositories[1]]);
  });

  it('busca también dentro de la descripción y el lenguaje', () => {
    assert.deepEqual(filterRepositories(repositories, 'kubernetes'), [repositories[2]]);
    assert.deepEqual(filterRepositories(repositories, 'typescript'), [repositories[0]]);
  });

  it('combina el texto buscado con el filtro de lenguaje', () => {
    assert.deepEqual(filterRepositories(repositories, 'catálogo', 'JavaScript'), [repositories[1]]);
    assert.deepEqual(filterRepositories(repositories, 'catálogo', 'Python'), []);
  });

  it('devuelve todos los repositorios si no hay filtros', () => {
    assert.deepEqual(filterRepositories(repositories), repositories);
  });

  it('resume el total, los repositorios activos y los lenguajes únicos', () => {
    assert.deepEqual(summarizeRepositories(repositories), {
      total: 3,
      active: 2,
      languages: 3,
    });
  });

  it('resume correctamente un catálogo vacío', () => {
    assert.deepEqual(summarizeRepositories([]), { total: 0, active: 0, languages: 0 });
  });

  it('devuelve los lenguajes únicos ordenados', () => {
    const withRepeatedLanguage = [...repositories, { ...repositories[0], id: 'REP-004' }];

    assert.deepEqual(listRepositoryLanguages(withRepeatedLanguage), ['JavaScript', 'Python', 'TypeScript']);
  });

  it('acepta un payload válido de la API', () => {
    assert.deepEqual(readRepositoryPayload({ ok: true, data: repositories }), repositories);
  });

  it('rechaza payloads incompletos o con una lista inválida', () => {
    assert.throws(() => readRepositoryPayload(null), /formato inesperado/);
    assert.throws(() => readRepositoryPayload({ ok: false, data: repositories }), /formato inesperado/);
    assert.throws(() => readRepositoryPayload({ ok: true, data: {} }), /formato inesperado/);
  });
});
