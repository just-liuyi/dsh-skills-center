import { createHash, randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { setTimeout as wait } from 'node:timers/promises'

// All RPC callers share this queue, including legacy local skill writes. Never nest it.
let queue = Promise.resolve()
export function serializeSkills(operation) {
  const next = queue.then(operation, operation)
  queue = next.then(() => undefined, () => undefined)
  return next
}
const previews = new Map()
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_FILE = 4 * 1024 * 1024
const MAX_PACKAGE = 24 * 1024 * 1024
const MAX_FILES = 600
const MAX_SKILLS = 100
const MAX_RESPONSE = 12 * 1024 * 1024
const DIRECTORY_ORIGIN = 'https://www.skills.sh'
const MAX_DIRECTORY_RESPONSE = 2 * 1024 * 1024
const hash = (value) => createHash('sha256').update(value).digest('hex')
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key)
const RENAME_DELAYS = [50, 100, 200, 400, 800]
const RENAME_LOCK_ERRORS = new Set(['EPERM', 'EBUSY', 'EACCES'])
const renameBudget = () => ({ remainingMs: 1800 })

// File-function injection is for isolated failure tests; no runtime Service is involved.
export async function renameWithRetry(from, to, options = {}) {
  const operation = options.operation || '重命名'
  const renameOperation = options.renameOperation || rename
  const delay = options.wait || wait
  const budget = options.budget || renameBudget()
  for (let attempt = 0; ; attempt++) {
    try {
      if (options.beforeAttempt) await options.beforeAttempt()
      await renameOperation(from, to)
      return
    } catch (cause) {
      const pause = RENAME_DELAYS[attempt]
      if (RENAME_LOCK_ERRORS.has(cause?.code) && pause !== undefined && budget.remainingMs >= pause) {
        budget.remainingMs -= pause
        await delay(pause)
        continue
      }
      const reason = cause?.code === 'EXDEV'
        ? '暂存目录与技能目录不在同一卷，未使用复制覆盖降级'
        : RENAME_LOCK_ERRORS.has(cause?.code)
          ? 'Windows 拒绝重命名，可能被其他进程占用或受到权限限制'
          : String(cause?.message || cause)
      const error = new Error(`${operation}失败：${reason}（${cause?.code || 'UNKNOWN'}，已重试 ${attempt} 次）。`, { cause })
      error.code = cause?.code
      error.retries = attempt
      throw error
    }
  }
}

export async function assertSameVolume(first, second, options = {}) {
  const resolvePhysical = options.realpath || realpath
  const inspect = options.stat || stat
  const [physicalFirst, physicalSecond] = await Promise.all([resolvePhysical(first), resolvePhysical(second)])
  const [firstStat, secondStat] = await Promise.all([inspect(physicalFirst), inspect(physicalSecond)])
  if (firstStat.dev !== secondStat.dev) {
    const error = new Error('暂存目录与技能目录不在同一卷（EXDEV），未移动原技能，也未使用复制覆盖降级')
    error.code = 'EXDEV'
    throw error
  }
  return { first: physicalFirst, second: physicalSecond }
}

function appendFailure(primary, message, cause) {
  primary.message += `；${message}：${cause?.message || cause}`
  return primary
}

async function assertAbsent(path) {
  try { await lstat(path) } catch (error) { if (error.code === 'ENOENT') return; throw error }
  const error = new Error('目标路径已存在，未覆盖已有内容')
  error.code = 'EEXIST'
  throw error
}


export function safeRepoPath(value, allowEmpty = false) {
  if (allowEmpty && value === '') return value
  if (typeof value !== 'string' || !value || value.length > 1000) throw new Error('invalid repository path')
  for (const part of value.split('/')) {
    if (!part || part === '.' || part === '..' || /[\\\x00-\x1f<>:"|?*]/.test(part) || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)) {
      throw new Error(`unsafe repository path: ${value}`)
    }
  }
  return value
}

export function parseGitHubSource(input) {
  let text = String(input || '').trim()
  if (/^[\w.-]+\/[\w.-]+$/.test(text)) text = `https://github.com/${text}`
  let url
  try { url = new URL(text) } catch { throw new Error('请输入 GitHub 仓库网址或 owner/repo') }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.hash) throw new Error('目前仅支持公开的 https://github.com 来源')
  const parts = url.pathname.replace(/\/$/, '').split('/').slice(1).map((part) => decodeURIComponent(part))
  const [owner, repository, kind, ...tail] = parts
  const repo = repository?.replace(/\.git$/, '')
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(owner || '') || !/^[A-Za-z0-9_.-]+$/.test(repo || '') || repo === '.' || repo === '..') throw new Error('invalid GitHub repository')
  let ref = url.searchParams.get('ref') || null
  let subdir = ''
  let single = false
  if (kind) {
    if (!['tree', 'blob'].includes(kind) || tail.length < 1) throw new Error('支持仓库、tree 子目录及 blob SKILL.md 地址')
    const pathRef = tail.shift()
    ref ||= pathRef
    subdir = tail.join('/')
    if (kind === 'blob') {
      if (!subdir.endsWith('SKILL.md') || subdir.split('/').at(-1) !== 'SKILL.md') throw new Error('blob 地址必须指向 SKILL.md')
      subdir = subdir.split('/').slice(0, -1).join('/')
      single = true
    }
  }
  if (ref && (ref.length > 200 || /[\x00-\x20~^:?*\[\\]/.test(ref) || ref.includes('..') || ref.startsWith('/') || ref.endsWith('/'))) throw new Error('invalid Git ref')
  safeRepoPath(subdir, true)
  // A slash-containing ref is supplied explicitly with ?ref=feature%2Fbranch.
  const canonical = `https://github.com/${owner}/${repo}` + (kind ? `/${kind}/${encodeURIComponent(ref || 'HEAD')}/${subdir ? subdir.split('/').map(encodeURIComponent).join('/') + (single ? '/' : '') : ''}${single ? 'SKILL.md' : ''}` : '') + (!kind && ref ? `?ref=${encodeURIComponent(ref)}` : '')
  return { owner, repo, ref, subdir, single, url: canonical, label: `${owner}/${repo}`, id: `github-${hash(`${owner.toLowerCase()}/${repo.toLowerCase()}\n${ref || ''}\n${subdir}\n${single}`).slice(0, 20)}` }
}

export function parseSource(input) {
  const text = String(input || '').trim()
  let url
  try { url = new URL(text) } catch { return parseGitHubSource(text) }
  if (!['skills.sh', 'www.skills.sh'].includes(url.hostname)) return parseGitHubSource(text)
  if (url.protocol !== 'https:' || url.port || url.username || url.password || url.hash || url.search) throw new Error('skills.sh 来源必须是标准 HTTPS 详情地址')
  const parts = url.pathname.replace(/\/$/, '').split('/').slice(1).map((part) => decodeURIComponent(part))
  if (!parts.length || parts.every((part) => !part)) throw new Error('skills.sh 首页是技能目录，请使用搜索入口查找技能')
  if (parts.length !== 2 && parts.length !== 3) throw new Error('请输入 skills.sh/owner/repo/skill 的技能详情地址')
  const [owner, repo, skill] = parts
  if (owner === 'site') throw new Error('该 skills.sh 条目来自网站域名，当前仅支持 GitHub 仓库技能')
  const source = parseGitHubSource(`${owner}/${repo}`)
  if (skill && !NAME.test(skill)) throw new Error('skills.sh 技能标识格式无效')
  const directoryUrl = `${DIRECTORY_ORIGIN}/${source.owner}/${source.repo}${skill ? `/${skill}` : ''}`
  return { ...source, discoveredVia: 'skills.sh', directoryUrl, ...(skill ? { directorySkill: skill } : {}) }
}

export function parseSkillMetadata(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text)
  if (!match) throw new Error('SKILL.md 缺少 YAML frontmatter')
  const lines = match[1].split(/\r?\n/)
  const data = {}
  for (let i = 0; i < lines.length; i++) {
    const entry = /^([\w-]+):\s*(.*)$/.exec(lines[i])
    if (!entry) continue
    let value = entry[2].trim()
    if (/^[>|][-+]?$/.test(value)) {
      const folded = value.startsWith('>')
      const continuation = []
      while (i + 1 < lines.length && (/^\s+/.test(lines[i + 1]) || !lines[i + 1].trim())) continuation.push(lines[++i].trim())
      value = continuation.join(folded ? ' ' : '\n').trim()
    } else if (value.startsWith('"') && value.endsWith('"')) {
      try { value = JSON.parse(value) } catch { throw new Error('invalid quoted frontmatter') }
    } else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1).replace(/''/g, "'")
    data[entry[1]] = value
  }
  if (!NAME.test(data.name || '') || !data.description) throw new Error('Skill 需要有效的 kebab-case name 和 description')
  return data
}

function invocation(text) {
  const data = parseSkillMetadata(text)
  return { modelInvocable: !/^(true|yes|on|1)$/i.test(data['disable-model-invocation'] || ''), userInvocable: !/^(false|no|off|0)$/i.test(data['user-invocable'] || '') }
}
function setInvocationText(text, enabled, original) {
  const match = /^(---\r?\n)([\s\S]*?)(\r?\n---[ \t]*(?:\r?\n|$))/.exec(text)
  if (!match) throw new Error('invalid skill frontmatter')
  const lines = match[2].split(/\r?\n/).filter((line) => !/^(disable-model-invocation|user-invocable)\s*:/.test(line))
  if (!enabled) lines.push('disable-model-invocation: true')
  if (!enabled || original.userInvocable === false) lines.push('user-invocable: false')
  return `${match[1]}${lines.join('\n')}${match[3]}${text.slice(match[0].length)}`
}
function normalizedFile(path, buffer) {
  if (buffer.includes(0)) return buffer
  let text = buffer.toString('utf8').replace(/\r\n/g, '\n')
  if (path === 'SKILL.md') {
    const match = /^(---\n)([\s\S]*?)(\n---[ \t]*(?:\n|$))/.exec(text)
    if (match) text = `${match[1]}${match[2].split('\n').filter((line) => !/^(disable-model-invocation|user-invocable)\s*:/.test(line)).join('\n')}${match[3]}${text.slice(match[0].length)}`
  }
  return Buffer.from(text)
}
export function packageHash(files) {
  const digest = createHash('sha256')
  for (const path of [...files.keys()].sort()) {
    const bytes = normalizedFile(path, files.get(path))
    digest.update(path).update('\0').update(String(bytes.length)).update('\0').update(bytes)
  }
  return digest.digest('hex')
}
async function diskFiles(dir) {
  const files = new Map()
  let size = 0
  async function visit(base, prefix) {
    const entries = await readdir(base, { withFileTypes: true })
    for (const entry of entries) {
      const path = prefix + entry.name
      safeRepoPath(path)
      const full = join(base, entry.name)
      const stat = await lstat(full)
      if (stat.isSymbolicLink()) throw new Error('技能目录包含符号链接，无法安全关联或更新')
      if (stat.isDirectory()) await visit(full, `${path}/`)
      else if (stat.isFile()) {
        if (stat.size > MAX_FILE || (size += stat.size) > MAX_PACKAGE || files.size >= MAX_FILES) throw new Error('技能包超过大小限制')
        files.set(path, await readFile(full))
      } else throw new Error('技能包含不支持的文件类型')
    }
  }
  const stat = await lstat(dir)
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('技能目录必须是普通目录')
  await visit(dir, '')
  return files
}

async function limitedFetch(url, limit = MAX_RESPONSE, service = 'GitHub') {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(url, { headers: { Accept: service === 'GitHub' ? 'application/vnd.github+json' : 'application/json', 'User-Agent': 'dsh-skills-center' }, signal: controller.signal, redirect: 'error' })
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) throw new Error(`${service} 请求限额或访问限制，请稍后重试`)
      throw new Error(`${service} HTTP ${response.status}`)
    }
    const declared = Number(response.headers.get('content-length'))
    if (declared > limit) throw new Error(`${service} 响应超过大小限制`)
    const chunks = []
    let size = 0
    if (!response.body) throw new Error(`${service} 响应为空`)
    for await (const chunk of response.body) {
      size += chunk.length
      if (size > limit) { controller.abort(); throw new Error(`${service} 响应超过大小限制`) }
      chunks.push(Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  } catch (error) {
    if (controller.signal.aborted && (error?.name === 'AbortError' || error?.code === 'ABORT_ERR')) throw new Error(`${service} 请求超时，请稍后重试`)
    throw error
  } finally { clearTimeout(timer) }
}
async function api(path) { return JSON.parse((await limitedFetch(`https://api.github.com${path}`)).toString('utf8')) }
async function raw(source, path) {
  return limitedFetch(`https://raw.githubusercontent.com/${source.owner}/${source.repo}/${source.commit}/${path.split('/').map(encodeURIComponent).join('/')}`, MAX_FILE)
}
function packageEntries(source, skill) {
  const prefix = skill.path ? `${skill.path}/` : ''
  const files = source.files.filter((item) => item.path.startsWith(prefix) && item.type !== 'tree')
  if (!files.length || files.length > MAX_FILES) throw new Error('技能包文件数量超过限制')
  let bytes = 0
  const lower = new Set()
  for (const item of files) {
    const path = safeRepoPath(item.path.slice(prefix.length))
    if (item.type !== 'blob' || !['100644', '100755'].includes(item.mode)) throw new Error(`技能包不支持符号链接或子模块: ${item.path}`)
    if (!Number.isSafeInteger(item.size) || item.size < 0 || item.size > MAX_FILE || (bytes += item.size) > MAX_PACKAGE) throw new Error('技能包超过大小限制')
    if (lower.has(path.toLowerCase())) throw new Error('技能包存在大小写冲突路径')
    lower.add(path.toLowerCase())
  }
  return files
}
async function mapLimit(items, count, operation) {
  const results = new Array(items.length)
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(count, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await operation(items[index], index)
    }
  }))
  return results
}
async function download(source, skill) {
  const files = new Map()
  let total = 0
  await mapLimit(packageEntries(source, skill), 5, async (entry) => {
    const content = await raw(source, entry.path)
    if (content.length !== entry.size) throw new Error(`文件大小不一致: ${entry.path}`)
    // Verify Git object identity as well as pinning the raw URL to a full commit SHA.
    const gitHash = createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex')
    if (gitHash !== entry.sha) throw new Error(`GitHub 文件校验失败: ${entry.path}`)
    if ((total += content.length) > MAX_PACKAGE) throw new Error('技能包超过大小限制')
    files.set(entry.path.slice(skill.path ? skill.path.length + 1 : 0), content)
  })
  return files
}
function upstreamHash(source, skill) {
  const prefix = skill.path ? skill.path.length + 1 : 0
  return hash(packageEntries(source, skill).map((item) => `${item.path.slice(prefix)}\0${item.sha}`).sort().join('\n'))
}
async function discover(url, allowEmpty = false, options = {}) {
  const source = parseSource(url)
  const prefix = `/repos/${source.owner}/${source.repo}`
  const metadata = await api(prefix)
  source.ref ||= metadata.default_branch
  if (!source.ref) throw new Error('无法确定默认分支')
  const commit = await api(`${prefix}/commits/${encodeURIComponent(source.ref)}`)
  if (!/^[0-9a-f]{40}$/.test(commit.sha || '')) throw new Error('invalid GitHub commit')
  source.commit = commit.sha
  const tree = await api(`${prefix}/git/trees/${source.commit}?recursive=1`)
  if (tree.truncated) throw new Error('仓库目录过大，请使用较小的技能仓库')
  if (!Array.isArray(tree.tree) || tree.tree.length > 30000) throw new Error('仓库目录超过扫描限制')
  source.files = tree.tree.filter((entry) => !source.subdir || entry.path === source.subdir || entry.path.startsWith(`${source.subdir}/`))
  let docs = source.files.filter((item) => item.type === 'blob' && item.path.split('/').at(-1) === 'SKILL.md' && (!source.single || item.path === `${source.subdir ? `${source.subdir}/` : ''}SKILL.md`))
  source.totalSkills = docs.length
  if (options.targeted && Array.isArray(options.targetPaths)) {
    const paths = new Set(options.targetPaths)
    docs = docs.filter((doc) => paths.has(doc.path.split('/').slice(0, -1).join('/')))
    source.partial = true
  }
  if (source.directorySkill) {
    const exactDirectories = docs.filter((doc) => doc.path.split('/').at(-2) === source.directorySkill)
    if (exactDirectories.length > 1) throw new Error('该 skills.sh 技能标识对应多个目录，请使用明确的 GitHub 技能子目录地址')
    if (exactDirectories.length === 1) {
      docs = exactDirectories
      source.partial = true
    }
  }
  if (!docs.length && !allowEmpty) throw new Error('来源中未发现标准 SKILL.md')
  if (docs.length > MAX_SKILLS) {
    const paths = new Set(options.targetPaths || [])
    const names = new Set([source.directorySkill, ...(options.targetNames || [])].filter(Boolean))
    if (!paths.size && !names.size) throw new Error('来源技能数量超过限制，请指定 tree 子目录或 skills.sh 技能详情地址')
    docs = docs.filter((doc) => {
      const path = doc.path.split('/').slice(0, -1).join('/')
      return paths.has(path) || names.has(path.split('/').at(-1))
    })
    source.partial = true
    if (!docs.length && !allowEmpty) throw new Error('未找到该技能的匹配目录，请使用 GitHub 技能子目录地址')
    if (docs.length > MAX_SKILLS) throw new Error('匹配的技能目录过多，请使用 GitHub 技能子目录地址')
  }
  const names = new Set()
  source.skills = await mapLimit(docs, 5, async (doc) => {
    const path = doc.path.split('/').slice(0, -1).join('/')
    const candidate = { path }
    const fingerprint = upstreamHash(source, candidate)
    const bytes = await raw(source, safeRepoPath(doc.path))
    const data = parseSkillMetadata(bytes.toString('utf8'))
    if (names.has(data.name)) throw new Error(`来源包含重名技能: ${data.name}`)
    names.add(data.name)
    const selected = Boolean(source.directorySkill && (path.split('/').at(-1) === source.directorySkill || data.name === source.directorySkill))
    return { name: data.name, description: data.description, path, upstreamHash: fingerprint, ...(selected ? { directoryUrl: source.directoryUrl } : {}) }
  })
  if (source.directorySkill && !source.skills.some((skill) => skill.directoryUrl) && !allowEmpty) throw new Error('GitHub 仓库中未找到该 skills.sh 技能，请刷新搜索结果或使用仓库地址')
  source.checkedAt = new Date().toISOString()
  return source
}

export function createSourcesManager({ home, listLocal, fileOperations = {} }) {
  const root = join(home, 'skills')
  const managerRoot = join(home, 'dsh-skills-center')
  const privateRoot = join(managerRoot, 'staging')
  const statePath = join(managerRoot, 'sources.json')
  const io = { rename, stat, realpath, rm, wait, ...fileOperations }
  const owned = new Map()
  async function privateSlot(kind, identity) {
    await mkdir(root, { recursive: true })
    await mkdir(managerRoot, { recursive: true })
    if ((await lstat(managerRoot)).isSymbolicLink()) throw new Error('技能中心数据目录不能是目录链接')
    await mkdir(privateRoot, { recursive: true, mode: 0o700 })
    if ((await lstat(privateRoot)).isSymbolicLink()) throw new Error('技能暂存目录不能是目录链接')
    const physical = await assertSameVolume(root, privateRoot, io)
    if (physical.second === physical.first || physical.second.startsWith(`${physical.first}${sep}`)) throw new Error('技能暂存目录必须位于技能扫描目录之外')
    const path = join(privateRoot, `${kind}-${randomUUID()}`)
    await assertAbsent(path)
    if (kind === 'stage') { await mkdir(path, { mode: 0o700 }); identity = await lstat(path) }
    owned.set(path, { identity, parent: physical.second })
    return path
  }
  async function move(from, to, operation, budget, mustBeAbsent = false) {
    return renameWithRetry(from, to, {
      operation, budget, renameOperation: io.rename, wait: io.wait,
      beforeAttempt: async () => {
        await assertSameVolume(dirname(from), dirname(to), io)
        if (mustBeAbsent) await assertAbsent(to)
      },
    })
  }
  async function removeOwned(path, identity) {
    let current
    try { current = await lstat(path) } catch (error) { if (error.code === 'ENOENT') return; throw error }
    if (!identity || current.isSymbolicLink() || current.dev !== identity.dev || current.ino !== identity.ino) throw new Error('目录身份已改变，保留当前内容，未执行清理')
    await io.rm(path, { recursive: current.isDirectory(), force: true, maxRetries: 3, retryDelay: 50 })
  }
  async function cleanupPrivate(path, primary) {
    if (!path) return
    try {
      const slot = owned.get(path)
      if (!slot || dirname(resolve(path)) !== resolve(privateRoot) || !/^(stage|backup|remove)-[0-9a-f-]{36}$/.test(path.slice(privateRoot.length + 1))) throw new Error('拒绝清理非本次事务拥有的暂存路径')
      if ((await io.realpath(privateRoot)) !== slot.parent) throw new Error('暂存父目录已改变，未执行清理')
      await removeOwned(path, slot.identity)
    } catch (error) {
      if (primary) appendFailure(primary, `暂存清理失败，保留路径 ${path}`, error)
      else throw new Error(`操作已完成，但暂存清理失败，保留路径 ${path}：${error.message}`, { cause: error })
    }
  }
  async function cleanupPublished(plan, primary) {
    try { await assertDirectory(plan.directory); await removeOwned(plan.directory, plan.identity) }
    catch (error) { appendFailure(primary, `安装回滚清理失败，保留路径 ${plan.directory}`, error) }
  }
  async function readState() {
    let text
    try { text = await readFile(statePath, 'utf8') } catch (error) { if (error.code === 'ENOENT') return { version: 1, sources: [], installations: {}, invocations: {} }; throw error }
    let state
    try { state = JSON.parse(text) } catch { throw new Error('在线来源记录已损坏，未修改任何来源数据') }
    if (state.version !== 1 || !Array.isArray(state.sources) || !state.installations || typeof state.installations !== 'object' || Array.isArray(state.installations) || !state.invocations || typeof state.invocations !== 'object' || Array.isArray(state.invocations)) throw new Error('在线来源记录格式无效')
    return state
  }
  async function saveState(state, budget = renameBudget()) {
    await mkdir(dirname(statePath), { recursive: true })
    const temp = `${statePath}.${randomUUID()}.tmp`
    let identity, primary
    try {
      await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, { flag: 'wx' })
      identity = await lstat(temp)
      await move(temp, statePath, '保存技能来源记录', budget)
    } catch (error) { primary = error; throw error }
    finally {
      try { await removeOwned(temp, identity) }
      catch (error) {
        if (primary) appendFailure(primary, `元数据临时文件清理失败，保留路径 ${temp}`, error)
        else throw new Error(`来源记录已保存，但临时文件清理失败：${temp}`, { cause: error })
      }
    }
  }
  async function assertDirectory(path) {
    const absolute = resolve(path)
    const rel = relative(resolve(root), absolute)
    if (!rel || rel.startsWith(`..${sep}`) || rel === '..' || resolve(root, rel) !== absolute) throw new Error('技能路径超出用户目录')
    // No parent junctions: a lexical descendant must also be a physical descendant.
    await mkdir(root, { recursive: true })
    const realRoot = await realpath(root)
    let cursor = root
    for (const part of rel.split(sep)) {
      cursor = join(cursor, part)
      try { if ((await lstat(cursor)).isSymbolicLink()) throw new Error('技能路径包含目录链接') } catch (error) { if (error.code !== 'ENOENT') throw error }
    }
    const physicalParent = await realpath(dirname(absolute))
    if (physicalParent !== realRoot && !physicalParent.startsWith(`${realRoot}${sep}`)) throw new Error('技能路径超出用户目录')
    return absolute
  }
  async function localStatus(state, source, skill, rows, verifyAssociation = false) {
    const row = rows.find((item) => item.name === skill.name)
    const install = own(state.installations, skill.name) ? state.installations[skill.name] : null
    const managed = Boolean(install && install.sourceId === source.id && row && resolve(row.path) === resolve(join(install.directory, 'SKILL.md')))
    const item = { ...skill, installed: managed, conflict: null, canAssociate: false, updateAvailable: managed && install.upstreamHash !== skill.upstreamHash, localModified: false }
    if (managed) {
      try { item.localModified = packageHash(await diskFiles(install.directory)) !== install.hash } catch { item.localModified = true }
      item.enabled = install.enabled !== false
    } else if (row || install) {
      item.conflict = install ? '该技能已关联其他来源或被同名技能遮蔽' : '已有同名本地技能，请明确关联来源'
      if (verifyAssociation && row?.writable && !install && row.path.endsWith(`${sep}SKILL.md`)) {
        try {
          await assertDirectory(dirname(row.path))
          const local = await diskFiles(dirname(row.path))
          const entries = packageEntries(source, skill)
          const prefix = skill.path ? skill.path.length + 1 : 0
          let same = local.size === entries.length
          for (const entry of entries) {
            const path = entry.path.slice(prefix)
            const bytes = local.get(path)
            if (!bytes) { same = false; break }
            if (path === 'SKILL.md') {
              if (!normalizedFile(path, bytes).equals(normalizedFile(path, await raw(source, entry.path)))) { same = false; break }
            } else if (createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') !== entry.sha) { same = false; break }
          }
          item.canAssociate = same
        } catch { item.canAssociate = false }
        if (!item.canAssociate) item.conflict = '已有同名技能且内容不同或目录不可关联，不会覆盖'
      }
    }
    return item
  }
  function preserveInstalled(state, previous, source) {
    if (!previous) return source
    source.discoveredVia ||= previous.discoveredVia
    source.directoryUrl ||= previous.directoryUrl
    const directoryUrls = [...new Set([...(previous.directoryUrls || []), previous.directoryUrl, ...(source.directoryUrls || []), source.directoryUrl].filter(Boolean))]
    if (directoryUrls.length) source.directoryUrls = directoryUrls
    source.skills = source.skills.map((skill) => {
      const known = previous.skills.find((item) => item.name === skill.name && item.path === skill.path)
      return !skill.directoryUrl && known?.directoryUrl ? { ...skill, directoryUrl: known.directoryUrl } : skill
    })
    for (const skill of previous.skills) {
      if (source.skills.some((item) => item.name === skill.name)) continue
      const record = own(state.installations, skill.name) && state.installations[skill.name]
      const instruction = `${skill.path ? `${skill.path}/` : ''}SKILL.md`
      if (source.partial && source.files.some((entry) => entry.path === instruction && entry.type === 'blob')) {
        source.skills.push({ ...skill, upstreamHash: upstreamHash(source, skill), upstreamRemoved: false })
      } else if (record?.sourceId === previous.id) source.skills.push({ ...skill, upstreamRemoved: true })
    }
    return source
  }
  function publicSource(source, skills) {
    const { files, ...rest } = source
    return { ...rest, skills }
  }
  async function decorate(catalog) {
    const state = await readState()
    const sources = []
    for (const source of state.sources) sources.push(publicSource(source, await Promise.all(source.skills.map((skill) => localStatus(state, source, skill, catalog.rows)))))
    const rows = catalog.rows.map((row) => {
      const install = own(state.installations, row.name) && state.installations[row.name]
      const source = install && state.sources.find((item) => item.id === install.sourceId)
      const managed = Boolean(source && row.path && resolve(row.path) === resolve(join(install.directory, 'SKILL.md')))
      const status = managed && sources.find((item) => item.id === source.id)?.skills.find((item) => item.name === row.name)
      return { ...row, origin: managed ? 'online' : 'local', sourceId: managed ? source.id : null, sourceLabel: managed ? source.label : null, managed, editable: managed ? false : row.writable, ...(managed ? { updateAvailable: status?.updateAvailable || false, localModified: status?.localModified || false, upstreamRemoved: status?.upstreamRemoved || false } : {}) }
    })
    return { ...catalog, rows, sources }
  }
  async function search(input) {
    if (typeof input.query !== 'string' || !input.query.trim() || input.query.length > 200 || /[\x00-\x1f]/.test(input.query)) throw new Error('请输入 1–200 字符的技能搜索词')
    const query = input.query.trim()
    const owner = input.owner === undefined || input.owner === '' ? null : input.owner
    if (owner !== null && (typeof owner !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(owner))) throw new Error('owner 必须是有效的 GitHub 用户或组织名')
    const endpoint = new URL('/api/search', DIRECTORY_ORIGIN)
    endpoint.searchParams.set('q', query)
    if (owner) endpoint.searchParams.set('owner', owner)
    let result
    try { result = JSON.parse((await limitedFetch(endpoint.href, MAX_DIRECTORY_RESPONSE, 'skills.sh')).toString('utf8')) }
    catch (error) { if (error instanceof SyntaxError) throw new Error('skills.sh 返回了无效 JSON'); throw error }
    if (!result || typeof result !== 'object' || !Array.isArray(result.skills) || result.skills.length > 200 || (result.count !== undefined && (!Number.isSafeInteger(result.count) || result.count < 0))) throw new Error('skills.sh 搜索响应格式无效')
    const state = await readState()
    const { rows } = await listLocal()
    const skills = result.skills.map((entry) => {
      if (!entry || typeof entry !== 'object' || ['id', 'name', 'source'].some((key) => typeof entry[key] !== 'string' || !entry[key].trim() || entry[key].length > 1000 || /[\x00-\x1f]/.test(entry[key])) || !Number.isSafeInteger(entry.installs) || entry.installs < 0) throw new Error('skills.sh 技能结果格式无效')
      const skillId = typeof entry.skillId === 'string' ? entry.skillId : entry.id.split('/').at(-1)
      let repository = null
      try { if (/^[\w.-]+\/[\w.-]+$/.test(entry.source) && NAME.test(skillId)) repository = parseGitHubSource(entry.source) } catch { /* non-GitHub directory sources remain visible but cannot install */ }
      const canonicalId = repository ? `${repository.owner}/${repository.repo}/${skillId}` : !entry.source.includes('/') ? `site/${entry.source}/${skillId}` : entry.id
      const url = `${DIRECTORY_ORIGIN}/${canonicalId.split('/').map(encodeURIComponent).join('/')}`
      const namedRow = rows.find((item) => item.name === skillId)
      const namedRecord = own(state.installations, skillId) && state.installations[skillId]
      const matching = repository && Object.entries(state.installations).find(([name, record]) => record.sourceId === repository.id && (record.directoryUrl === url || record.skillPath?.split('/').at(-1) === skillId || (!record.directoryUrl && name === skillId)))
      const record = matching ? matching[1] : null
      const row = matching ? rows.find((item) => item.name === matching[0]) : null
      const installed = Boolean(record && row?.path && resolve(row.path) === resolve(join(record.directory, 'SKILL.md')))
      return { id: entry.id, name: entry.name, skillId, source: entry.source, installs: entry.installs, url, repositoryUrl: repository?.url || null, installed, ...(installed ? { installedName: matching[0] } : {}), conflict: !installed && Boolean(namedRow || namedRecord || record) ? '已有同名技能，请预览来源确认关联或冲突' : null, supported: Boolean(repository), ...(!repository ? { unsupportedReason: '该目录条目不是受支持的 GitHub 技能来源' } : {}) }
    })
    return { query, owner, skills, count: result.count ?? skills.length, directoryUrl: `${DIRECTORY_ORIGIN}/?q=${encodeURIComponent(query)}`, ...(typeof result.searchType === 'string' ? { searchType: result.searchType } : {}), ...(typeof result.searchVersion === 'string' ? { searchVersion: result.searchVersion } : {}) }
  }
  async function preview(input) {
    const source = await discover(input.url)
    const state = await readState()
    const { rows } = await listLocal()
    const skills = []
    for (const skill of source.skills) skills.push(await localStatus(state, source, skill, rows, true))
    const token = randomUUID()
    for (const [key, value] of previews) if (Date.now() - value.at > 15 * 60 * 1000) previews.delete(key)
    while (previews.size >= 16) previews.delete(previews.keys().next().value)
    previews.set(token, { source, home, at: Date.now() })
    const selectedNames = source.directorySkill ? skills.filter((skill) => skill.directoryUrl === source.directoryUrl).map((skill) => skill.name) : []
    return { token, source: publicSource(source, skills), skills: skills.map((skill) => ({ ...skill, selected: selectedNames.includes(skill.name) })), selectedNames }
  }
  async function getPreview(input) {
    if (input.token) {
      const value = previews.get(input.token)
      if (!value || value.home !== home || Date.now() - value.at > 15 * 60 * 1000) throw new Error('预览已过期，请重新解析来源')
      return value.source
    }
    if (!input.url) throw new Error('需要来源网址或有效预览 token')
    const parsed = parseSource(input.url)
    const state = await readState()
    const known = state.sources.find((source) => source.id === parsed.id)
    const names = Array.isArray(input.names) ? input.names.filter((name) => typeof name === 'string' && NAME.test(name)) : []
    const targetPaths = (known?.skills || []).filter((skill) => names.includes(skill.name)).map((skill) => skill.path)
    const source = await discover(input.url, false, { targetNames: names, targetPaths, targeted: Boolean(known?.partial && targetPaths.length) })
    return preserveInstalled(state, known, source)
  }
  async function add(input) {
    const requested = parseSource(input.url)
    if (!requested.directorySkill) throw new Error('直接添加需要 skills.sh 的单技能详情地址，请先搜索并选择一个技能')
    const resolved = await preview({ url: input.url })
    if (resolved.selectedNames.length !== 1) throw new Error('无法唯一确定要添加的技能，未安装任何内容')
    const name = resolved.selectedNames[0]
    const skill = resolved.skills.find((item) => item.name === name)
    if (!skill) throw new Error('来源预览中缺少选中的技能，未安装任何内容')
    const state = await readState()
    const record = own(state.installations, name) && state.installations[name]
    const { rows } = await listLocal()
    const row = rows.find((item) => item.name === name)
    const details = { name, sourceId: resolved.source.id, sourceUrl: resolved.source.url, directoryUrl: requested.directoryUrl }
    if (record?.sourceId === resolved.source.id && record.skillPath === skill.path && row?.path && resolve(row.path) === resolve(join(record.directory, 'SKILL.md'))) {
      return { ...details, added: false, existing: true, enabled: row.modelInvocable !== false }
    }
    if (record || row || skill.conflict) throw new Error(`${name} 已存在同名技能或来源记录，不会自动关联或覆盖，请查看已安装技能`)
    await install({ token: resolved.token, names: [name], enabled: false, associate: false })
    return { ...details, added: true, existing: false, enabled: false }
  }
  async function install(input) {
    const source = await getPreview(input)
    const names = input.names
    if (!Array.isArray(names) || !names.length || names.length > MAX_SKILLS || names.some((value) => typeof value !== 'string' || !NAME.test(value))) throw new Error('请选择有效的技能')
    const selected = [...new Set(names)].map((name) => { const skill = source.skills.find((item) => item.name === name); if (!skill) throw new Error(`来源中没有技能 ${name}`); return skill })
    const state = await readState()
    const { rows } = await listLocal()
    const plans = []
    // Prepare and validate the entire selection before publishing any skill.
    for (const skill of selected) {
      const previous = own(state.installations, skill.name) && state.installations[skill.name]
      if (previous) throw new Error(`${skill.name} 已被来源管理，请使用更新操作`)
      const row = rows.find((item) => item.name === skill.name)
      const files = await download(source, skill)
      const expectedHash = packageHash(files)
      let directory = join(root, skill.name)
      let associated = false
      if (row) {
        if (input.associate !== true) throw new Error(`${skill.name} 已存在，请明确选择关联已有技能`)
        if (!row.writable || !row.path.endsWith(`${sep}SKILL.md`)) throw new Error(`${skill.name} 不支持关联：需要可管理的完整技能目录`)
        directory = dirname(row.path)
        await assertDirectory(directory)
        if (packageHash(await diskFiles(directory)) !== expectedHash) throw new Error(`${skill.name} 本地内容不同，不会覆盖`)
        associated = true
      } else {
        await assertDirectory(directory)
        try { await lstat(directory); throw new Error(`${skill.name} 目标目录已存在，不会覆盖`) } catch (error) { if (error.code !== 'ENOENT') throw error }
      }
      const originalText = associated ? await readFile(join(directory, 'SKILL.md'), 'utf8') : files.get('SKILL.md').toString('utf8')
      const originalInvocation = invocation(originalText)
      const enabled = associated ? originalInvocation.modelInvocable : false
      files.set('SKILL.md', Buffer.from(setInvocationText(originalText, enabled, originalInvocation)))
      plans.push({ skill, files, directory, associated, originalText, record: { sourceId: source.id, directory, skillPath: skill.path, hash: expectedHash, upstreamHash: skill.upstreamHash, commit: source.commit, enabled, originalInvocation, discoveredVia: source.discoveredVia || 'github', directoryUrl: skill.directoryUrl || source.directoryUrl || null } })
    }
    const published = []
    const budget = renameBudget()
    try {
      for (const plan of plans) {
        if (!plan.associated) {
          let staging, primary
          try {
            staging = await privateSlot('stage')
            plan.identity = owned.get(staging).identity
            for (const [path, bytes] of plan.files) { const target = join(staging, ...safeRepoPath(path).split('/')); await mkdir(dirname(target), { recursive: true }); await writeFile(target, bytes) }
            // Recheck before every retry. Node provides no cross-platform no-replace directory rename;
            // an external creator can still race between this check and the OS call.
            await move(staging, plan.directory, `安装技能 ${plan.skill.name}`, budget, true)
            published.push(plan)
          } catch (error) { primary = error; throw error }
          finally { await cleanupPrivate(staging, primary) }
        } else published.push(plan)
        state.installations[plan.skill.name] = plan.record
      }
      const at = state.sources.findIndex((item) => item.id === source.id)
      if (at < 0) state.sources.push(source); else state.sources[at] = preserveInstalled(state, state.sources[at], source)
      await saveState(state, budget)
    } catch (error) {
      for (const plan of published) if (!plan.associated) await cleanupPublished(plan, error)
      throw error
    }
    const installedRows = (await listLocal()).rows
    const skills = await Promise.all(source.skills.map((skill) => localStatus(state, source, skill, installedRows)))
    return { source: publicSource(source, skills), installed: plans.filter((item) => !item.associated).map((item) => item.skill.name), associated: plans.filter((item) => item.associated).map((item) => item.skill.name) }
  }
  async function refresh(input) {
    const state = await readState()
    const at = state.sources.findIndex((item) => item.id === input.id)
    if (at < 0) throw new Error('来源不存在')
    const previous = state.sources[at]
    const source = await discover(previous.url, true, { targetPaths: previous.skills.map((skill) => skill.path), targeted: previous.partial === true })
    source.id = previous.id
    state.sources[at] = preserveInstalled(state, previous, source)
    await saveState(state)
    const { rows } = await listLocal()
    const skills = await Promise.all(source.skills.map((skill) => localStatus(state, source, skill, rows)))
    return { source: publicSource(source, skills), skills }
  }
  async function update(input) {
    const state = await readState()
    const record = own(state.installations, input.name) && state.installations[input.name]
    if (!record) throw new Error('该技能没有可更新的在线来源')
    await assertDirectory(record.directory)
    const { rows } = await listLocal()
    const row = rows.find((item) => item.name === input.name)
    if (!row || resolve(row.path) !== resolve(join(record.directory, 'SKILL.md'))) throw new Error('该技能被同名条目遮蔽，无法更新')
    if (packageHash(await diskFiles(record.directory)) !== record.hash) throw new Error('技能存在本地修改，更新已停止，未覆盖文件')
    const old = state.sources.find((item) => item.id === record.sourceId)
    if (!old) throw new Error('来源记录缺失')
    const source = await discover(old.url, false, { targetPaths: [record.skillPath], targeted: true })
    source.id = old.id
    const skill = source.skills.find((item) => item.name === input.name && item.path === record.skillPath)
    if (!skill) throw new Error('上游已移除或移动该技能，请重新预览来源')
    const files = await download(source, skill)
    const nextHash = packageHash(files)
    files.set('SKILL.md', Buffer.from(setInvocationText(files.get('SKILL.md').toString('utf8'), record.enabled !== false, record.originalInvocation)))
    let staging, backup, primary
    let moved = false
    let replaced = false
    const budget = renameBudget()
    try {
      staging = await privateSlot('stage')
      for (const [path, bytes] of files) { const target = join(staging, ...safeRepoPath(path).split('/')); await mkdir(dirname(target), { recursive: true }); await writeFile(target, bytes) }
      // Recheck immediately before swapping: external editors do not participate in our queue.
      if (packageHash(await diskFiles(record.directory)) !== record.hash) throw new Error('技能在下载期间被修改，更新已停止')
      backup = await privateSlot('backup', await lstat(record.directory))
      await move(record.directory, backup, `备份技能 ${input.name}`, budget, true); moved = true
      await move(staging, record.directory, `更新技能 ${input.name}`, budget, true); replaced = true
      state.installations[input.name] = { ...record, hash: nextHash, upstreamHash: skill.upstreamHash, commit: source.commit }
      state.sources[state.sources.findIndex((item) => item.id === source.id)] = preserveInstalled(state, old, source)
      await saveState(state, budget)
    } catch (error) {
      primary = error
      if (replaced) {
        try { await removeOwned(record.directory, owned.get(staging).identity) }
        catch (cleanup) { appendFailure(primary, `更新回滚清理失败，保留路径 ${record.directory}`, cleanup) }
      }
      if (moved) {
        try { await move(backup, record.directory, `恢复技能 ${input.name}`, budget, true) }
        catch (restore) { appendFailure(primary, `恢复失败，原技能备份保留在 ${backup}`, restore) }
      }
      throw primary
    } finally { await cleanupPrivate(staging, primary) }
    await cleanupPrivate(backup)
    return { name: input.name, commit: source.commit, updated: true }
  }
  async function remove(input, row) {
    const state = await readState()
    const record = own(state.installations, input.name) && state.installations[input.name]
    if (!record || resolve(row.path) !== resolve(join(record.directory, 'SKILL.md'))) return false
    await assertDirectory(record.directory)
    const budget = renameBudget()
    const backup = await privateSlot('remove', await lstat(record.directory))
    await move(record.directory, backup, `卸载技能 ${input.name}`, budget, true)
    delete state.installations[input.name]
    delete state.invocations[row.path]
    try { await saveState(state, budget) }
    catch (error) {
      try { await move(backup, record.directory, `恢复技能 ${input.name}`, budget, true) }
      catch (restore) { appendFailure(error, `恢复失败，原技能备份保留在 ${backup}`, restore) }
      throw error
    }
    await cleanupPrivate(backup)
    return true
  }
  /**
   * Remove one source together with every skill it manages. Skills are quarantined
   * first, then the records and the source are saved at once; any failure restores
   * every quarantined directory before rethrowing.
   */
  async function removeSource(input) {
    const state = await readState()
    const at = state.sources.findIndex((source) => source.id === input.id)
    if (at < 0) throw new Error('来源不存在')
    const source = state.sources[at]
    const names = Object.keys(state.installations).filter((name) => state.installations[name].sourceId === source.id)
    const budget = renameBudget()
    const quarantined = []
    try {
      for (const name of names) {
        const record = state.installations[name]
        await assertDirectory(record.directory)
        const backup = await privateSlot('remove', await lstat(record.directory))
        await move(record.directory, backup, `卸载技能 ${name}`, budget, true)
        quarantined.push({ name, backup, directory: record.directory, instruction: join(record.directory, 'SKILL.md') })
        delete state.installations[name]
        delete state.invocations[join(record.directory, 'SKILL.md')]
      }
      state.sources.splice(at, 1)
      await saveState(state, budget)
    } catch (error) {
      for (const item of quarantined.reverse()) {
        try { await move(item.backup, item.directory, `恢复技能 ${item.name}`, budget, true) }
        catch (restore) { appendFailure(error, `恢复失败，技能备份保留在 ${item.backup}`, restore) }
      }
      throw error
    }
    // Deleting succeeded; a leftover quarantine is reported without hiding the result.
    const warnings = []
    for (const item of quarantined) {
      try { await cleanupPrivate(item.backup) }
      catch (error) { warnings.push(String(error?.message || error)) }
    }
    return { id: source.id, label: source.label || source.id, removed: names, ...(warnings.length ? { warnings } : {}) }
  }
  async function setInvocation(input, row) {
    const state = await readState()
    const record = own(state.installations, row.name) && state.installations[row.name]
    const managed = record && resolve(row.path) === resolve(join(record.directory, 'SKILL.md'))
    if (managed) await assertDirectory(record.directory)
    const text = await readFile(row.path, 'utf8')
    const current = invocation(text)
    const enabled = input.enabled !== undefined ? input.enabled !== false : input.modelInvocable !== false
    const saved = managed ? record.originalInvocation : state.invocations[row.path]
    const original = saved || { ...current, modelInvocable: true }
    if (enabled && input.editInvocation === true && input.userInvocable !== undefined) original.userInvocable = input.userInvocable !== false
    if (enabled) original.modelInvocable = true
    const next = setInvocationText(text, enabled, original)
    if (managed) { record.enabled = enabled; record.originalInvocation = original }
    else if (!enabled) state.invocations[row.path] = original
    else delete state.invocations[row.path]
    await writeFile(row.path, next, 'utf8')
    try { await saveState(state) } catch (error) { await writeFile(row.path, text, 'utf8'); throw error }
    return { name: row.name, enabled }
  }
  async function assertEditable(input) {
    const state = await readState()
    for (const name of [input.name, input.originalName].filter(Boolean)) {
      if (own(state.installations, name)) throw new Error('在线来源技能正文只读，请更新来源或另存为本地技能')
    }
  }
  return { decorate, search, preview, add, install, refresh, check: refresh, update, remove, removeSource, setInvocation, assertEditable }
}
