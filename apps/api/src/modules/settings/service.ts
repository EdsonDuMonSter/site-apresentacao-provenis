import * as repo from './repo.js';

export async function ensure(q: Parameters<typeof repo.ensureTables>[0]) {
  await repo.ensureTables(q);
}

export async function read(q: Parameters<typeof repo.getSetting>[0], key: string) {
  await ensure(q);
  return repo.getSetting(q, key);
}

export async function write(
  q: Parameters<typeof repo.setSetting>[0],
  key: string,
  value: string
) {
  await ensure(q);
  return repo.setSetting(q, key, value);
}
