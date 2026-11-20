// Explicit network smoke test. Installs only into an owned temporary DSH home.
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, basename } from 'node:path'

const directory = await mkdtemp(join(tmpdir(), 'dsh-skills-center-github-'))
const previousHome = process.env.DSH_HOME
const previousAgents = process.env.DSH_AGENTS_HOME
process.env.DSH_HOME = join(directory, 'dsh')
process.env.DSH_AGENTS_HOME = join(directory, 'agents')
const ctx = { get(key) { return key === 'workingDirectory' ? { defaultDirectory: directory } : undefined } }
try {
  await mkdir(process.env.DSH_HOME, { recursive: true })
  const { dispatch } = await import('../index.js')
  async function call(action, payload) {
    const result = await dispatch(ctx, action, payload)
    assert.equal(result.ok, true, `${action}: ${result.error || ''}`)
    return result.value
  }
  const started = Date.now()
  const preview = await call('source.preview', { url: 'https://github.com/cloudflare/skills' })
  assert(preview.skills.length > 1, 'Cloudflare source should expose multiple skills')
  const selected = preview.skills.find((skill) => skill.name === 'cf-cli')
  assert(selected, 'Cloudflare source should expose cf-cli')
  await call('source.install', { token: preview.token, names: [selected.name], enabled: true })
  const installedDir = join(process.env.DSH_HOME, 'skills', selected.name)
  const entries = await readdir(installedDir)
  assert(entries.includes('SKILL.md'))
  assert(entries.length > 1, 'Full installation should include supporting resources')
  let catalog = await call('catalog')
  let row = catalog.skills.rows.find((item) => item.name === selected.name)
  assert.equal(row.origin, 'online')
  assert.equal(row.managed, true)
  assert.equal(row.modelInvocable, false, 'New skills stay disabled even when the legacy enabled option is true')
  assert.equal(row.userInvocable, false)
  assert(catalog.skills.sources.some((item) => item.id === preview.source.id))
  await call('skill.setInvocation', { name: selected.name, enabled: true })
  row = (await call('catalog')).skills.rows.find((item) => item.name === selected.name)
  assert.equal(row.modelInvocable, true)
  const originalUserInvocation = row.userInvocable
  await call('skill.setInvocation', { name: selected.name, enabled: false })
  catalog = await call('catalog')
  row = catalog.skills.rows.find((item) => item.name === selected.name)
  assert.equal(row.modelInvocable, false)
  assert.equal(row.userInvocable, false)
  await call('skill.setInvocation', { name: selected.name, enabled: true })
  catalog = await call('catalog')
  row = catalog.skills.rows.find((item) => item.name === selected.name)
  assert.equal(row.modelInvocable, true)
  assert.equal(row.userInvocable, originalUserInvocation)
  const instruction = join(installedDir, 'SKILL.md')
  await writeFile(instruction, `${await readFile(instruction, 'utf8')}\nLocal smoke-test edit.\n`)
  const blocked = await dispatch(ctx, 'skill.update', { name: selected.name })
  assert.equal(blocked.ok, false, 'Update must refuse to overwrite a local modification')
  assert.match(await readFile(instruction, 'utf8'), /Local smoke-test edit/)
  await call('skill.remove', { name: selected.name })
  catalog = await call('catalog')
  assert(!catalog.skills.rows.some((item) => item.name === selected.name))
  assert(catalog.skills.sources.some((item) => item.id === preview.source.id), 'Uninstall should retain the source catalog')
  console.log(JSON.stringify({ repository: preview.source.label, commit: preview.source.commit, discovered: preview.skills.length, installedAndRemoved: selected.name, topLevelFiles: entries.length, elapsedMs: Date.now() - started, verified: ['real GitHub discovery', 'full package install', 'source grouping', 'disable/enable restoration', 'local modification protection', 'uninstall'] }, null, 2))
} finally {
  if (previousHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = previousHome
  if (previousAgents === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = previousAgents
  assert.equal(resolve(directory, '..'), resolve(tmpdir()))
  assert(basename(directory).startsWith('dsh-skills-center-github-'))
  await rm(directory, { recursive: true, force: true })
}
