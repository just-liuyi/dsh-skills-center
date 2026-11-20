// End-to-end network test. Uses an owned temporary DSH home only.
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'

const directory = await mkdtemp(join(tmpdir(), 'dsh-skills-center-directory-'))
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
  const search = await call('source.search', { query: 'cf-cli', owner: 'cloudflare' })
  const result = search.skills.find((item) => item.source === 'cloudflare/skills' && (item.skillId === 'cf-cli' || item.name === 'cf-cli'))
  assert(result, 'skills.sh should return Cloudflare cf-cli')
  assert.equal(result.supported, true)
  assert.equal(result.installed, false)
  const added = await call('source.add', { url: result.url })
  assert.equal(added.name, 'cf-cli')
  assert.equal(added.added, true)
  let catalog = await call('catalog')
  assert.deepEqual(catalog.skills.rows.map((row) => row.name), ['cf-cli'], 'Add only the chosen skill')
  assert.equal(catalog.skills.rows[0].origin, 'online')
  assert.equal(catalog.skills.rows[0].modelInvocable, false, 'New additions are disabled for the model')
  assert.equal(catalog.skills.rows[0].userInvocable, false, 'New additions are disabled for user invocation')
  const source = catalog.skills.sources.find((item) => item.label === 'cloudflare/skills')
  assert(source)
  assert.equal(source.discoveredVia, 'skills.sh')
  const packageDirectory = join(process.env.DSH_HOME, 'skills', 'cf-cli')
  const files = await readdir(packageDirectory)
  assert(files.includes('SKILL.md') && files.length > 1, 'Install complete supporting resources')
  await call('source.check', { id: source.id })
  await call('skill.update', { name: 'cf-cli' })
  catalog = await call('catalog')
  assert.equal(catalog.skills.rows[0].modelInvocable, false, 'Updating a disabled skill must keep it disabled')
  const refreshedSource = catalog.skills.sources.find((item) => item.id === source.id)
  assert.equal(refreshedSource.discoveredVia, 'skills.sh')
  assert.equal(refreshedSource.directoryUrl, source.directoryUrl)
  assert.match(await readFile(join(packageDirectory, 'SKILL.md'), 'utf8'), /name:\s*cf-cli/)
  await call('skill.setInvocation', { name: 'cf-cli', enabled: true })
  assert.equal((await call('catalog')).skills.rows[0].modelInvocable, true)
  const existing = await call('source.add', { url: result.url })
  assert.equal(existing.existing, true)
  assert.equal(existing.added, false)
  assert.equal((await call('catalog')).skills.rows[0].modelInvocable, true, 'Adding an existing skill preserves the manual switch')
  await call('skill.remove', { name: 'cf-cli' })
  assert.equal((await call('catalog')).skills.rows.length, 0)
  console.log(JSON.stringify({ directory: result.url, repository: source.label, searchResults: search.skills.length, addedName: added.name, completePackageEntries: files.length, elapsedMs: Date.now() - started, verified: ['live skills.sh search', 'direct single skill addition', 'model and user disabled by default', 'full resources and provenance', 'update preserves disabled state', 'manual enable', 'idempotent add preserves enabled state', 'uninstall'] }, null, 2))
} finally {
  if (previousHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = previousHome
  if (previousAgents === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = previousAgents
  assert.equal(resolve(directory, '..'), resolve(tmpdir()))
  assert(basename(directory).startsWith('dsh-skills-center-directory-'))
  await rm(directory, { recursive: true, force: true })
}
