/**
 * Component maintenance for the capability center.
 *
 * A "component" is a bundle this profile installed from the npm registry
 * (`source` is `name` or `name@version`). Git, link, file, tarball and alias
 * sources have no registry version to move to, so they are reported as skipped
 * with the reason instead of being silently dropped.
 *
 * The registry read lives here because the browser cannot call npm cross-site.
 * The update itself is delegated to the host plugin manager's `updateBundle`,
 * which already removes the installed copy, installs the exact target and
 * restores the previous one when the target fails.
 */

const REGISTRIES = ['https://registry.npmjs.org/', 'https://registry.npmmirror.com/']
const STABLE = /^\d+\.\d+\.\d+$/
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const NPM_NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/
const TIMEOUT_MS = 8000
const CACHE_MS = 60_000
const CONCURRENCY = 8

/** Semver comparison: numeric release part first, then a release outranks a prerelease. */
export function compareVersions(a, b) {
  const [ra, pa = ''] = String(a).split('-', 2)
  const [rb, pb = ''] = String(b).split('-', 2)
  const na = ra.split('.').map(Number)
  const nb = rb.split('.').map(Number)
  for (let i = 0; i < 3; i += 1) {
    const x = na[i] || 0
    const y = nb[i] || 0
    if (x !== y) return x < y ? -1 : 1
  }
  if (pa === pb) return 0
  if (!pa) return 1
  if (!pb) return -1
  const ia = pa.split('.')
  const ib = pb.split('.')
  for (let i = 0; i < Math.max(ia.length, ib.length); i += 1) {
    if (ia[i] === undefined) return -1
    if (ib[i] === undefined) return 1
    const xn = /^\d+$/.test(ia[i])
    const yn = /^\d+$/.test(ib[i])
    if (xn && yn && Number(ia[i]) !== Number(ib[i])) return Number(ia[i]) < Number(ib[i]) ? -1 : 1
    if (xn !== yn) return xn ? -1 : 1
    if (ia[i] !== ib[i]) return ia[i] < ib[i] ? -1 : 1
  }
  return 0
}

/** True when `latest` is a strictly newer release than `installed`. */
export function isNewer(latest, installed) {
  if (!latest || !installed || !SEMVER.test(latest) || !SEMVER.test(installed)) return false
  return compareVersions(latest, installed) > 0
}

/**
 * Classify an install source: `{kind: 'registry'}` for `name` / `name@<version|range|tag>`,
 * otherwise `{kind, reason}` naming why it cannot be updated from a registry.
 */
export function classifySource(bundleName, source) {
  if (typeof source !== 'string' || !source) return { kind: 'unknown', reason: 'no-source' }
  const s = source.trim()
  if (/^(github:|gitlab:|bitbucket:|gist:|git\+|git:)/i.test(s) || /\.git(#|$)/i.test(s)) return { kind: 'git', reason: 'git' }
  if (/^link:/i.test(s)) return { kind: 'link', reason: 'link' }
  if (/^(file:|workspace:)/i.test(s) || /^[a-z]:[\\/]/i.test(s) || s.startsWith('.') || s.startsWith('/')) return { kind: 'file', reason: 'file' }
  if (/^[a-z]+:\/\//i.test(s)) return { kind: 'url', reason: 'url' }
  if (s === bundleName) return { kind: 'registry' }
  if (s.startsWith(`${bundleName}@`)) {
    const rest = s.slice(bundleName.length + 1)
    if (rest && !/[:/\\]/.test(rest)) return { kind: 'registry' }
  }
  if (/^npm:/i.test(s)) return { kind: 'alias', reason: 'alias' }
  return { kind: 'unknown', reason: 'unrecognised' }
}

/** Split the plugin manager's bundle list into registry-updatable components and skipped ones. */
export function candidatesOf(bundles) {
  const packages = []
  const skipped = []
  for (const bundle of Array.isArray(bundles) ? bundles : []) {
    if (!bundle || typeof bundle.name !== 'string') continue
    if (bundle.availability !== 'profile' || bundle.installed === false) continue
    const kind = classifySource(bundle.name, bundle.source)
    if (kind.kind === 'registry' && NPM_NAME.test(bundle.name)) {
      packages.push({
        name: bundle.name,
        source: bundle.source,
        installed: typeof bundle.version === 'string' ? bundle.version : null,
        enabled: bundle.enabled !== false,
        description: typeof bundle.description === 'string' ? bundle.description : '',
        rows: Array.isArray(bundle.rows) ? bundle.rows.map((row) => row && row.moduleName).filter(Boolean) : [],
      })
    } else {
      skipped.push({ name: bundle.name, source: bundle.source ?? null, version: bundle.version ?? null, reason: kind.reason })
    }
  }
  return { packages, skipped }
}

/** Read one registry for one package. Never throws. */
export async function readRegistry(base, packageName, doFetch) {
  const started = Date.now()
  const done = (extra) => ({ registry: base, ms: Date.now() - started, ...extra })
  try {
    const response = await doFetch(base + packageName.replace('/', '%2F'), {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'error',
    })
    if (response.status === 404) return done({ error: 'not on registry' })
    if (!response.ok) return done({ error: `HTTP ${response.status}` })
    const body = await response.json()
    const latest = body?.['dist-tags']?.latest
    if (body?.name !== packageName || typeof latest !== 'string' || !SEMVER.test(latest)) return done({ error: 'unexpected answer' })
    const published = body?.time?.[latest]
    const publishedAt = typeof published === 'string' && !Number.isNaN(Date.parse(published)) ? new Date(published).toISOString() : undefined
    return done({ version: latest, stable: STABLE.test(latest), ...(publishedAt ? { publishedAt } : {}) })
  } catch (error) {
    const reason = error?.name === 'TimeoutError' || error?.name === 'AbortError'
      ? 'timeout'
      : String(error?.cause?.code ?? error?.message ?? error).slice(0, 120)
    return done({ error: reason })
  }
}

/** Ask every registry at once and keep the newest version reported (a mirror can lag behind npm). */
export async function latestOf(packageName, doFetch, registers = REGISTRIES) {
  const sources = await Promise.all(registers.map((base) => readRegistry(base, packageName, doFetch)))
  const answered = sources.filter((source) => source.version)
  if (!answered.length) {
    return { name: packageName, error: [...new Set(sources.map((source) => source.error).filter(Boolean))].join(' / ') || 'no answer' }
  }
  const best = answered.reduce((a, b) => (compareVersions(b.version, a.version) > 0 ? b : a))
  return {
    name: packageName,
    latest: best.version,
    stable: best.stable,
    registry: best.registry,
    ...(best.publishedAt ? { publishedAt: best.publishedAt } : {}),
  }
}

async function mapLimit(items, limit, operation) {
  const results = new Array(items.length)
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await operation(items[index], index)
    }
  }))
  return results
}

/**
 * @param manager - the host `pluginManager` service (`listBundles`, `updateBundle`).
 * @param doFetch - fetch implementation; injected by tests.
 */
export function createComponents({ manager, doFetch = (...args) => globalThis.fetch(...args), now = Date.now, cacheMs = CACHE_MS }) {
  const cache = new Map()
  let updating = null

  async function latestFor(packageName, force) {
    const hit = cache.get(packageName)
    if (!force && hit && now() - hit.at < cacheMs) return hit.value
    const value = await latestOf(packageName, doFetch)
    if (!value.error) cache.set(packageName, { at: now(), value })
    return value
  }

  async function list({ force = false } = {}) {
    if (typeof manager?.listBundles !== 'function') return { supported: false, reason: 'pluginManager is not mounted', packages: [], skipped: [] }
    const bundles = await manager.listBundles()
    const { packages, skipped } = candidatesOf(bundles)
    const answers = await mapLimit(packages, CONCURRENCY, (target) => latestFor(target.name, force))
    return {
      supported: true,
      at: new Date().toISOString(),
      packages: packages.map((target, index) => {
        const answer = answers[index] || {}
        return {
          ...target,
          ...(answer.latest ? { latest: answer.latest, stable: answer.stable !== false } : {}),
          ...(answer.publishedAt ? { publishedAt: answer.publishedAt } : {}),
          ...(answer.registry ? { registry: answer.registry } : {}),
          ...(answer.error ? { error: answer.error } : {}),
          updateAvailable: !answer.error && isNewer(answer.latest, target.installed),
        }
      }),
      skipped,
    }
  }

  /** Update one component to its newest release on the registry it already reported. */
  async function update({ name } = {}) {
    if (typeof manager?.listBundles !== 'function') throw new Error('这个应用没有可用的插件管理器，无法更新组件')
    if (typeof manager?.updateBundle !== 'function') throw new Error('当前宿主不支持按版本更新组件')
    const wanted = String(name || '').trim()
    if (!NPM_NAME.test(wanted)) throw new Error('组件名无效')
    if (updating) throw new Error(`正在更新 ${updating}，请等待完成后再试`)
    updating = wanted
    try {
      // The registry answer is re-read here: the browser must not choose the target version.
      const answer = await latestFor(wanted, true)
      if (answer.error) throw new Error(`无法读取 ${wanted} 的最新版本：${answer.error}`)
      if (!SEMVER.test(answer.latest || '')) throw new Error('registry 返回的版本号无效')
      const result = await manager.updateBundle(wanted, answer.latest)
      cache.delete(wanted)
      const application = result?.application
      const failure = result?.error
      return {
        name: wanted,
        version: answer.latest,
        application: application ?? 'unknown',
        step: result?.step ?? null,
        ...(failure ? { error: { code: failure.code ?? null, diagnostic: failure.diagnostic ?? String(failure) } } : {}),
        ...(result?.nextStep ? { nextStep: result.nextStep } : {}),
        warnings: Array.isArray(result?.warnings) ? result.warnings.filter((warning) => typeof warning === 'string') : [],
      }
    } finally {
      updating = null
    }
  }

  return { list, update }
}
