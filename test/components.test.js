import test from 'node:test'
import assert from 'node:assert/strict'
import { candidatesOf, classifySource, compareVersions, createComponents, isNewer, latestOf, readRegistry } from '../components.js'

const CURRENT = '1.2.0'
const NEWER = '1.3.0'

function bundle(name, extra = {}) {
  return { name, version: CURRENT, availability: 'profile', installed: true, enabled: true, source: name, description: `${name} description`, rows: [], ...extra }
}

function registryFetch(versions, options = {}) {
  const calls = []
  const doFetch = async (url) => {
    calls.push(String(url))
    const name = decodeURIComponent(String(url).replace(/^https:\/\/[^/]+\//, ''))
    const answered = versions[name]
    if (answered === undefined) return { status: 404, ok: false, async json() { return {} } }
    if (typeof answered === 'function') return answered()
    return { status: 200, ok: true, async json() { return answered } }
  }
  return { doFetch, calls, ...options }
}

const answer = (name, version) => ({ name, 'dist-tags': { latest: version }, time: { [version]: '2026-01-02T03:04:05Z' } })

test('version comparison and update detection', () => {
  assert.equal(compareVersions('1.2.3', '1.2.3'), 0)
  assert.equal(compareVersions('1.10.0', '1.9.9'), 1)
  assert.equal(compareVersions('2.0.0', '2.0.0-beta.1'), 1, 'a release outranks a prerelease')
  assert.equal(compareVersions('2.0.0-beta.10', '2.0.0-beta.2'), 1)
  assert.equal(compareVersions('2.0.0-alpha', '2.0.0-beta'), -1)
  assert.equal(isNewer(NEWER, CURRENT), true)
  assert.equal(isNewer(CURRENT, CURRENT), false)
  assert.equal(isNewer('1.1.9', CURRENT), false)
  assert.equal(isNewer('not-a-version', CURRENT), false)
  assert.equal(isNewer(NEWER, null), false)
})

test('install sources decide what can be updated from a registry', () => {
  assert.deepEqual(classifySource('pkg', 'pkg'), { kind: 'registry' })
  assert.deepEqual(classifySource('pkg', 'pkg@1.2.3'), { kind: 'registry' })
  assert.deepEqual(classifySource('@scope/pkg', '@scope/pkg@^1.2.0'), { kind: 'registry' })
  assert.equal(classifySource('pkg', 'github:owner/repo').reason, 'git')
  assert.equal(classifySource('pkg', 'git+https://example.com/r.git').reason, 'git')
  assert.equal(classifySource('pkg', 'link:C:/work/pkg').reason, 'link')
  assert.equal(classifySource('pkg', 'file:../pkg').reason, 'file')
  assert.equal(classifySource('pkg', 'https://example.com/pkg.tgz').reason, 'url')
  assert.equal(classifySource('pkg', 'npm:other@1.0.0').reason, 'alias')
  assert.equal(classifySource('pkg', undefined).reason, 'no-source')
  assert.equal(classifySource('pkg', 'something-else').reason, 'unrecognised')
})

test('bundle inventory splits registry candidates from skipped sources', () => {
  const { packages, skipped } = candidatesOf([
    bundle('alpha'),
    bundle('@scope/beta', { source: '@scope/beta@1.2.0' }),
    bundle('gamma', { source: 'link:C:/work/gamma' }),
    bundle('delta', { source: 'github:owner/delta' }),
    { name: 'shipped', availability: 'installation', installed: false, source: 'shipped', version: '0.1.0' },
    { name: 'absent', availability: 'profile', installed: false, source: 'absent' },
    null,
  ])
  assert.deepEqual(packages.map((item) => item.name), ['alpha', '@scope/beta'])
  assert.deepEqual(skipped.map((item) => [item.name, item.reason]), [['gamma', 'link'], ['delta', 'git']])
})

test('a registry read reports the newest answer and never throws', async () => {
  const { doFetch } = registryFetch({ pkg: answer('pkg', '1.2.0') })
  const offline = async () => { throw Object.assign(new Error('boom'), { cause: { code: 'ENOTFOUND' } }) }
  const timedOut = async () => { throw Object.assign(new Error('slow'), { name: 'TimeoutError' }) }
  const missing = async () => ({ status: 404, ok: false, async json() { return {} } })
  assert.equal((await readRegistry('https://a/', 'pkg', doFetch)).version, '1.2.0')
  assert.equal((await readRegistry('https://a/', 'pkg', offline)).error, 'ENOTFOUND')
  assert.equal((await readRegistry('https://a/', 'pkg', timedOut)).error, 'timeout')
  assert.equal((await readRegistry('https://a/', 'pkg', missing)).error, 'not on registry')
  assert.equal((await readRegistry('https://a/', 'pkg', async () => ({ status: 500, ok: false }))).error, 'HTTP 500')
  assert.equal((await readRegistry('https://a/', 'pkg', async () => ({ status: 200, ok: true, async json() { return { name: 'other', 'dist-tags': { latest: '1.0.0' } } } }))).error, 'unexpected answer')
})

test('the newest registry wins when a mirror lags behind', async () => {
  const doFetch = async (url) => (String(url).startsWith('https://mirror.test/')
    ? { status: 200, ok: true, async json() { return { name: 'pkg', 'dist-tags': { latest: '1.1.0' } } } }
    : { status: 200, ok: true, async json() { return { name: 'pkg', 'dist-tags': { latest: '1.3.0' } } } })
  const value = await latestOf('pkg', doFetch, ['https://npm.test/', 'https://mirror.test/'])
  assert.equal(value.latest, '1.3.0')
  assert.equal(value.registry, 'https://npm.test/')
  assert.equal(value.stable, true)
  assert.equal(value.publishedAt, undefined)
  const failing = await latestOf('pkg', async () => { throw new Error('down') }, ['https://npm.test/'])
  assert.match(failing.error, /down/)
})

test('component list flags available updates, marks failures and caches answers', async () => {
  const manager = { async listBundles() { return [bundle('alpha'), bundle('beta'), bundle('gamma', { source: 'link:C:/g' })] } }
  let alphaVersion = NEWER
  const doFetch = async (url) => {
    const name = decodeURIComponent(String(url).split('/').pop())
    if (name === 'alpha') return { status: 200, ok: true, async json() { return { name: 'alpha', 'dist-tags': { latest: alphaVersion }, time: { [alphaVersion]: '2026-02-03T00:00:00Z' } } } }
    if (name === 'beta') return { status: 200, ok: true, async json() { return { name: 'beta', 'dist-tags': { latest: CURRENT } } } }
    throw new Error('unexpected')
  }
  const service = createComponents({ manager, doFetch })
  let report = await service.list()
  assert.equal(report.supported, true)
  assert.deepEqual(report.packages.map((item) => [item.name, item.latest, item.updateAvailable]), [
    ['alpha', NEWER, true],
    ['beta', CURRENT, false],
  ])
  assert.equal(report.packages[0].publishedAt, '2026-02-03T00:00:00.000Z')
  assert.deepEqual(report.skipped.map((item) => item.name), ['gamma'])

  alphaVersion = CURRENT
  report = await service.list()
  assert.equal(report.packages[0].latest, NEWER, 'a repeated check hits the cache')
  report = await service.list({ force: true })
  assert.equal(report.packages[0].latest, CURRENT, 'forcing re-reads the registry')
  assert.equal(report.packages[0].updateAvailable, false)
})

test('component list degrades safely without a plugin manager or a reachable registry', async () => {
  const missing = createComponents({ manager: undefined })
  const absent = await missing.list()
  assert.equal(absent.supported, false)
  assert.deepEqual(absent.packages, [])

  const manager = { async listBundles() { return [bundle('alpha')] } }
  const offline = createComponents({ manager, doFetch: async () => { throw Object.assign(new Error('net'), { cause: { code: 'ECONNREFUSED' } }) } })
  const report = await offline.list()
  assert.equal(report.packages[0].updateAvailable, false)
  assert.equal(report.packages[0].error, 'ECONNREFUSED')
  await assert.rejects(offline.update({ name: 'alpha' }), /不支持按版本更新组件/)
})

test('update asks the registry for the target version and never trusts the request', async () => {
  const calls = []
  const manager = {
    async listBundles() { return [bundle('alpha')] },
    async updateBundle(name, version) {
      calls.push([name, version])
      return { application: 'applied', bundle: name, version }
    },
  }
  const service = createComponents({ manager, doFetch: registryFetch({ alpha: answer('alpha', NEWER) }).doFetch })
  const result = await service.update({ name: 'alpha', version: '9.9.9' })
  assert.deepEqual(calls, [['alpha', NEWER]], 'the client-supplied version is ignored')
  assert.equal(result.application, 'applied')
  assert.equal(result.version, NEWER)
  await assert.rejects(service.update({ name: 'not-a-valid name!' }), /组件名无效/)
  await assert.rejects(service.update({ name: '../escape' }), /组件名无效/)
})

test('update surfaces host failures and allows only one update at a time', async () => {
  let release
  const gate = new Promise((resolve) => { release = resolve })
  const manager = {
    async listBundles() { return [bundle('alpha'), bundle('beta')] },
    async updateBundle(name) {
      if (name === 'alpha') { await gate; return { application: 'failed', error: { code: 'ERANGE', diagnostic: 'registry refused' } } }
      return { application: 'applied' }
    },
  }
  const versions = { alpha: answer('alpha', NEWER), beta: answer('beta', NEWER) }
  const service = createComponents({ manager, doFetch: registryFetch(versions).doFetch })
  const first = service.update({ name: 'alpha' })
  await assert.rejects(service.update({ name: 'beta' }), /正在更新 alpha/)
  release()
  const failed = await first
  assert.equal(failed.application, 'failed')
  assert.deepEqual(failed.error, { code: 'ERANGE', diagnostic: 'registry refused' })
  assert.equal((await service.update({ name: 'beta' })).application, 'applied', 'the guard releases after the update')
})

test('update refuses when the host cannot update bundles', async () => {
  const service = createComponents({ manager: { async listBundles() { return [bundle('alpha')] } }, doFetch: registryFetch({ alpha: answer('alpha', NEWER) }).doFetch })
  await assert.rejects(service.update({ name: 'alpha' }), /不支持按版本更新组件/)
})
