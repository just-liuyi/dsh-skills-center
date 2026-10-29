/**
 * @local/dsh-switch — Host half.
 *
 * The panel lives in the browser (./client.js) and owns no business logic of its
 * own: every action is one call to `POST /dsh-switch/rpc`, which lands here in
 * `dispatch()`. That keeps the cc-switch shape — the view never talks to a
 * service directly, so the same operation is reachable from the page and from
 * anything else that can POST to this route.
 *
 * Three entity kinds, one store each:
 *
 *   skills  — discovered through `ctx.skills`; only skills under
 *             `<dshHome>/skills` are writable here, everything else is listed
 *             read-only with its source badge.
 *   mcp     — rows of the `dsh-switch-mcp` group row declared by this bundle's
 *             patch. `configEditor` persists the nested entry list as a profile
 *             override, so the Loader mounts each `@deepseek-ai/dsh-mcp-client`
 *             row normally and removals are real unloads.
 *   prompts — a JSON store at `<dshHome>/dsh-switch/store.json`; every enabled
 *             entry is registered as a `ctx.systemPrompt.section()` and
 *             re-registered whenever the store changes.
 *
 * Every mutation answers `{ok:true, value}` or `{ok:false, error}`; failures are
 * returned, never swallowed, so the panel can show the reason.
 */

import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'

/** This plugin's package name: the Loader row name and the client module id. */
export const name = '@local/dsh-switch'

/** Only the web server is required; every other service is looked up softly. */
export const inject = ['webServer']

/** Route prefix owned by this plugin. */
const PREFIX = '/dsh-switch'

/** The group row that owns managed MCP servers (declared in cordis.patch.yml). */
const GROUP_ID = 'dsh-switch-mcp'

/** The MCP client module every managed row mounts. */
const MCP_MODULE = '@deepseek-ai/dsh-mcp-client'

/**
 * Prompt sections sit between the deliverable file references (9000) and the
 * structured-output block (9900), i.e. after tool guidance and before the
 * trailing deployment instructions.
 */
const PROMPT_ORDER = 9200

/** `serverName` must match the MCP client's own contract. */
const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/

/** Skill directory names are kebab-case. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/* ── locations ──────────────────────────────────────────────────────────────────────────────────────────────── */

function dshHome() {
  return resolve(process.env.DSH_HOME || join(homedir(), '.dsh'))
}

function skillsRoot() {
  return join(dshHome(), 'skills')
}

function storePath() {
  return join(dshHome(), 'dsh-switch', 'store.json')
}

/** True when `path` is inside `root` (and not `root` itself). */
function within(root, path) {
  if (!path) return false
  const rel = relative(resolve(root), resolve(path))
  return rel.length > 0 && !rel.startsWith('..') && !isAbsolute(rel)
}

/* ── tiny JSON store ────────────────────────────────────────────────────────────────────────────────────────── */

async function readStore() {
  try {
    const parsed = JSON.parse(await readFile(storePath(), 'utf8'))
    return { prompts: Array.isArray(parsed?.prompts) ? parsed.prompts : [] }
  } catch {
    return { prompts: [] }
  }
}

async function writeStore(store) {
  const dir = join(dshHome(), 'dsh-switch')
  await mkdir(dir, { recursive: true })
  const target = storePath()
  // Write beside the target and rename: a crash mid-write must never leave a truncated store, because a store that
  // fails to parse reads back as "no prompts" and silently drops every injection.
  const temp = `${target}.${process.pid.toString(36)}-${Date.now().toString(36)}.tmp`
  await writeFile(temp, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
  await rename(temp, target)
}

/**
 * Serialize store mutations: two overlapping saves would each read the same snapshot and the later write would drop
 * the other change.
 */
let storeQueue = Promise.resolve()

function withStore(operation) {
  const next = storeQueue.then(operation, operation)
  storeQueue = next.then(() => undefined, () => undefined)
  return next
}

/* ── skill frontmatter ──────────────────────────────────────────────────────────────────────────────────────── */

function splitSkill(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(text)
  if (!match) return { front: '', body: text }
  return { front: match[1], body: text.slice(match[0].length) }
}

/** Replace, insert or remove one top-level frontmatter key, leaving the rest byte-identical. */
function setFrontKey(front, key, value) {
  const lines = front ? front.split(/\r?\n/) : []
  const pattern = new RegExp(`^${key}\\s*:`)
  const at = lines.findIndex((line) => pattern.test(line))
  const next = value === undefined ? null : `${key}: ${value}`
  if (at >= 0) {
    if (next === null) lines.splice(at, 1)
    else lines[at] = next
  } else if (next !== null) {
    lines.push(next)
  }
  return lines.join('\n')
}

function renderSkillFile(input) {
  const lines = ['---', `name: ${input.name}`]
  lines.push(`description: ${JSON.stringify(input.description || input.name)}`)
  if (input.whenToUse) lines.push(`whenToUse: ${JSON.stringify(input.whenToUse)}`)
  if (input.modelInvocable === false) lines.push('disable-model-invocation: true')
  if (input.userInvocable === false) lines.push('user-invocable: false')
  lines.push('---', '')
  const body = String(input.content || '').replace(/^\n+/, '')
  return `${lines.join('\n')}\n${body}`
}

/* ── skills ────────────────────────────────────────────────────────────────────────────────────────────────── */

function viewCwd(ctx) {
  try {
    return ctx.get('workingDirectory')?.defaultDirectory ?? process.cwd()
  } catch {
    return process.cwd()
  }
}

/** Roots this panel can read; only the user roots are writable here. */
function skillRoots(cwd) {
  return [
    { root: join(cwd, '.dsh', 'skills'), source: 'project-dsh', writable: false },
    { root: join(cwd, '.agents', 'skills'), source: 'project-agents', writable: false },
    { root: join(dshHome(), 'skills'), source: 'user-dsh', writable: true },
    { root: join(homedir(), '.agents', 'skills'), source: 'user-agents', writable: true },
  ]
}

function userSkillRoots() {
  return [join(dshHome(), 'skills'), join(homedir(), '.agents', 'skills')]
}

/** Read the flat `key: value` pairs of a skill's frontmatter; the body stays untouched. */
function parseSkillFile(text) {
  const { front, body } = splitSkill(text)
  const data = {}
  for (const line of front.split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      try {
        value = JSON.parse(value.startsWith('"') ? value : `"${value.slice(1, -1)}"`)
      } catch {
        value = value.slice(1, -1)
      }
    }
    data[match[1]] = value
  }
  return { data, body }
}

function truthy(value) {
  if (value === true) return true
  return /^(true|yes|on|1)$/i.test(String(value ?? '').trim())
}

/** One root's direct entries: a `<name>/SKILL.md` bundle or a flat `<name>.md` file. */
async function scanRoot(root, source, writable) {
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch {
    return []
  }
  const rows = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    let path
    if (entry.isDirectory()) path = join(root, entry.name, 'SKILL.md')
    else if (entry.isFile() && entry.name.endsWith('.md')) path = join(root, entry.name)
    else continue
    let text
    try {
      text = await readFile(path, 'utf8')
    } catch {
      continue
    }
    const { data } = parseSkillFile(text)
    const fallback = entry.isDirectory() ? entry.name : entry.name.slice(0, -3)
    rows.push({
      name: data.name || fallback,
      description: data.description || '',
      whenToUse: data.whenToUse || '',
      source,
      provider: 'filesystem',
      path,
      modelInvocable: !truthy(data['disable-model-invocation']),
      userInvocable: !truthy(data['user-invocable']),
      writable,
      invalid: !data.name || !data.description,
    })
  }
  return rows
}

/**
 * The catalog the panel shows: skills registered in this profile plus what the
 * user and project roots hold on disk. The registry is deliberately read at the
 * root scope, where a preset's filesystem provider is not visible, so the disk
 * scan is what makes `~/.dsh/skills` manageable.
 */
async function skillCatalog(ctx) {
  const cwd = viewCwd(ctx)
  const rows = new Map()

  const registry = ctx.get('skills')
  if (registry) {
    try {
      for (const summary of await registry.list({ cwd })) {
        rows.set(summary.name, {
          name: summary.name,
          description: summary.description,
          whenToUse: summary.whenToUse ?? '',
          source: summary.source,
          provider: summary.provider,
          path: summary.path ?? '',
          modelInvocable: summary.invocation?.modelInvocable !== false,
          userInvocable: summary.invocation?.userInvocable !== false,
          writable: Boolean(summary.path) && userSkillRoots().some((root) => within(root, summary.path)),
          invalid: false,
        })
      }
    } catch {
      /* a failing provider must not hide the disk entries */
    }
  }

  // Project roots first, then user roots: the later write wins a duplicate name,
  // matching the provider rank order (project outranks user outranks bundled).
  const roots = skillRoots(cwd)
  for (const { root, source, writable } of [roots[2], roots[3], roots[1], roots[0]]) {
    for (const row of await scanRoot(root, source, writable)) {
      const known = rows.get(row.name)
      rows.set(row.name, known ? { ...known, ...row, source: row.source || known.source } : row)
    }
  }

  return {
    supported: true,
    root: join(dshHome(), 'skills'),
    rows: [...rows.values()].sort((a, b) => a.name.localeCompare(b.name)),
  }
}

async function listSkills(ctx) {
  return skillCatalog(ctx)
}

/** The on-disk row for a name, or `undefined` when only the registry has it. */
async function diskSkill(ctx, skillName) {
  const catalog = await skillCatalog(ctx)
  return catalog.rows.find((row) => row.name === skillName && row.provider === 'filesystem')
}

async function skillDetail(ctx, input) {
  const skillName = String(input.name || '')
  const row = await diskSkill(ctx, skillName)
  if (row) {
    const { body } = parseSkillFile(await readFile(row.path, 'utf8'))
    return {
      name: row.name,
      description: row.description,
      whenToUse: row.whenToUse,
      content: body.replace(/^\n+/, ''),
      path: row.path,
      writable: row.writable,
    }
  }
  const registry = ctx.get('skills')
  if (!registry) throw new Error('skill not found')
  const definition = await registry.get(skillName, { cwd: viewCwd(ctx) })
  if (!definition) throw new Error(`skill not found: ${skillName}`)
  return {
    name: definition.name,
    description: definition.description,
    whenToUse: definition.whenToUse ?? '',
    content: definition.content,
    path: definition.path ?? '',
    writable: Boolean(definition.path) && userSkillRoots().some((root) => within(root, definition.path)),
  }
}

async function saveSkill(ctx, input) {
  const skillName = String(input.name || '').trim()
  if (!SKILL_NAME.test(skillName)) {
    throw new Error('skill name must be kebab-case: lowercase letters, digits and single dashes')
  }
  const description = String(input.description || '').trim()
  if (!description) throw new Error('description is required')

  const original = String(input.originalName || '').trim()
  const dir = join(skillsRoot(), skillName)
  // A write under a name that is not this skill's own name replaces whatever is already there, so refuse it instead of
  // silently overwriting a skill (a rename onto an existing name, or an unintended create).
  const occupied = await readFile(join(dir, 'SKILL.md'), 'utf8').then(() => true, () => false)
  if (occupied && original !== skillName) {
    throw new Error(`a skill named ${skillName} already exists`)
  }
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'SKILL.md'), renderSkillFile({
    name: skillName,
    description,
    whenToUse: String(input.whenToUse || '').trim(),
    modelInvocable: input.modelInvocable !== false,
    userInvocable: input.userInvocable !== false,
    content: input.content,
  }), 'utf8')

  // A flat `<name>.md` beside the new bundle would be a second candidate.
  await rm(join(skillsRoot(), `${skillName}.md`), { force: true })

  if (original && original !== skillName && SKILL_NAME.test(original)) {
    const oldDir = join(skillsRoot(), original)
    if (within(skillsRoot(), oldDir)) await rm(oldDir, { recursive: true, force: true })
    const oldFile = join(skillsRoot(), `${original}.md`)
    if (within(skillsRoot(), oldFile)) await rm(oldFile, { force: true })
  }
  return { name: skillName, path: join(dir, 'SKILL.md') }
}

async function removeSkill(ctx, input) {
  const skillName = String(input.name || '').trim()
  if (!SKILL_NAME.test(skillName)) throw new Error('invalid skill name')
  const row = await diskSkill(ctx, skillName)
  if (!row) throw new Error(`no skill file named ${skillName}`)
  if (!row.writable) throw new Error('this skill is read-only: it lives outside the user skill roots')
  const target = row.path.endsWith('SKILL.md') ? dirname(row.path) : row.path
  if (!userSkillRoots().some((root) => within(root, target))) {
    throw new Error('refusing to remove outside the user skill roots')
  }
  await rm(target, { recursive: true, force: true })
  return { removed: skillName }
}

async function setSkillInvocation(ctx, input) {
  const skillName = String(input.name || '').trim()
  const row = await diskSkill(ctx, skillName)
  if (!row) throw new Error('this skill has no file to edit')
  if (!row.writable) throw new Error('this skill is read-only: it lives outside the user skill roots')
  const { front, body } = splitSkill(await readFile(row.path, 'utf8'))
  let next = setFrontKey(front, 'disable-model-invocation', input.modelInvocable === false ? 'true' : undefined)
  next = setFrontKey(next, 'user-invocable', input.userInvocable === false ? 'false' : undefined)
  await writeFile(row.path, `---\n${next}\n---\n\n${body.replace(/^\n+/, '')}`, 'utf8')
  return { name: row.name }
}

/* ── MCP servers ──────────────────────────────────────────────────────────────────────────────────────────── */

function groupEntry(ctx) {
  const editor = ctx.get('configEditor')
  if (!editor) return undefined
  try {
    return editor.entries().find((entry) => entry.options.id === GROUP_ID)
  } catch {
    return undefined
  }
}

function rowsOf(entry) {
  const config = entry?.options?.config
  return Array.isArray(config) ? config : []
}

export async function listMcp(ctx) {
  const editor = ctx.get('configEditor')
  if (!editor) return { supported: false, reason: 'configEditor is not mounted', rows: [] }
  const entry = groupEntry(ctx)
  if (!entry) return { supported: false, reason: `the ${GROUP_ID} group row is not active`, rows: [] }

  const managed = rowsOf(entry).map((row) => {
    const config = row.config ?? {}
    return {
      id: row.id,
      serverName: config.serverName ?? '',
      transport: config.transport === 'streamable-http' ? 'streamable-http' : 'stdio',
      command: config.command ?? '',
      args: Array.isArray(config.args) ? config.args : [],
      env: config.env ?? {},
      url: config.url ?? '',
      headers: config.headers ?? {},
      failOnStartupError: config.failOnStartupError === true,
      enabled: row.disabled !== true,
      external: false,
    }
  })
  const managedIds = new Set(managed.map((row) => row.id))

  // MCP servers declared by other bundles stay visible but read-only here, so an
  // empty managed list never hides an existing connection. `configuration()`
  // lists disabled rows too; `listPlugins()` only supplies the live entry id.
  const external = []
  try {
    const manager = ctx.get('pluginManager')
    const plugins = manager ? await manager.listPlugins() : []
    const live = new Map(plugins.map((plugin) => [plugin.patchId, plugin]))
    for (const item of editor.configuration()) {
      const options = item.entry.options
      if (options.name !== MCP_MODULE) continue
      if (managedIds.has(options.id)) continue
      const config = options.config ?? {}
      const plugin = live.get(options.id)
      external.push({
        id: options.id,
        entryId: plugin?.entryId ?? null,
        serverName: config.serverName ?? options.id,
        transport: config.transport === 'streamable-http' ? 'streamable-http' : 'stdio',
        command: config.command ?? '',
        args: Array.isArray(config.args) ? config.args : [],
        env: config.env ?? {},
        url: config.url ?? '',
        headers: config.headers ?? {},
        failOnStartupError: config.failOnStartupError === true,
        enabled: plugin ? plugin.enabled === true : options.disabled !== true,
        phase: plugin?.fiberPhase ?? null,
        toggleable: Boolean(plugin?.entryId),
        external: true,
      })
    }
  } catch {
    /* the managed half still answers */
  }

  return { supported: true, rows: [...managed, ...external] }
}

/** Toggle an MCP server another bundle declares, through the normal plugin switch. */
async function setExternalMcpEnabled(ctx, input) {
  const manager = ctx.get('pluginManager')
  if (!manager) throw new Error('this profile has no plugin manager')
  const entryId = String(input.entryId || '')
  if (!entryId) throw new Error('entryId is required')
  const result = await manager.setPluginEnabled(entryId, input.enabled !== false)
  if (result?.application === 'failed') {
    throw new Error(result.error?.code ? `${result.error.code}: ${result.error.diagnostic ?? ''}`.trim() : 'the plugin manager refused the change')
  }
  return { entryId, enabled: input.enabled !== false, application: result?.application ?? 'unknown' }
}

function normalizeEnv(text) {
  const out = {}
  for (const line of String(text || '').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const at = trimmed.indexOf('=')
    if (at <= 0) throw new Error(`invalid KEY=VALUE line: ${trimmed}`)
    out[trimmed.slice(0, at).trim()] = trimmed.slice(at + 1)
  }
  return out
}

async function editGroup(ctx, mutate) {
  const editor = ctx.get('configEditor')
  if (!editor) throw new Error('MCP management needs the configEditor service')
  const entry = groupEntry(ctx)
  if (!entry) throw new Error(`the ${GROUP_ID} group row is not active`)
  await editor.edit(entry, (current) => {
    const list = Array.isArray(current) ? current.map((row) => ({ ...row })) : []
    return mutate(list)
  })
  return { ok: true }
}

async function saveMcp(ctx, input) {
  const serverName = String(input.serverName || '').trim()
  if (!SERVER_NAME.test(serverName)) {
    throw new Error('serverName must match [A-Za-z0-9_-]{1,32}')
  }
  const transport = input.transport === 'streamable-http' ? 'streamable-http' : 'stdio'
  const config = { serverName, transport }
  if (transport === 'stdio') {
    config.command = String(input.command || '').trim()
    if (!config.command) throw new Error('command is required for the stdio transport')
    config.args = String(input.args || '')
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
    const env = normalizeEnv(input.env)
    if (Object.keys(env).length) config.env = env
  } else {
    config.url = String(input.url || '').trim()
    if (!config.url) throw new Error('url is required for the streamable-http transport')
    const headers = normalizeEnv(input.headers)
    if (Object.keys(headers).length) config.headers = headers
  }
  if (input.failOnStartupError === true) config.failOnStartupError = true

  // A new row's id is derived from the server name, and an existing row with that id would be replaced instead of
  // added — so keep deriving until the id is free (`GitHub` and `github` are two legal names, one id shape).
  let id = String(input.id || '')
  const entry = groupEntry(ctx)
  if (!id) {
    const used = new Set(rowsOf(entry ?? {}).map((row) => row.id))
    const base = `switch-mcp-${serverName.toLowerCase()}`
    id = base
    for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`
  }
  if (entry) {
    const clash = rowsOf(entry).find((row) => row.id !== id && String(row?.config?.serverName || '') === serverName)
    if (clash) throw new Error(`another MCP server already uses the name ${serverName}`)
  }
  await editGroup(ctx, (list) => {
    const at = list.findIndex((row) => row.id === id)
    const row = { id, name: MCP_MODULE, config }
    if (input.enabled === false) row.disabled = true
    if (at >= 0) list[at] = row
    else list.push(row)
    return list
  })
  return { id }
}

async function removeMcp(ctx, input) {
  const id = String(input.id || '')
  await editGroup(ctx, (list) => list.filter((row) => row.id !== id))
  return { removed: id }
}

async function setMcpEnabled(ctx, input) {
  const id = String(input.id || '')
  await editGroup(ctx, (list) => {
    const at = list.findIndex((row) => row.id === id)
    if (at < 0) throw new Error(`no managed MCP server with id ${id}`)
    if (input.enabled === false) list[at] = { ...list[at], disabled: true }
    else {
      const { disabled, ...rest } = list[at]
      list[at] = rest
    }
    return list
  })
  return { id, enabled: input.enabled !== false }
}

/* ── prompt injections ───────────────────────────────────────────────────────────────────────────────────── */

async function listPrompts(ctx) {
  const store = await readStore()
  const systemPrompt = ctx.get('systemPrompt')
  return {
    supported: Boolean(systemPrompt),
    rows: store.prompts.map((prompt) => ({
      id: prompt.id,
      title: prompt.title,
      text: prompt.text,
      enabled: prompt.enabled !== false,
      updatedAt: prompt.updatedAt ?? null,
      applied: Boolean(systemPrompt) && prompt.enabled !== false,
    })),
    order: PROMPT_ORDER,
  }
}

async function savePrompt(ctx, input) {
  return withStore(async () => {
    const store = await readStore()
    const id = String(input.id || '').trim() || `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    const now = new Date().toISOString()
    const at = store.prompts.findIndex((prompt) => prompt.id === id)
    const text = String(input.text || '')
    if (!text.trim()) throw new Error('prompt text is empty')
    const next = {
      id,
      title: String(input.title || '').trim() || text.trim().split(/\r?\n/)[0].slice(0, 48),
      text,
      enabled: input.enabled !== false,
      updatedAt: now,
    }
    if (at >= 0) store.prompts[at] = { ...store.prompts[at], ...next }
    else store.prompts.push({ ...next, createdAt: now })
    await writeStore(store)
    await syncPrompts(ctx)
    return { id }
  })
}

async function removePrompt(ctx, input) {
  return withStore(async () => {
    const store = await readStore()
    const id = String(input.id || '')
    store.prompts = store.prompts.filter((prompt) => prompt.id !== id)
    await writeStore(store)
    await syncPrompts(ctx)
    return { removed: id }
  })
}

async function setPromptEnabled(ctx, input) {
  return withStore(async () => {
    const store = await readStore()
    const id = String(input.id || '')
    const at = store.prompts.findIndex((prompt) => prompt.id === id)
    if (at < 0) throw new Error(`no prompt with id ${id}`)
    store.prompts[at] = {
      ...store.prompts[at],
      enabled: input.enabled !== false,
      updatedAt: new Date().toISOString(),
    }
    await writeStore(store)
    await syncPrompts(ctx)
    return { id, enabled: input.enabled !== false }
  })
}

/* ── dispatch ─────────────────────────────────────────────────────────────────────────────────────────────── */

async function catalog(ctx) {
  const [skills, mcp, prompts] = await Promise.all([listSkills(ctx), listMcp(ctx), listPrompts(ctx)])
  return { skills, mcp, prompts, home: dshHome() }
}

/**
 * Prompt-section registrations are per plugin instance, not global: a reloaded instance must not dispose the sections
 * the live one just registered. Disposers live beside the instance's Host context, and each rebuild is serialized so
 * two overlapping store writes cannot leave the sections half-registered.
 */
const promptStates = new WeakMap()

function promptStateOf(ctx) {
  let state = promptStates.get(ctx)
  if (!state) {
    state = { disposers: [], queue: Promise.resolve() }
    promptStates.set(ctx, state)
  }
  return state
}

/** Dispose this instance's sections. Safe to call twice. */
function disposePrompts(ctx) {
  const state = promptStateOf(ctx)
  for (const dispose of state.disposers) {
    try {
      dispose()
    } catch {
      /* already disposed */
    }
  }
  state.disposers = []
}

/** Register every enabled stored prompt of one instance as its own system-prompt section. */
async function rebuildPrompts(ctx) {
  disposePrompts(ctx)
  const systemPrompt = ctx?.get?.('systemPrompt')
  if (!systemPrompt) return
  const state = promptStateOf(ctx)
  const store = await readStore()
  for (const prompt of store.prompts) {
    if (prompt.enabled === false) continue
    try {
      state.disposers.push(systemPrompt.section({
        name: `switch:prompt:${prompt.id}`,
        order: PROMPT_ORDER,
        text: prompt.text,
        interpolate: false,
      }))
    } catch (error) {
      // A duplicate or invalid section must not take the whole plugin down.
      console.warn(`[dsh-switch] prompt "${prompt.id}" was not registered: ${error?.message ?? error}`)
    }
  }
}

/** Rebuild this instance's sections after a store change; answers once the sections match the store. */
function syncPrompts(ctx) {
  const state = promptStateOf(ctx)
  state.queue = state.queue.then(() => rebuildPrompts(ctx), () => rebuildPrompts(ctx))
  return state.queue
}

async function promptDiagnostics(ctx) {
  const systemPrompt = ctx.get('systemPrompt')
  const modules = ctx.get('clientModules')
  const clientPath = (() => {
    try {
      return modules?.clientPath?.(name) ?? null
    } catch {
      return null
    }
  })()
  if (!systemPrompt) return { supported: false, sections: [], clientPath }
  const assembly = await systemPrompt.assemble({})
  return {
    supported: true,
    clientPath,
    sections: assembly.sections.map((section) => ({
      name: section.name,
      order: section.order,
      length: section.text.length,
    })),
  }
}

const ACTIONS = {
  catalog,
  diagnostics: promptDiagnostics,
  'skill.detail': skillDetail,
  'skill.save': saveSkill,
  'skill.remove': removeSkill,
  'skill.setInvocation': setSkillInvocation,
  'mcp.save': saveMcp,
  'mcp.remove': removeMcp,
  'mcp.setEnabled': setMcpEnabled,
  'mcp.setExternalEnabled': setExternalMcpEnabled,
  'prompt.save': savePrompt,
  'prompt.remove': removePrompt,
  'prompt.setEnabled': setPromptEnabled,
}

/** One operation surface shared by the HTTP route (and anything else that posts here). */
export async function dispatch(ctx, action, payload) {
  const handler = ACTIONS[action]
  if (!handler) return { ok: false, error: `unknown action: ${action}` }
  try {
    return { ok: true, value: await handler(ctx, payload ?? {}) }
  } catch (error) {
    return { ok: false, error: String(error?.message ?? error) }
  }
}

/* ── plugin ───────────────────────────────────────────────────────────────────────────────────────────────── */

const header = (headers, key) => (typeof headers[key] === 'string' ? headers[key] : undefined)

function parseAuthority(authority) {
  try {
    return new URL(`http://${authority}`)
  } catch {
    return undefined
  }
}

function isLoopback(hostname) {
  return hostname === 'localhost' || hostname === '[::1]' || /^127(\.\d{1,3}){3}$/.test(hostname)
}

/** Same-origin loopback fence: the panel is served by this very Host. */
function trusted(req) {
  const host = header(req.headers, 'host')
  const url = host && parseAuthority(host)
  if (!url) return false
  if (!isLoopback(url.hostname)) return false
  if (header(req.headers, 'sec-fetch-site') === 'cross-site') return false
  const origin = header(req.headers, 'origin')
  if (origin === undefined) return true
  try {
    return new URL(origin).hostname === url.hostname
  } catch {
    return false
  }
}

async function readBody(req, limit = 256 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new Error('request body too large')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/**
 * @param ctx - the Host context.
 */
export function apply(ctx) {
  ctx.effect(() => () => {
    disposePrompts(ctx)
  }, 'dsh-switch: prompt sections')

  // Register the stored prompt injections once the plugin is live.
  void syncPrompts(ctx).catch((error) => {
    console.warn(`[dsh-switch] prompt injections were not restored: ${error?.message ?? error}`)
  })

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: PREFIX,
    handler: async (req, res) => {
      const json = (status, body) => {
        const buffer = Buffer.from(JSON.stringify(body))
        res.writeHead(status, {
          'content-type': 'application/json; charset=utf-8',
          'content-length': String(buffer.length),
          'cache-control': 'no-store',
        })
        res.end(buffer)
      }
      try {
        if (!trusted(req)) return json(403, { ok: false, error: 'forbidden' })
        const url = new URL(req.url ?? '/', 'http://x')
        if (url.pathname === `${PREFIX}/ping`) return json(200, { ok: true, name })
        if (url.pathname !== `${PREFIX}/rpc`) return json(404, { ok: false, error: 'not found' })
        if (req.method !== 'POST') return json(405, { ok: false, error: 'POST required' })
        const body = await readBody(req)
        const answer = await dispatch(ctx, String(body?.action || ''), body?.payload)
        return json(200, answer)
      } catch (error) {
        return json(500, { ok: false, error: String(error?.message ?? error) })
      }
    },
  }), 'dsh-switch: /dsh-switch routes')
}
