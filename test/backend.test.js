import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, mkdtemp, mkdir, readFile, readdir, rename as nativeRename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { dispatch } from '../index.js'
import { assertSameVolume, createSourcesManager, renameWithRetry, parseGitHubSource, parseSource, safeRepoPath, parseSkillMetadata, packageHash } from '../skills-sources.js'

const sha = (text) => createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex')
const markdown = (name, body = 'Version one', user = true) => `---\nname: ${name}\ndescription: >-\n  A useful skill\n  with multiple lines\n${user ? '' : 'user-invocable: false\n'}---\n\n${body}\n`
const A = 'a'.repeat(40)
const B = 'b'.repeat(40)

async function environment(t) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-sources-test-'))
  const previousHome = process.env.DSH_HOME
  const previousAgents = process.env.DSH_AGENTS_HOME
  const previousFetch = globalThis.fetch
  process.env.DSH_HOME = join(dir, 'home')
  process.env.DSH_AGENTS_HOME = join(dir, 'agents')
  const versions = new Map()
  const first = new Map([
    ['skills/alpha/SKILL.md', markdown('alpha')],
    ['skills/alpha/references/help.md', '# Help\n'],
    ['skills/alpha/scripts/example.js', 'throw new Error("must never execute")\n'],
    ['skills/beta/SKILL.md', markdown('beta', 'Beta', false)],
  ])
  versions.set(A, first)
  let current = A
  let failPath = null
  let unsafe = false
  let directoryResponse = { query: 'alpha', searchType: 'fuzzy', skills: [{ id: 'acme/skills/alpha', source: 'acme/skills', skillId: 'alpha', name: 'Alpha skill', installs: 123 }], count: 1 }
  const requests = []
  globalThis.fetch = async (url, options = {}) => {
    requests.push(String(url))
    assert.ok(options.signal, 'network request has cancellation/timeout')
    assert.equal(options.redirect, 'error')
    const parsed = new URL(url)
    if (parsed.hostname === 'www.skills.sh' && parsed.pathname === '/api/search') {
      const response = typeof directoryResponse === 'function' ? await directoryResponse(parsed, options) : directoryResponse
      return response instanceof Response ? response : Response.json(response)
    }
    if (parsed.hostname === 'api.github.com') {
      if (parsed.pathname === '/repos/acme/skills') return Response.json({ default_branch: 'main' })
      if (parsed.pathname.startsWith('/repos/acme/skills/commits/')) return Response.json({ sha: current })
      if (parsed.pathname.startsWith('/repos/acme/skills/git/trees/')) {
        const snapshot = versions.get(parsed.pathname.split('/').at(-1))
        const tree = [...snapshot].map(([path, text]) => ({ path, type: 'blob', mode: '100644', size: Buffer.byteLength(text), sha: sha(text) }))
        if (unsafe) tree.push({ path: 'skills/alpha/../escape.txt', type: 'blob', mode: '100644', size: 1, sha: sha('x') })
        return Response.json({ tree, truncated: false })
      }
    }
    if (parsed.hostname === 'raw.githubusercontent.com') {
      const [, owner, repo, commit, ...path] = parsed.pathname.split('/')
      assert.equal(owner, 'acme'); assert.equal(repo, 'skills')
      assert.match(commit, /^[a-f0-9]{40}$/, 'downloads use immutable full commit SHA')
      const key = path.map(decodeURIComponent).join('/')
      if (key === failPath) return new Response('not found', { status: 404 })
      const value = versions.get(commit)?.get(key)
      return value === undefined ? new Response('not found', { status: 404 }) : new Response(value)
    }
    throw new Error(`Unexpected fetch ${url}`)
  }
  const ctx = { get: (key) => key === 'workingDirectory' ? { defaultDirectory: dir } : undefined }
  const rpc = async (action, payload = {}) => {
    const response = await dispatch(ctx, action, payload)
    assert.equal(response.ok, true, response.error)
    return response.value
  }
  const error = async (action, payload, regex) => {
    const response = await dispatch(ctx, action, payload)
    assert.equal(response.ok, false)
    assert.match(response.error, regex)
  }
  const root = join(process.env.DSH_HOME, 'skills')
  const statePath = join(process.env.DSH_HOME, 'dsh-skills-center', 'sources.json')
  t.after(async () => {
    globalThis.fetch = previousFetch
    if (previousHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = previousHome
    if (previousAgents === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = previousAgents
    assert.equal(resolve(dir, '..'), resolve(tmpdir()))
    assert(basename(dir).startsWith('dsh-sources-test-'))
    await rm(dir, { recursive: true, force: true })
  })
  return { dir, root, statePath, rpc, error, requests, first, versions, setCurrent: (value) => { current = value }, setFail: (value) => { failPath = value }, setUnsafe: () => { unsafe = true }, setDirectory: (value) => { directoryResponse = value } }
}

test('GitHub source parsing, restricted paths and common folded frontmatter', () => {
  assert.equal(parseGitHubSource('acme/skills').url, 'https://github.com/acme/skills')
  assert.equal(parseGitHubSource('https://github.com/acme/skills/tree/main/skills/alpha').subdir, 'skills/alpha')
  assert.equal(parseGitHubSource('https://github.com/acme/skills/blob/main/skills/alpha/SKILL.md').single, true)
  const slash = parseGitHubSource('https://github.com/acme/skills/tree/main/skills?ref=feature%2Fnext')
  assert.equal(slash.ref, 'feature/next')
  assert.equal(parseGitHubSource(slash.url).ref, 'feature/next')
  for (const value of ['https://example.com/repo', 'http://github.com/acme/skills', 'https://user:pass@github.com/acme/skills', 'https://github.com/acme/skills/blob/main/README.md', 'https://github.com/acme/skills/tree/main/%2e%2e%2fescape']) assert.throws(() => parseGitHubSource(value))
  for (const value of ['../escape', 'a/../../b', 'a\\b', '/root', 'a/C:evil', 'a/NUL.txt', 'a/name.', 'a//b']) assert.throws(() => safeRepoPath(value))
  assert.equal(parseSkillMetadata(markdown('alpha')).description, 'A useful skill with multiple lines')
  const one = new Map([['SKILL.md', Buffer.from(markdown('alpha'))]])
  const two = new Map([['SKILL.md', Buffer.from(markdown('alpha').replace('---\n\n', 'disable-model-invocation: true\nuser-invocable: false\n---\n\n'))]])
  assert.equal(packageHash(one), packageHash(two), 'invocation toggles do not count as local content edits')
})

test('preview, selected full-package install, readonly detail, disable and restore, uninstall', async (t) => {
  const env = await environment(t)
  const preview = await env.rpc('source.preview', { url: 'acme/skills' })
  assert.equal(preview.skills.length, 2)
  assert.equal(preview.skills[0].installed, false)
  assert.equal(preview.skills[0].conflict, null)
  await env.rpc('source.install', { token: preview.token, names: ['alpha'], enabled: true })
  assert.equal(await readFile(join(env.root, 'alpha', 'references', 'help.md'), 'utf8'), '# Help\n')
  assert.match(await readFile(join(env.root, 'alpha', 'scripts', 'example.js'), 'utf8'), /must never execute/)
  let catalog = await env.rpc('catalog')
  assert.equal(catalog.skills.sources.length, 1)
  assert.equal(catalog.skills.sources[0].skills.find((skill) => skill.name === 'beta').installed, false)
  const row = catalog.skills.rows.find((skill) => skill.name === 'alpha')
  assert.deepEqual([row.origin, row.managed, row.editable, row.writable, row.modelInvocable, row.userInvocable], ['online', true, false, true, false, false], 'fresh installation ignores enabled:true and keeps both invocation surfaces off')
  await env.rpc('skill.setInvocation', { name: 'alpha', enabled: true })
  const manuallyEnabled = (await env.rpc('catalog')).skills.rows.find((skill) => skill.name === 'alpha')
  assert.deepEqual([manuallyEnabled.modelInvocable, manuallyEnabled.userInvocable], [true, true], 'manual enable restores the original invocation preference')
  assert.equal((await env.rpc('skill.detail', { name: 'alpha' })).editable, false)
  await env.error('skill.save', { name: 'alpha', originalName: 'alpha', description: 'modified', content: 'oops' }, /只读/)
  await env.rpc('skill.setInvocation', { name: 'alpha', enabled: false })
  catalog = await env.rpc('catalog')
  assert.deepEqual([catalog.skills.rows[0].modelInvocable, catalog.skills.rows[0].userInvocable, catalog.skills.rows[0].localModified], [false, false, false])
  await env.rpc('skill.setInvocation', { name: 'alpha', modelInvocable: true, userInvocable: false })
  catalog = await env.rpc('catalog')
  assert.deepEqual([catalog.skills.rows[0].modelInvocable, catalog.skills.rows[0].userInvocable, catalog.skills.rows[0].localModified], [true, true, false], 'legacy toggle cannot overwrite the remembered user invocation preference')
  await env.rpc('skill.remove', { name: 'alpha' })
  catalog = await env.rpc('catalog')
  assert.equal(catalog.skills.rows.length, 0)
  assert.equal(catalog.skills.sources[0].skills[0].installed, false)
  assert.ok(env.requests.every((url) => !url.includes('github.com/acme/skills/main/')))
})

test('source update checks protect local edits and preserve disabled state and user preference', async (t) => {
  const env = await environment(t)
  await env.rpc('source.install', { url: 'acme/skills', names: ['alpha', 'beta'], enabled: false })
  const sourceId = (await env.rpc('catalog')).skills.sources[0].id
  const next = new Map(env.first)
  next.set('skills/alpha/SKILL.md', markdown('alpha', 'Version two'))
  next.delete('skills/alpha/references/help.md')
  next.set('skills/alpha/references/new.md', 'New reference\n')
  env.versions.set(B, next); env.setCurrent(B)
  const checked = await env.rpc('source.check', { id: sourceId })
  assert.equal(checked.skills.find((item) => item.name === 'alpha').updateAvailable, true)
  const target = join(env.root, 'alpha', 'SKILL.md')
  const untouched = await readFile(target, 'utf8')
  await writeFile(target, `${untouched}\nLocal edit`)
  await env.error('skill.update', { name: 'alpha' }, /本地修改/)
  assert.match(await readFile(target, 'utf8'), /Local edit/)
  assert.equal((await env.rpc('catalog')).skills.rows.find((item) => item.name === 'alpha').localModified, true)
  await writeFile(target, untouched)
  await env.rpc('skill.update', { name: 'alpha' })
  let row = (await env.rpc('catalog')).skills.rows.find((item) => item.name === 'alpha')
  assert.deepEqual([row.modelInvocable, row.userInvocable, row.localModified, row.updateAvailable], [false, false, false, false])
  assert.match(await readFile(target, 'utf8'), /Version two/)
  assert.equal(await readFile(join(env.root, 'alpha', 'references', 'new.md'), 'utf8'), 'New reference\n')
  await assert.rejects(readFile(join(env.root, 'alpha', 'references', 'help.md')), { code: 'ENOENT' })
  await env.rpc('skill.setInvocation', { name: 'beta', enabled: true })
  row = (await env.rpc('catalog')).skills.rows.find((item) => item.name === 'beta')
  assert.deepEqual([row.modelInvocable, row.userInvocable], [true, false], 'original explicit user-invocable:false survives disable and enable')
})

test('existing identical skills require explicit association and differing skills are never overwritten', async (t) => {
  const env = await environment(t)
  for (const [path, text] of env.first) {
    if (!path.startsWith('skills/alpha/')) continue
    const target = join(env.root, 'alpha', path.slice('skills/alpha/'.length))
    await mkdir(join(target, '..'), { recursive: true }); await writeFile(target, text)
  }
  let preview = await env.rpc('source.preview', { url: 'acme/skills' })
  assert.equal(preview.skills.find((item) => item.name === 'alpha').canAssociate, true)
  await env.error('source.install', { token: preview.token, names: ['alpha'] }, /明确选择关联/)
  const associated = await env.rpc('source.install', { token: preview.token, names: ['alpha'], associate: true })
  assert.deepEqual(associated.associated, ['alpha'])
  assert.equal((await env.rpc('catalog')).skills.rows[0].origin, 'online')
  assert.deepEqual([(await env.rpc('catalog')).skills.rows[0].modelInvocable, (await env.rpc('catalog')).skills.rows[0].userInvocable], [true, true], 'explicit association preserves the existing enabled skill')
  const betaPath = join(env.root, 'beta', 'SKILL.md')
  await mkdir(join(env.root, 'beta'), { recursive: true }); await writeFile(betaPath, markdown('beta', 'My custom instructions'))
  preview = await env.rpc('source.preview', { url: 'acme/skills' })
  assert.equal(preview.skills.find((item) => item.name === 'beta').canAssociate, false)
  await env.error('source.install', { token: preview.token, names: ['beta'], associate: true }, /本地内容不同/)
  assert.match(await readFile(betaPath, 'utf8'), /My custom instructions/)
})

test('batch download failures publish nothing; unsafe paths and corrupt state fail closed', async (t) => {
  const env = await environment(t)
  const preview = await env.rpc('source.preview', { url: 'acme/skills' })
  env.setFail('skills/beta/SKILL.md')
  await env.error('source.install', { token: preview.token, names: ['alpha', 'beta'] }, /HTTP 404/)
  assert.deepEqual(await readdir(env.root), [])
  env.setFail(null); env.setUnsafe()
  await env.error('source.preview', { url: 'acme/skills' }, /unsafe repository path/)
  await mkdir(join(env.statePath, '..'), { recursive: true }); await writeFile(env.statePath, '{broken')
  await env.error('catalog', {}, /来源记录已损坏/)
  assert.equal(await readFile(env.statePath, 'utf8'), '{broken')
})

test('refresh and another skill update retain upstream-removed installed entries', async (t) => {
  const env = await environment(t)
  await env.rpc('source.install', { url: 'acme/skills', names: ['alpha', 'beta'] })
  const sourceId = (await env.rpc('catalog')).skills.sources[0].id
  const next = new Map([...env.first].filter(([path]) => !path.startsWith('skills/beta/')))
  next.set('skills/alpha/SKILL.md', markdown('alpha', 'New version'))
  env.versions.set(B, next); env.setCurrent(B)
  await env.rpc('source.refresh', { id: sourceId })
  let skills = (await env.rpc('catalog')).skills
  assert.equal(skills.sources[0].skills.find((item) => item.name === 'beta').upstreamRemoved, true)
  assert.equal(skills.rows.find((item) => item.name === 'beta').upstreamRemoved, true)
  await env.rpc('skill.update', { name: 'alpha' })
  skills = (await env.rpc('catalog')).skills
  assert.equal(skills.sources[0].skills.find((item) => item.name === 'beta').installed, true)
  await env.rpc('skill.setInvocation', { name: 'beta', enabled: false })
  await env.rpc('skill.remove', { name: 'beta' })
  assert.equal((await env.rpc('catalog')).skills.rows.some((item) => item.name === 'beta'), false)
})

test('metadata publication failure rolls installed directories back and leaves no staging files', async (t) => {
  const env = await environment(t)
  const preview = await env.rpc('source.preview', { url: 'acme/skills' })
  const normalFetch = globalThis.fetch
  let injected = false
  globalThis.fetch = async (url, options) => {
    if (!injected && String(url).includes('/scripts/example.js')) {
      injected = true
      // Simulate a filesystem failure after readState and downloads, at final metadata rename.
      await mkdir(env.statePath, { recursive: true })
    }
    return normalFetch(url, options)
  }
  const result = await dispatch({ get: (key) => key === 'workingDirectory' ? { defaultDirectory: env.dir } : undefined }, 'source.install', { token: preview.token, names: ['alpha'] })
  assert.equal(result.ok, false)
  assert.deepEqual(await readdir(env.root), [], 'published skill and staging directory both roll back')
  assert.deepEqual((await readdir(join(env.statePath, '..'))).filter((name) => name.endsWith('.tmp')), [], 'temporary metadata file is removed')
})

test('duplicate concurrent installs cannot replace a managed skill', async (t) => {
  const env = await environment(t)
  const preview = await env.rpc('source.preview', { url: 'acme/skills' })
  const ctx = { get: (key) => key === 'workingDirectory' ? { defaultDirectory: env.dir } : undefined }
  const results = await Promise.all([1, 2].map(() => dispatch(ctx, 'source.install', { token: preview.token, names: ['alpha'] })))
  assert.deepEqual(results.map((result) => result.ok).sort(), [false, true])
  assert.match(results.find((result) => !result.ok).error, /已被来源管理/)
  assert.equal((await env.rpc('catalog')).skills.rows.length, 1)
})

test('simultaneous source install requests preserve both records and local default user invocation', async (t) => {
  const env = await environment(t)
  const preview = await env.rpc('source.preview', { url: 'acme/skills' })
  await Promise.all(['alpha', 'beta'].map((name) => env.rpc('source.install', { token: preview.token, names: [name] })))
  const state = JSON.parse(await readFile(env.statePath, 'utf8'))
  assert.deepEqual(Object.keys(state.installations).sort(), ['alpha', 'beta'])
  const localPath = join(env.root, 'local', 'SKILL.md')
  await mkdir(join(env.root, 'local')); await writeFile(localPath, markdown('local'))
  let row = (await env.rpc('catalog')).skills.rows.find((item) => item.name === 'local')
  assert.equal(row.userInvocable, true)
  await env.rpc('skill.setInvocation', { name: 'local', enabled: false })
  row = (await env.rpc('catalog')).skills.rows.find((item) => item.name === 'local')
  assert.deepEqual([row.modelInvocable, row.userInvocable], [false, false])
  await env.rpc('skill.setInvocation', { name: 'local', enabled: true })
  row = (await env.rpc('catalog')).skills.rows.find((item) => item.name === 'local')
  assert.deepEqual([row.origin, row.userInvocable], ['local', true])
})

test('skills.sh URLs map to the same GitHub identity and reject unsupported site entries', () => {
  const github = parseGitHubSource('acme/skills')
  for (const url of ['https://skills.sh/acme/skills/alpha', 'https://www.skills.sh/acme/skills/alpha']) {
    const source = parseSource(url)
    assert.equal(source.id, github.id)
    assert.equal(source.url, github.url)
    assert.equal(source.directoryUrl, 'https://www.skills.sh/acme/skills/alpha')
    assert.equal(source.directorySkill, 'alpha')
  }
  assert.equal(parseSource('https://www.skills.sh/acme/skills').id, github.id)
  assert.throws(() => parseSource('https://www.skills.sh/'), /搜索/)
  assert.throws(() => parseSource('https://skills.sh/site/developers.cloudflare.com/cloudflare'), /网站域名/)
  for (const value of ['http://skills.sh/acme/skills/alpha', 'https://user@skills.sh/acme/skills/alpha', 'https://skills.sh/acme/skills/alpha?url=https://evil.test', 'https://skills.sh/acme/skills/alpha/extra', 'https://skills.sh.evil.test/acme/skills/alpha']) assert.throws(() => parseSource(value))
})

test('directory search validates results, uses fixed canonical endpoint and reports installed source accurately', async (t) => {
  const env = await environment(t)
  env.setDirectory({ query: 'alpha', skills: [
    { id: 'acme/skills/alpha', source: 'acme/skills', skillId: 'alpha', name: 'Alpha skill', installs: 123 },
    { id: 'developers.example.com/alpha', source: 'developers.example.com', skillId: 'alpha', name: 'Website alpha', installs: 12 },
  ], count: 2 })
  let results = await env.rpc('source.search', { query: 'alpha & beta', owner: 'acme' })
  const request = new URL(env.requests[0])
  assert.equal(request.origin, 'https://www.skills.sh')
  assert.equal(request.pathname, '/api/search')
  assert.equal(request.searchParams.get('q'), 'alpha & beta')
  assert.equal(request.searchParams.get('owner'), 'acme')
  assert.equal(results.skills[0].url, 'https://www.skills.sh/acme/skills/alpha')
  assert.equal(results.skills[0].repositoryUrl, 'https://github.com/acme/skills')
  assert.equal(results.skills[0].installed, false)
  assert.equal(results.skills[1].supported, false)
  assert.equal(results.skills[1].repositoryUrl, null)
  assert.equal(results.skills[1].url, 'https://www.skills.sh/site/developers.example.com/alpha')
  assert.equal(results.skills.length, 2, 'unsupported website sources remain visible instead of making search silently empty')
  const preview = await env.rpc('source.preview', { url: results.skills[0].url })
  assert.deepEqual(preview.selectedNames, ['alpha'])
  await env.rpc('source.install', { token: preview.token, names: preview.selectedNames })
  results = await env.rpc('source.search', { query: 'alpha' })
  assert.equal(results.skills[0].installed, true)
  env.setDirectory({ skills: [{ id: 'other/skills/alpha', source: 'other/skills', skillId: 'alpha', name: 'Alpha', installs: 1 }], count: 1 })
  results = await env.rpc('source.search', { query: 'alpha' })
  assert.equal(results.skills[0].installed, false)
  assert.match(results.skills[0].conflict, /同名/)
})

test('directory detail installs only selected real skill and keeps provenance through checks, updates and repository installs', async (t) => {
  const env = await environment(t)
  const preview = await env.rpc('source.preview', { url: 'https://skills.sh/acme/skills/alpha' })
  assert.deepEqual(preview.selectedNames, ['alpha'])
  assert.equal(preview.skills.filter((skill) => skill.selected).length, 1)
  await env.rpc('source.install', { token: preview.token, names: preview.selectedNames })
  assert.deepEqual(await readdir(env.root), ['alpha'])
  let state = JSON.parse(await readFile(env.statePath, 'utf8'))
  assert.equal(state.sources[0].discoveredVia, 'skills.sh')
  assert.equal(state.sources[0].url, 'https://github.com/acme/skills')
  assert.equal(state.installations.alpha.directoryUrl, 'https://www.skills.sh/acme/skills/alpha')
  const next = new Map(env.first)
  next.set('skills/alpha/SKILL.md', markdown('alpha', 'Updated from directory'))
  env.versions.set(B, next); env.setCurrent(B)
  await env.rpc('source.check', { id: preview.source.id })
  state = JSON.parse(await readFile(env.statePath, 'utf8'))
  assert.equal(state.installations.alpha.commit, A, 'checking upstream never rewrites the installed commit')
  assert.equal((await env.rpc('catalog')).skills.sources[0].discoveredVia, 'skills.sh')
  await env.rpc('skill.update', { name: 'alpha' })
  state = JSON.parse(await readFile(env.statePath, 'utf8'))
  assert.equal(state.installations.alpha.commit, B)
  assert.equal(state.sources[0].directoryUrl, 'https://www.skills.sh/acme/skills/alpha')
  await env.rpc('source.install', { url: 'https://github.com/acme/skills', names: ['beta'] })
  const catalog = await env.rpc('catalog')
  assert.equal(catalog.skills.sources.length, 1, 'GitHub and directory entrances share one repository source')
  assert.deepEqual(catalog.skills.rows.map((row) => row.name), ['alpha', 'beta'])
  assert.equal(catalog.skills.sources[0].discoveredVia, 'skills.sh')
})

test('directory search errors are explicit, bounded and never replaced with empty results', async (t) => {
  const env = await environment(t)
  for (const [response, pattern] of [
    [new Response('unavailable', { status: 503 }), /skills.sh HTTP 503/],
    [new Response('{broken'), /无效 JSON/],
    [{ error: 'backend failed' }, /响应格式无效/],
    [{ skills: [{ id: 'acme/skills/alpha', source: 'acme/skills', name: 'Alpha', installs: '123' }] }, /结果格式无效/],
    [new Response('{}', { headers: { 'content-length': String(3 * 1024 * 1024) } }), /大小限制/],
  ]) {
    env.setDirectory(response)
    await env.error('source.search', { query: 'alpha' }, pattern)
  }
  const count = env.requests.length
  await env.error('source.search', { query: '' }, /搜索词/)
  await env.error('source.search', { query: 'a', owner: 'https://evil.test' }, /owner/)
  assert.equal(env.requests.length, count, 'invalid inputs do not start a network request')
  env.setDirectory({ skills: [], count: 0 })
  assert.deepEqual((await env.rpc('source.search', { query: 'nothing' })).skills, [], 'a successful empty directory response is valid')
})

test('pending directory search does not hold the skill queue or block catalog', async (t) => {
  const env = await environment(t)
  let markStarted, release
  const started = new Promise((resolve) => { markStarted = resolve })
  const gate = new Promise((resolve) => { release = resolve })
  env.setDirectory(async () => { markStarted(); await gate; return { skills: [], count: 0 } })
  const search = env.rpc('source.search', { query: 'alpha' })
  await started
  let timer
  try {
    const catalog = await Promise.race([env.rpc('catalog'), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('catalog blocked by directory search')), 500) })])
    assert.equal(catalog.skills.rows.length, 0)
  } finally { clearTimeout(timer); release(); await search }
})

test('large directory repositories target exact folders, map renamed metadata and retain other discovered skills', async (t) => {
  const env = await environment(t)
  const expanded = new Map(env.first)
  expanded.set('skills/catalog-slug/SKILL.md', markdown('actual-name'))
  for (let i = 0; i < 110; i++) expanded.set(`other/irrelevant-${i}/SKILL.md`, 'Invalid unrelated document')
  env.versions.set(A, expanded)
  env.setDirectory({ skills: [{ id: 'acme/skills/catalog-slug', source: 'acme/skills', skillId: 'catalog-slug', name: 'Actual display name', installs: 12 }], count: 1 })
  const preview = await env.rpc('source.preview', { url: 'https://www.skills.sh/acme/skills/catalog-slug' })
  assert.deepEqual(preview.selectedNames, ['actual-name'])
  assert.equal(preview.skills.length, 1)
  assert.equal(preview.source.partial, true)
  assert(env.requests.filter((url) => url.includes('raw.githubusercontent.com')).every((url) => url.endsWith('/skills/catalog-slug/SKILL.md')), 'discovery does not fetch unrelated invalid skills')
  await env.rpc('source.install', { token: preview.token, names: preview.selectedNames })
  const searched = await env.rpc('source.search', { query: 'actual' })
  assert.equal(searched.skills[0].installed, true)
  assert.equal(searched.skills[0].installedName, 'actual-name')
  const alpha = await env.rpc('source.preview', { url: 'https://skills.sh/acme/skills/alpha' })
  await env.rpc('source.install', { token: alpha.token, names: alpha.selectedNames })
  let source = (await env.rpc('catalog')).skills.sources[0]
  assert.deepEqual(source.skills.map((skill) => skill.name).sort(), ['actual-name', 'alpha'])
  const next = new Map(expanded)
  next.set('skills/catalog-slug/SKILL.md', markdown('actual-name', 'Updated exact skill'))
  env.versions.set(B, next); env.setCurrent(B)
  await env.rpc('source.check', { id: source.id })
  await env.rpc('skill.update', { name: 'actual-name' })
  source = (await env.rpc('catalog')).skills.sources[0]
  assert.equal(source.discoveredVia, 'skills.sh')
  assert.deepEqual(source.skills.map((skill) => skill.name).sort(), ['actual-name', 'alpha'])
  assert.match(await readFile(join(env.root, 'actual-name', 'SKILL.md'), 'utf8'), /Updated exact skill/)
})

test('a directory slug matching multiple folders is rejected instead of selecting several skills', async (t) => {
  const env = await environment(t)
  const duplicate = new Map(env.first)
  duplicate.set('nested/alpha/SKILL.md', markdown('another-alpha'))
  env.versions.set(A, duplicate)
  await env.error('source.preview', { url: 'https://www.skills.sh/acme/skills/alpha' }, /多个目录/)
  assert.equal(env.requests.some((url) => url.includes('raw.githubusercontent.com')), false)
})

test('small directory repositories ignore unrelated malformed skills during install, check and update', async (t) => {
  const env = await environment(t)
  const snapshot = new Map(env.first)
  snapshot.set('skills/broken/SKILL.md', 'Invalid unrelated SKILL.md')
  env.versions.set(A, snapshot)
  const preview = await env.rpc('source.preview', { url: 'https://www.skills.sh/acme/skills/alpha' })
  await env.rpc('source.install', { token: preview.token, names: preview.selectedNames })
  await env.rpc('source.check', { id: preview.source.id })
  await env.rpc('skill.update', { name: 'alpha' })
  assert.equal((await env.rpc('catalog')).skills.rows[0].name, 'alpha')
  await env.rpc('skill.remove', { name: 'alpha' })
  await env.rpc('source.install', { url: preview.source.url, names: ['alpha'] })
  const reinstalled = JSON.parse(await readFile(env.statePath, 'utf8'))
  assert.equal(reinstalled.installations.alpha.directoryUrl, 'https://www.skills.sh/acme/skills/alpha')
  assert.equal(reinstalled.sources[0].discoveredVia, 'skills.sh')
  assert(env.requests.filter((url) => url.includes('raw.githubusercontent.com')).every((url) => !url.endsWith('/broken/SKILL.md')))
})

const fileError = (code) => Object.assign(new Error(`injected ${code}`), { code })
function directManager(env, fileOperations = {}) {
  return createSourcesManager({
    home: dirname(env.root), fileOperations,
    listLocal: async () => {
      let entries
      try { entries = await readdir(env.root, { withFileTypes: true }) } catch (error) { if (error.code === 'ENOENT') return { rows: [] }; throw error }
      const rows = []
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue
        const path = join(env.root, entry.name, 'SKILL.md')
        const data = parseSkillMetadata(await readFile(path, 'utf8'))
        rows.push({ name: data.name, description: data.description, path, provider: 'filesystem', writable: true, modelInvocable: data['disable-model-invocation'] !== 'true', userInvocable: data['user-invocable'] !== 'false' })
      }
      return { rows }
    },
  })
}

test('rename retries only lock errors and has a fixed 1550ms default maximum wait', async () => {
  const waits = []
  let attempts = 0
  await renameWithRetry('from', 'to', { renameOperation: async () => { if (++attempts < 3) throw fileError(attempts === 1 ? 'EPERM' : 'EBUSY') }, wait: async (ms) => { waits.push(ms) } })
  assert.equal(attempts, 3)
  assert.deepEqual(waits, [50, 100])
  waits.length = 0; attempts = 0
  await assert.rejects(renameWithRetry('from', 'to', { renameOperation: async () => { attempts++; throw fileError('EACCES') }, wait: async (ms) => { waits.push(ms) } }), (error) => error.code === 'EACCES' && /已重试 5 次/.test(error.message) && /可能/.test(error.message))
  assert.equal(attempts, 6)
  assert.equal(waits.reduce((sum, ms) => sum + ms, 0), 1550)
  for (const code of ['EXDEV', 'EEXIST', 'ENOENT', 'ENOTDIR']) {
    let count = 0
    await assert.rejects(renameWithRetry('from', 'to', { renameOperation: async () => { count++; throw fileError(code) }, wait: async () => { assert.fail('non-transient error must not wait') } }), { code })
    assert.equal(count, 1)
  }
})

test('rename calls within one transaction share a budget below two seconds', async () => {
  const budget = { remainingMs: 1800 }, waits = []
  let count = 0
  await renameWithRetry('from', 'to', { budget, renameOperation: async () => { if (++count < 6) throw fileError('EPERM') }, wait: async (ms) => { waits.push(ms) } })
  await assert.rejects(renameWithRetry('backup', 'original', { budget, renameOperation: async () => { throw fileError('EBUSY') }, wait: async (ms) => { waits.push(ms) } }), { code: 'EBUSY' })
  assert.equal(waits.reduce((sum, ms) => sum + ms, 0), 1700)
  assert.equal(budget.remainingMs, 100)
})

test('install stages outside the skill root and retries both publication and metadata replacement', async (t) => {
  const env = await environment(t), waits = [], seen = []
  let publishAttempts = 0, metadataAttempts = 0
  const manager = directManager(env, {
    wait: async (ms) => { waits.push(ms) },
    rename: async (from, to) => {
      seen.push([from, to])
      if (to === join(env.root, 'alpha') && ++publishAttempts <= 2) throw fileError('EPERM')
      if (to === env.statePath && ++metadataAttempts === 1) throw fileError('EACCES')
      return nativeRename(from, to)
    },
  })
  await manager.install({ url: 'acme/skills', names: ['alpha'] })
  assert.equal(dirname(seen.find(([, to]) => to === join(env.root, 'alpha'))[0]), join(dirname(env.statePath), 'staging'))
  assert.deepEqual(waits, [50, 100, 50])
  assert.deepEqual(await readdir(env.root), ['alpha'])
  assert.deepEqual(await readdir(join(dirname(env.statePath), 'staging')), [])
  assert.equal(JSON.parse(await readFile(env.statePath, 'utf8')).installations.alpha.commit, A)
})

test('persistent publication lock is bounded, leaves no skill or metadata and cleans only owned staging', async (t) => {
  const env = await environment(t), waits = []
  let attempts = 0
  const manager = directManager(env, { wait: async (ms) => { waits.push(ms) }, rename: async (from, to) => { if (to === join(env.root, 'alpha')) { attempts++; throw fileError('EPERM') }; return nativeRename(from, to) } })
  await assert.rejects(manager.install({ url: 'acme/skills', names: ['alpha'] }), { code: 'EPERM' })
  assert.equal(attempts, 6)
  assert.equal(waits.reduce((sum, ms) => sum + ms, 0), 1550)
  assert.deepEqual(await readdir(env.root), [])
  assert.deepEqual(await readdir(join(dirname(env.statePath), 'staging')), [])
  await assert.rejects(readFile(env.statePath), { code: 'ENOENT' })
})

test('a target created during retry is preserved and never force-removed', async (t) => {
  const env = await environment(t), target = join(env.root, 'alpha')
  let calls = 0
  const manager = directManager(env, {
    wait: async () => {}, rename: async () => {
      calls++
      await mkdir(target)
      await writeFile(join(target, 'foreign.txt'), 'external content')
      throw fileError('EPERM')
    },
  })
  await assert.rejects(manager.install({ url: 'acme/skills', names: ['alpha'] }), { code: 'EEXIST' })
  assert.equal(calls, 1)
  assert.equal(await readFile(join(target, 'foreign.txt'), 'utf8'), 'external content')
  assert.deepEqual(await readdir(join(dirname(env.statePath), 'staging')), [])
})

test('cross-volume staging fails before moving an installed skill or changing metadata', async (t) => {
  const env = await environment(t)
  await env.rpc('source.install', { url: 'acme/skills', names: ['alpha'] })
  const metadata = await readFile(env.statePath, 'utf8')
  const original = await readFile(join(env.root, 'alpha', 'SKILL.md'), 'utf8')
  let renameCalls = 0
  const manager = directManager(env, { stat: async (path) => ({ dev: resolve(path) === resolve(env.root) ? 1 : 2 }), rename: async () => { renameCalls++; assert.fail('cross-volume operation must not reach rename') } })
  await assert.rejects(manager.update({ name: 'alpha' }), (error) => error.code === 'EXDEV' && /同一卷/.test(error.message))
  assert.equal(renameCalls, 0)
  assert.equal(await readFile(env.statePath, 'utf8'), metadata)
  assert.equal(await readFile(join(env.root, 'alpha', 'SKILL.md'), 'utf8'), original)
  await assert.rejects(assertSameVolume('a', 'b', { realpath: async (path) => path, stat: async (path) => ({ dev: path === 'a' ? 1 : 2 }) }), { code: 'EXDEV' })
})

test('update publication failure restores its backup with transient rollback retries', async (t) => {
  const env = await environment(t), waits = []
  await env.rpc('source.install', { url: 'acme/skills', names: ['alpha'] })
  const metadata = await readFile(env.statePath, 'utf8'), instruction = join(env.root, 'alpha', 'SKILL.md')
  const original = await readFile(instruction, 'utf8')
  const next = new Map(env.first); next.set('skills/alpha/SKILL.md', markdown('alpha', 'new bytes')); env.versions.set(B, next); env.setCurrent(B)
  let restores = 0
  const manager = directManager(env, {
    wait: async (ms) => { waits.push(ms) }, rename: async (from, to) => {
      if (basename(from).startsWith('stage-') && to === dirname(instruction)) throw fileError('EIO')
      if (basename(from).startsWith('backup-') && ++restores === 1) throw fileError('EBUSY')
      return nativeRename(from, to)
    },
  })
  await assert.rejects(manager.update({ name: 'alpha' }), { code: 'EIO' })
  assert.deepEqual(waits, [50])
  assert.equal(await readFile(instruction, 'utf8'), original)
  assert.equal(await readFile(env.statePath, 'utf8'), metadata)
  assert.deepEqual(await readdir(join(dirname(env.statePath), 'staging')), [])
})

test('update metadata failure preserves the original error and retains a backup if rollback cannot complete', async (t) => {
  const env = await environment(t), waits = []
  await env.rpc('source.install', { url: 'acme/skills', names: ['alpha'] })
  const metadata = await readFile(env.statePath, 'utf8')
  const next = new Map(env.first); next.set('skills/alpha/SKILL.md', markdown('alpha', 'new bytes')); env.versions.set(B, next); env.setCurrent(B)
  const manager = directManager(env, {
    wait: async (ms) => { waits.push(ms) }, rename: async (from, to) => {
      if (to === env.statePath) throw fileError('EIO')
      if (basename(from).startsWith('backup-')) throw fileError('EPERM')
      return nativeRename(from, to)
    },
  })
  await assert.rejects(manager.update({ name: 'alpha' }), (error) => error.code === 'EIO' && /原技能备份保留在/.test(error.message) && /EPERM/.test(error.message))
  const backups = await readdir(join(dirname(env.statePath), 'staging'))
  assert.equal(backups.length, 1)
  assert(backups[0].startsWith('backup-'))
  assert.match(await readFile(join(dirname(env.statePath), 'staging', backups[0], 'SKILL.md'), 'utf8'), /Version one/)
  assert.equal(await readFile(env.statePath, 'utf8'), metadata)
  assert.equal(waits.reduce((sum, ms) => sum + ms, 0), 1550)
})

test('uninstall metadata failure restores the quarantined skill using the same retry helper', async (t) => {
  const env = await environment(t), waits = []
  await env.rpc('source.install', { url: 'acme/skills', names: ['alpha'] })
  const metadata = await readFile(env.statePath, 'utf8'), path = join(env.root, 'alpha', 'SKILL.md')
  let restores = 0
  const manager = directManager(env, {
    wait: async (ms) => { waits.push(ms) }, rename: async (from, to) => {
      if (to === env.statePath) throw fileError('EIO')
      if (basename(from).startsWith('remove-') && ++restores === 1) throw fileError('EACCES')
      return nativeRename(from, to)
    },
  })
  await assert.rejects(manager.remove({ name: 'alpha' }, { name: 'alpha', path }), { code: 'EIO' })
  assert.deepEqual(waits, [50])
  assert.match(await readFile(path, 'utf8'), /Version one/)
  assert.equal(await readFile(env.statePath, 'utf8'), metadata)
  assert.deepEqual(await readdir(join(dirname(env.statePath), 'staging')), [])
})

test('staging cleanup failure cannot mask the original publication failure', async (t) => {
  const env = await environment(t)
  const manager = directManager(env, { wait: async () => {}, rename: async () => { throw fileError('EPERM') }, rm: async () => { throw fileError('EACCES') } })
  await assert.rejects(manager.install({ url: 'acme/skills', names: ['alpha'] }), (error) => error.code === 'EPERM' && /暂存清理失败/.test(error.message) && /EACCES/.test(error.message))
  assert.equal((await readdir(join(dirname(env.statePath), 'staging'))).length, 1)
  assert.deepEqual(await readdir(env.root), [])
})

test('direct add resolves the actual metadata name and installs exactly one disabled online skill', async (t) => {
  const env = await environment(t)
  const snapshot = new Map(env.first)
  snapshot.set('skills/catalog-slug/SKILL.md', markdown('actual-name'))
  env.versions.set(A, snapshot)
  const result = await env.rpc('source.add', { url: 'https://www.skills.sh/acme/skills/catalog-slug', enabled: true, name: 'wrong-guessed-name' })
  assert.deepEqual([result.name, result.added, result.existing, result.enabled], ['actual-name', true, false, false])
  assert.equal(result.sourceUrl, 'https://github.com/acme/skills')
  assert.equal(result.directoryUrl, 'https://www.skills.sh/acme/skills/catalog-slug')
  assert.deepEqual(await readdir(env.root), ['actual-name'])
  const row = (await env.rpc('catalog')).skills.rows[0]
  assert.deepEqual([row.origin, row.managed, row.modelInvocable, row.userInvocable], ['online', true, false, false])
  assert.equal(JSON.parse(await readFile(env.statePath, 'utf8')).installations['actual-name'].enabled, false)
  assert.match(await readFile(row.path, 'utf8'), /disable-model-invocation: true/)
  assert.match(await readFile(row.path, 'utf8'), /user-invocable: false/)
})

test('all fresh source.install calls stay disabled even when enabled:true is supplied', async (t) => {
  const env = await environment(t)
  await env.rpc('source.install', { url: 'acme/skills', names: ['alpha'], enabled: true })
  await env.rpc('source.install', { url: 'acme/skills', names: ['beta'] })
  const catalog = await env.rpc('catalog')
  assert.deepEqual(catalog.skills.rows.map((row) => [row.name, row.modelInvocable, row.userInvocable]), [['alpha', false, false], ['beta', false, false]])
  const state = JSON.parse(await readFile(env.statePath, 'utf8'))
  assert.deepEqual(Object.values(state.installations).map((record) => record.enabled), [false, false])
})

test('direct add is idempotent and never resets a manually enabled skill or its update preference', async (t) => {
  const env = await environment(t), url = 'https://skills.sh/acme/skills/alpha'
  await env.rpc('source.add', { url })
  await env.rpc('skill.setInvocation', { name: 'alpha', enabled: true })
  const before = await readFile(env.statePath, 'utf8'), instruction = join(env.root, 'alpha', 'SKILL.md')
  const original = await readFile(instruction, 'utf8')
  const result = await env.rpc('source.add', { url, enabled: false })
  assert.deepEqual([result.name, result.added, result.existing, result.enabled], ['alpha', false, true, true])
  assert.equal(await readFile(env.statePath, 'utf8'), before, 'duplicate add does not rewrite source or installation metadata')
  assert.equal(await readFile(instruction, 'utf8'), original)
  const next = new Map(env.first); next.set('skills/alpha/SKILL.md', markdown('alpha', 'new bytes')); env.versions.set(B, next); env.setCurrent(B)
  await env.rpc('skill.update', { name: 'alpha' })
  const row = (await env.rpc('catalog')).skills.rows[0]
  assert.deepEqual([row.modelInvocable, row.userInvocable], [true, true], 'upstream update preserves the manually selected enabled state')
})

test('direct add rejects even identical local skills instead of silently associating them', async (t) => {
  const env = await environment(t)
  for (const [path, text] of env.first) {
    if (!path.startsWith('skills/alpha/')) continue
    const target = join(env.root, 'alpha', path.slice('skills/alpha/'.length))
    await mkdir(dirname(target), { recursive: true }); await writeFile(target, text)
  }
  const instruction = join(env.root, 'alpha', 'SKILL.md'), original = await readFile(instruction, 'utf8')
  await env.error('source.add', { url: 'https://skills.sh/acme/skills/alpha', associate: true }, /不会自动关联或覆盖/)
  assert.equal(await readFile(instruction, 'utf8'), original)
  await assert.rejects(readFile(env.statePath), { code: 'ENOENT' })
})

test('direct add refuses a same-name different directory or different repository without overwriting', async (t) => {
  const env = await environment(t)
  await env.rpc('source.add', { url: 'https://skills.sh/acme/skills/alpha' })
  const before = await readFile(env.statePath, 'utf8'), instruction = join(env.root, 'alpha', 'SKILL.md')
  const original = await readFile(instruction, 'utf8')
  const snapshot = new Map(env.first); snapshot.set('skills/beta/SKILL.md', markdown('alpha', 'different skill directory')); env.versions.set(A, snapshot)
  await env.error('source.add', { url: 'https://skills.sh/acme/skills/beta' }, /不会自动关联或覆盖/)
  const normalFetch = globalThis.fetch
  globalThis.fetch = (url, options) => normalFetch(String(url).replace('/repos/other/skills', '/repos/acme/skills').replace('raw.githubusercontent.com/other/skills', 'raw.githubusercontent.com/acme/skills'), options)
  await env.error('source.add', { url: 'https://skills.sh/other/skills/alpha' }, /不会自动关联或覆盖/)
  assert.equal(await readFile(env.statePath, 'utf8'), before)
  assert.equal(await readFile(instruction, 'utf8'), original)
})

test('direct add rejects non-specific or ambiguous requests without publishing a skill', async (t) => {
  const env = await environment(t)
  const requests = env.requests.length
  await env.error('source.add', { url: 'https://skills.sh/acme/skills' }, /单技能详情/)
  await env.error('source.add', { url: 'https://github.com/acme/skills' }, /单技能详情/)
  assert.equal(env.requests.length, requests)
  const snapshot = new Map(env.first); snapshot.set('nested/alpha/SKILL.md', markdown('another-alpha')); env.versions.set(A, snapshot)
  await env.error('source.add', { url: 'https://skills.sh/acme/skills/alpha' }, /多个目录/)
  await assert.rejects(readFile(env.statePath), { code: 'ENOENT' })
})

test('direct add failures roll back the published skill and do not record an installation', async (t) => {
  const env = await environment(t)
  const manager = directManager(env, { wait: async () => {}, rename: async (from, to) => { if (to === env.statePath) throw fileError('EIO'); return nativeRename(from, to) } })
  await assert.rejects(manager.add({ url: 'https://skills.sh/acme/skills/alpha' }), { code: 'EIO' })
  assert.deepEqual(await readdir(env.root), [])
  assert.deepEqual(await readdir(join(dirname(env.statePath), 'staging')), [])
  await assert.rejects(readFile(env.statePath), { code: 'ENOENT' })
})

test('simultaneous direct adds serialize once and return the existing disabled skill on the second request', async (t) => {
  const env = await environment(t), url = 'https://skills.sh/acme/skills/alpha'
  const results = await Promise.all([env.rpc('source.add', { url }), env.rpc('source.add', { url })])
  assert.deepEqual(results.map((result) => [result.added, result.existing, result.enabled]), [[true, false, false], [false, true, false]])
  assert.equal((await env.rpc('catalog')).skills.rows.length, 1)
})
