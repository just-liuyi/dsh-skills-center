// Compare Windows directory publishing inside/outside the live skill watch root.
// Only hidden, uniquely owned probe directories are created; no skills are installed.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { lstat, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const home = resolve(process.env.DSH_HOME || join(homedir(), '.dsh'))
const root = join(home, 'skills')
const outside = join(home, 'dsh-skills-center', 'publish-probes')
await mkdir(outside, { recursive: true })
async function probe(base, label) {
  const source = await mkdtemp(join(base, '.stage-probe-'))
  const target = join(root, `.publish-probe-${randomUUID()}`)
  assert.equal(dirname(resolve(source)), resolve(base))
  assert(basename(source).startsWith('.stage-probe-'))
  assert.equal(dirname(resolve(target)), resolve(root))
  assert(basename(target).startsWith('.publish-probe-'))
  try {
    await assert.rejects(lstat(target), { code: 'ENOENT' })
    await writeFile(join(source, 'SKILL.md'), '---\nname: dsh-publish-probe\ndescription: Temporary hidden publish probe\n---\n\nProbe only.\n')
    await delay(250)
    try { await rename(source, target); return { label, renamed: true } }
    catch (error) { return { label, renamed: false, code: error.code, message: error.message } }
  } finally {
    await rm(source, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 })
    await rm(target, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 })
  }
}
console.log(JSON.stringify([await probe(root, 'inside skill root'), await probe(outside, 'outside skill root')], null, 2))
