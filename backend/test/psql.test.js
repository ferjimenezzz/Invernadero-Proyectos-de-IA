// La contraseña de la BD nunca va en los argumentos de psql / pg_dump: viaja en PGPASSWORD.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sinClave } from '../scripts/psql.js';

test('sinClave quita la contraseña de la URL y la pasa en PGPASSWORD', () => {
  const c = sinClave('postgresql://postgres.ref:p%40ss%3Aw0rd@pooler.example.com:5432/postgres?sslmode=require');
  assert.equal(c.url, 'postgresql://postgres.ref@pooler.example.com:5432/postgres?sslmode=require');
  assert.equal(c.env.PGPASSWORD, 'p@ss:w0rd');
  assert.equal(c.env.PGCLIENTENCODING, 'UTF8');
});

test('sinClave deja igual una URL sin contraseña', () => {
  assert.equal(sinClave('postgresql://postgres@localhost:5432/postgres').url, 'postgresql://postgres@localhost:5432/postgres');
});
