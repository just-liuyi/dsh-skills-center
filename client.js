/*! @local/dsh-switch 1.4.0 client half: the 技能中心 sidebar entry and the management panel. */
window.__ModuleLoader__.load({
  id: '@local/dsh-switch',
  factory: (require) => {
    'use strict'

    var React = require('react')
    var h = React.createElement

    var PANEL_ID = 'dsh-switch'
    var LOCALE_NS = 'dshSwitch'
    var API = '/dsh-switch/rpc'
    var SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    var SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/
    /** Which tabs can create a new entry. Skills are authored on disk; the panel only views, toggles and edits them. */
    var CREATABLE = { skills: false, mcp: true, prompts: true }

    /* ── text ──────────────────────────────────────────────────────────────────────────────────────────────── */

    var STR = {
      zh: {
        title: '技能中心',
        intro: '统一管理 Skill、MCP 服务器与提示词注入，改动即时生效。',
        tabs: { skills: 'Skill', mcp: 'MCP', prompts: '提示词' },
        search: '搜索',
        searchHint: '按 / 聚焦搜索',
        refresh: '刷新',
        add: { skills: '新建 Skill', mcp: '新建 MCP 服务器', prompts: '新建提示词' },
        addHint: { skills: '新建 Skill（N）', mcp: '新建 MCP 服务器（N）', prompts: '新建提示词（N）' },
        filter: { all: '全部', on: '已启用', off: '已停用' },
        groups: {
          skillsMine: '我的 Skill', skillsProject: '当前项目', skillsOther: '内置与插件',
          mcpManaged: '由技能中心管理', mcpExternal: '其他插件',
          prompts: '注入段落',
        },
        groupHint: {
          skillsMine: '位于 ~/.dsh/skills 或 ~/.agents/skills，可编辑、启停与删除。',
          skillsProject: '来自工作区的 .dsh/skills 或 .agents/skills，仅在此展示。',
          skillsOther: '由内置包或其他插件提供，仅在此展示。',
          mcpManaged: '作为独立条目挂载，工具名为 mcp__<服务器名>__<工具名>。',
          mcpExternal: '其他插件已启用的服务器，只能在此启停。',
          prompts: '每条启用的提示词作为独立段落，位于工具说明之后、结构化输出之前。',
        },
        stats: function (total, on) { return total + ' 项 · ' + on + ' 项生效' },
        edit: '编辑', view: '查看', remove: '删除', save: '保存', saving: '保存中…', cancel: '取消', close: '关闭',
        create: '创建',
        on: '已启用', off: '已停用',
        injected: '注入中',
        readOnly: '只读', invalid: '格式无效', modelOff: '模型不可调用', userOff: '用户不可调用',
        loading: '正在读取…',
        loadFailed: '读取失败',
        retry: '重试',
        emptyTitle: { skills: '暂无 Skill', mcp: '还没有 MCP 服务器', prompts: '还没有提示词' },
        empty: {
          skills: '项目与内置 Skill 会自动出现在这里；自己的 Skill 放在 ~/.dsh/skills 或 ~/.agents/skills，面板里可以查看、启停和编辑。',
          mcp: '添加后，它的工具会直接出现在模型的工具列表里。点右上角「新建 MCP 服务器」，或按 N。',
          prompts: '它会随每次请求注入系统提示词。点右上角「新建提示词」，或按 N 新建一条。',
        },
        emptySearch: '没有匹配的条目',
        emptySearchText: '换个关键字，或清除筛选条件。',
        clearFilters: '清除筛选',
        createNote: {
          skills: '',
          mcp: '保存后立即连接；工具以 mcp__<服务器名>__<工具名> 出现。',
          prompts: '按原文注入每次请求的系统提示词，不解析 {{变量}}。',
        },
        fields: {
          skillName: '名称', skillNameHint: '小写字母、数字与单个短横线，例如 code-review',
          description: '描述', descriptionHint: '模型据此判断何时使用，建议一句话写清用途。',
          whenToUse: '何时使用', whenToUseHint: '可选，补充触发条件。',
          body: '正文', bodyHint: 'Markdown，加载该 Skill 时完整交给模型。',
          modelInvocable: '模型可调用', modelInvocableHint: '关闭后模型看不到此 Skill。',
          userInvocable: '用户可调用', userInvocableHint: '关闭后不会出现在用户命令中。',
          serverName: '服务器名', serverNameHint: '字母、数字、_ 或 -，最多 32 个字符。',
          transport: '传输方式',
          command: '命令', commandHint: '例如 npx、node、uvx。',
          args: '参数', argsHint: '以空格分隔。',
          env: '环境变量', envHint: '每行一个 KEY=VALUE。',
          url: '地址', urlHint: 'Streamable HTTP 端点，例如 http://127.0.0.1:3000/mcp',
          headers: '请求头', headersHint: '每行一个 KEY=VALUE。',
          enabled: '启用', enabledHint: '关闭后保留配置，但不连接、不注册工具。',
          failOnStartup: '启动失败时报错', failOnStartupHint: '首次连接失败时让该条目加载失败，便于发现配置错误。',
          promptTitle: '标题', promptTitleHint: '仅用于在列表中识别，不会注入。',
          promptText: '注入内容', promptTextHint: '按原文注入，不解析 {{变量}}。',
          promptEnabled: '注入', promptEnabledHint: '关闭后保留内容，但不再注入。',
          toolPrefix: '工具前缀',
          path: '文件位置',
          chars: function (n) { return n + ' 字符' },
        },
        errors: {
          skillName: '名称需为 kebab-case。', description: '描述不能为空。',
          serverName: '服务器名格式无效。', command: '需要填写命令。', url: '需要填写地址。',
          promptText: '注入内容不能为空。', kv: '每行需为 KEY=VALUE。',
        },
        drawerTitle: {
          skills: { create: '新建 Skill', edit: '编辑 Skill', view: 'Skill 详情' },
          mcp: { create: '新建 MCP 服务器', edit: '编辑 MCP 服务器', view: 'MCP 服务器' },
          prompts: { create: '新建提示词', edit: '编辑提示词', view: '提示词' },
        },
        readOnlyNote: '此条目来自其他来源，只能在此查看。',
        saveShortcut: 'Ctrl + S 保存',
        confirmTitle: { skills: '删除 Skill', mcp: '删除 MCP 服务器', prompts: '删除提示词' },
        confirmBody: {
          skills: function (n) { return '将删除「' + n + '」及其目录，此操作无法撤销。' },
          mcp: function (n) { return '将断开「' + n + '」并卸载其工具。' },
          prompts: function (n) { return '将删除「' + n + '」，它不再注入系统提示词。' },
        },
        toast: {
          saved: '已保存', created: '已创建', removed: '已删除', enabled: '已启用', disabled: '已停用',
        },
        busyWrite: '上一次修改还在保存，请稍后再试。',
        reloadHint: '宿主会重新加载该服务器，现有连接可能短暂中断。',
        unsupported: {
          mcp: '当前环境没有配置编辑器，MCP 只能查看。',
          prompts: '当前环境没有系统提示词服务，提示词只会保存、不会注入。',
          skills: '当前配置没有 Skill 服务。',
        },
      },
      en: {
        title: 'Skills Center',
        intro: 'Manage skills, MCP servers and prompt injections in one place. Changes apply immediately.',
        tabs: { skills: 'Skills', mcp: 'MCP', prompts: 'Prompts' },
        search: 'Search',
        searchHint: 'Press / to search',
        refresh: 'Refresh',
        add: { skills: 'New skill', mcp: 'New MCP server', prompts: 'New prompt' },
        addHint: { skills: 'New skill (N)', mcp: 'New MCP server (N)', prompts: 'New prompt (N)' },
        filter: { all: 'All', on: 'Enabled', off: 'Disabled' },
        groups: {
          skillsMine: 'My skills', skillsProject: 'This project', skillsOther: 'Bundled and plugins',
          mcpManaged: 'Managed by Skills Center', mcpExternal: 'Other plugins',
          prompts: 'Injected sections',
        },
        groupHint: {
          skillsMine: 'Under ~/.dsh/skills or ~/.agents/skills: editable, switchable and deletable.',
          skillsProject: 'From the workspace .dsh/skills or .agents/skills; shown here only.',
          skillsOther: 'Provided by bundled packages or other plugins; shown here only.',
          mcpManaged: 'Mounted as their own entries; tools appear as mcp__<server>__<tool>.',
          mcpExternal: 'Servers other plugins enabled; only their switch is available here.',
          prompts: 'Each enabled prompt is its own section, after tool guidance and before structured output.',
        },
        stats: function (total, on) { return total + ' total · ' + on + ' active' },
        edit: 'Edit', view: 'View', remove: 'Delete', save: 'Save', saving: 'Saving…', cancel: 'Cancel', close: 'Close',
        create: 'Create',
        on: 'Enabled', off: 'Disabled',
        injected: 'Injected',
        readOnly: 'Read-only', invalid: 'Invalid', modelOff: 'Hidden from model', userOff: 'Hidden from user',
        loading: 'Loading…',
        loadFailed: 'Could not load',
        retry: 'Retry',
        emptyTitle: { skills: 'No skills here', mcp: 'No MCP servers yet', prompts: 'No prompts yet' },
        empty: {
          skills: 'Project and bundled skills appear here automatically; your own live in ~/.dsh/skills or ~/.agents/skills, where this panel can view, toggle and edit them.',
          mcp: 'Its tools appear directly in the model\'s tool list. Use “New MCP server” in the top-right corner, or press N.',
          prompts: 'It is injected into every request\'s system prompt. Use “New prompt” in the top-right corner, or press N.',
        },
        emptySearch: 'No matching entries',
        emptySearchText: 'Try another keyword, or clear the filters.',
        clearFilters: 'Clear filters',
        createNote: {
          skills: '',
          mcp: 'Connects as soon as it is saved; tools appear as mcp__<server>__<tool>.',
          prompts: 'Injected verbatim into every request\'s system prompt; {{variables}} are not expanded.',
        },
        fields: {
          skillName: 'Name', skillNameHint: 'Lowercase letters, digits and single dashes, e.g. code-review',
          description: 'Description', descriptionHint: 'The model decides when to use the skill from this line.',
          whenToUse: 'When to use', whenToUseHint: 'Optional extra trigger conditions.',
          body: 'Body', bodyHint: 'Markdown handed to the model in full when the skill loads.',
          modelInvocable: 'Model can invoke', modelInvocableHint: 'When off, the model does not see this skill.',
          userInvocable: 'User can invoke', userInvocableHint: 'When off, it is left out of user commands.',
          serverName: 'Server name', serverNameHint: 'Letters, digits, _ or -, up to 32 characters.',
          transport: 'Transport',
          command: 'Command', commandHint: 'For example npx, node or uvx.',
          args: 'Arguments', argsHint: 'Separated by spaces.',
          env: 'Environment', envHint: 'One KEY=VALUE per line.',
          url: 'URL', urlHint: 'Streamable HTTP endpoint, e.g. http://127.0.0.1:3000/mcp',
          headers: 'Headers', headersHint: 'One KEY=VALUE per line.',
          enabled: 'Enabled', enabledHint: 'When off, the configuration stays but nothing connects.',
          failOnStartup: 'Fail on startup error', failOnStartupHint: 'Fail the entry when the first connection fails, so mistakes surface.',
          promptTitle: 'Title', promptTitleHint: 'Only identifies the prompt in the list; not injected.',
          promptText: 'Injected text', promptTextHint: 'Injected verbatim; {{variables}} are not expanded.',
          promptEnabled: 'Inject', promptEnabledHint: 'When off, the text is kept but not injected.',
          toolPrefix: 'Tool prefix',
          path: 'File',
          chars: function (n) { return n + ' characters' },
        },
        errors: {
          skillName: 'Use kebab-case.', description: 'A description is required.',
          serverName: 'Invalid server name.', command: 'A command is required.', url: 'A URL is required.',
          promptText: 'The injected text is empty.', kv: 'Each line must be KEY=VALUE.',
        },
        drawerTitle: {
          skills: { create: 'New skill', edit: 'Edit skill', view: 'Skill' },
          mcp: { create: 'New MCP server', edit: 'Edit MCP server', view: 'MCP server' },
          prompts: { create: 'New prompt', edit: 'Edit prompt', view: 'Prompt' },
        },
        readOnlyNote: 'This entry comes from another source and can only be viewed here.',
        saveShortcut: 'Ctrl + S to save',
        confirmTitle: { skills: 'Delete skill', mcp: 'Delete MCP server', prompts: 'Delete prompt' },
        confirmBody: {
          skills: function (n) { return '“' + n + '” and its directory will be deleted. This cannot be undone.' },
          mcp: function (n) { return '“' + n + '” will disconnect and its tools will unload.' },
          prompts: function (n) { return '“' + n + '” will be deleted and no longer injected.' },
        },
        toast: {
          saved: 'Saved', created: 'Created', removed: 'Deleted', enabled: 'Enabled', disabled: 'Disabled',
        },
        busyWrite: 'The previous change is still saving; try again in a moment.',
        reloadHint: 'The host reloads this server; existing connections may drop briefly.',
        unsupported: {
          mcp: 'No configuration editor is available here, so MCP servers are view-only.',
          prompts: 'No system-prompt service here; prompts are stored but not injected.',
          skills: 'This configuration has no skill service.',
        },
      },
    }

    function activeLocale(ctx) {
      try {
        var value = ctx.locale.getLocale()
        return (value && (value.active || value.id)) || 'zh'
      } catch (error) { return 'zh' }
    }

    function stringsFor(locale) {
      return String(locale || 'zh').toLowerCase().indexOf('zh') === 0 ? STR.zh : STR.en
    }

    function useLocale(ctx) {
      var pair = React.useState(function () { return activeLocale(ctx) })
      React.useEffect(function () {
        var stop
        try { stop = ctx.locale.subscribe(function () { pair[1](activeLocale(ctx)) }) } catch (error) { stop = undefined }
        return function () { try { if (typeof stop === 'function') stop() } catch (error) { /* disposed */ } }
      }, [])
      return pair[0]
    }

    /* ── api layer: the only place that talks to the host ─────────────────────────────────────────────────── */

    async function call(action, payload) {
      var response = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: action, payload: payload || {} }),
      })
      var body = null
      try { body = await response.json() } catch (error) { body = null }
      if (!body) throw new Error('no answer from the host (' + response.status + ')')
      if (body.ok === false) throw new Error(body.error || 'request failed')
      return body.value
    }

    /* ── icons (original, 16px stroke) ────────────────────────────────────────────────────────────────────── */

    var ICONS = {
      search: ['M11 11l3 3', 'M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10z'],
      plus: ['M8 3v10', 'M3 8h10'],
      refresh: ['M13 8a5 5 0 1 1-1.5-3.6', 'M13 2.5V5h-2.5'],
      edit: ['M10.5 2.5l3 3L6 13H3v-3z'],
      trash: ['M3 4.5h10', 'M6.5 4.5V3h3v1.5', 'M4.5 4.5l.6 8.5h5.8l.6-8.5'],
      close: ['M4 4l8 8', 'M12 4l-8 8'],
      lock: ['M5 7V5.5a3 3 0 0 1 6 0V7', 'M4 7h8v6H4z'],
      skill: ['M3 3.5h6.5L13 7v5.5H3z', 'M9.5 3.5V7H13', 'M5.5 9.5h4', 'M5.5 11.5h2.5'],
      server: ['M3 3h10v4H3z', 'M3 9h10v4H3z', 'M5.5 5h.01', 'M5.5 11h.01'],
      prompt: ['M3 4h10v7H7l-3 2.5V11H3z', 'M5.5 6.8h5', 'M5.5 8.8h3'],
      empty: ['M2.5 9.5l2-5.5h7l2 5.5', 'M2.5 9.5V13h11V9.5', 'M2.5 9.5h3.5l1 1.5h2l1-1.5h3.5'],
      warn: ['M8 2.5l6 10.5H2z', 'M8 7v2.5', 'M8 11.3h.01'],
      check: ['M3.5 8.5l3 3 6-7'],
      plug: ['M6 2v3', 'M10 2v3', 'M4.5 5h7v2.5a3.5 3.5 0 0 1-7 0z', 'M8 11v3'],
    }

    function Icon(props) {
      var paths = ICONS[props.name] || []
      var size = props.size || 16
      return h('svg', {
        width: size, height: size, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
        strokeWidth: props.weight || 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true',
        className: props.className,
      }, paths.map(function (d, i) { return h('path', { key: i, d: d }) }))
    }

    /* ── shared controls ──────────────────────────────────────────────────────────────────────────────────── */

    function Switch(props) {
      return h('button', {
        type: 'button',
        className: 'sw-switch',
        role: 'switch',
        'aria-checked': props.checked ? 'true' : 'false',
        'aria-label': props.label,
        'data-pending': props.pending ? 'true' : undefined,
        title: props.label,
        disabled: props.disabled || props.pending,
        onClick: function (event) {
          event.stopPropagation()
          if (props.onChange) props.onChange(!props.checked)
        },
      }, h('span', { className: 'sw-switch-thumb', 'aria-hidden': 'true' }))
    }

    function Button(props) {
      var cls = 'sw-btn'
      if (props.variant) cls += ' sw-btn-' + props.variant
      if (props.className) cls += ' ' + props.className
      return h('button', {
        type: props.type || 'button',
        className: cls,
        disabled: props.disabled,
        title: props.title,
        onClick: props.onClick,
      }, props.icon ? h(Icon, { name: props.icon }) : null, props.children ? h('span', null, props.children) : null)
    }

    function IconButton(props) {
      return h('button', {
        type: 'button',
        className: 'sw-icon-btn' + (props.danger ? ' sw-icon-btn-danger' : ''),
        title: props.label,
        'aria-label': props.label,
        disabled: props.disabled,
        onClick: function (event) { event.stopPropagation(); props.onClick() },
      }, h(Icon, { name: props.icon }))
    }

    function Tag(props) {
      return h('span', { className: 'sw-tag' + (props.tone ? ' sw-tag-' + props.tone : '') }, props.children)
    }

    function Segmented(props) {
      return h('div', { className: 'sw-seg', role: 'radiogroup', 'aria-label': props.label },
        props.options.map(function (option) {
          var active = option.value === props.value
          return h('button', {
            key: option.value,
            type: 'button',
            role: 'radio',
            'aria-checked': active ? 'true' : 'false',
            className: 'sw-seg-item' + (active ? ' is-active' : ''),
            disabled: props.disabled,
            onClick: function () { props.onChange(option.value) },
          }, option.label, option.count !== undefined ? h('span', { className: 'sw-seg-count' }, String(option.count)) : null)
        }))
    }

    function Field(props) {
      return h('div', { className: 'sw-field' },
        h('div', { className: 'sw-field-head' },
          h('label', { className: 'sw-field-label', htmlFor: props.id }, props.label),
          props.aside ? h('span', { className: 'sw-field-aside' }, props.aside) : null),
        props.children,
        props.error
          ? h('p', { className: 'sw-field-error' }, props.error)
          : props.hint ? h('p', { className: 'sw-field-hint' }, props.hint) : null)
    }

    function SettingRow(props) {
      return h('div', { className: 'sw-setting' },
        h('div', { className: 'sw-setting-text' },
          h('div', { className: 'sw-setting-label' }, props.label),
          props.hint ? h('div', { className: 'sw-setting-hint' }, props.hint) : null),
        h(Switch, { checked: props.checked, label: props.label, disabled: props.disabled, onChange: props.onChange }))
    }

    function Input(props) {
      return h('input', {
        id: props.id,
        className: 'sw-input' + (props.mono ? ' sw-mono' : '') + (props.invalid ? ' is-invalid' : ''),
        type: 'text',
        value: props.value,
        placeholder: props.placeholder,
        disabled: props.disabled,
        readOnly: props.readOnly,
        spellCheck: false,
        autoComplete: 'off',
        autoFocus: props.autoFocus,
        onChange: function (event) { props.onChange(event.target.value) },
      })
    }

    function TextArea(props) {
      return h('textarea', {
        id: props.id,
        className: 'sw-input sw-textarea' + (props.mono ? ' sw-mono' : '') + (props.invalid ? ' is-invalid' : ''),
        value: props.value,
        placeholder: props.placeholder,
        readOnly: props.readOnly,
        rows: props.rows || 6,
        spellCheck: false,
        autoFocus: props.autoFocus,
        onChange: function (event) { props.onChange(event.target.value) },
      })
    }

    /* ── overlays ─────────────────────────────────────────────────────────────────────────────────────────── */

    /** ESC closes the topmost overlay unless a native control or a host layer already consumed it. */
    function useEscape(active, onEscape) {
      var ref = React.useRef(onEscape)
      ref.current = onEscape
      React.useEffect(function () {
        if (!active) return undefined
        function onKey(event) {
          if (event.key !== 'Escape' || event.defaultPrevented) return
          // A multi-line editor keeps ESC so a stray key never discards typed text.
          if (event.target && event.target.tagName === 'TEXTAREA') return
          event.stopPropagation()
          ref.current()
        }
        window.addEventListener('keydown', onKey, true)
        return function () { window.removeEventListener('keydown', onKey, true) }
      }, [active])
    }

    function Drawer(props) {
      // While a confirmation sits on top, ESC belongs to it.
      useEscape(!props.blocked, props.onClose)
      var bodyRef = React.useRef(null)
      return h('div', {
        className: 'sw-layer',
        onMouseDown: function (event) { if (event.target === event.currentTarget) props.onClose() },
      },
        h('aside', {
          className: 'sw-drawer',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': props.title,
          onKeyDown: function (event) {
            if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
              event.preventDefault()
              if (props.onSave && !props.saveDisabled) props.onSave()
            }
          },
        },
          h('header', { className: 'sw-drawer-head' },
            h('span', { className: 'sw-drawer-icon' }, h(Icon, { name: props.icon, size: 18 })),
            h('div', { className: 'sw-drawer-heading' },
              h('h2', { className: 'sw-drawer-title' }, props.title),
              props.subtitle ? h('p', { className: 'sw-drawer-sub' }, props.subtitle) : null,
              props.note ? h('p', { className: 'sw-drawer-note' }, props.note) : null),
            h(IconButton, { icon: 'close', label: props.closeLabel, onClick: props.onClose })),
          props.banner,
          h('div', { className: 'sw-drawer-body', ref: bodyRef }, props.children),
          h('footer', { className: 'sw-drawer-foot' },
            h('span', { className: 'sw-drawer-hint' }, props.footHint || ''),
            props.footer)))
    }

    function Dialog(props) {
      useEscape(true, props.onClose)
      return h('div', {
        className: 'sw-layer sw-layer-center',
        onMouseDown: function (event) { if (event.target === event.currentTarget) props.onClose() },
      },
        h('div', { className: 'sw-dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': props.title },
          h('h2', { className: 'sw-dialog-title' }, props.title),
          h('p', { className: 'sw-dialog-body' }, props.body),
          h('div', { className: 'sw-dialog-foot' }, props.footer)))
    }

    function Toast(props) {
      if (!props.toast) return null
      return h('div', { className: 'sw-toast sw-toast-' + props.toast.kind, role: 'status', 'aria-live': 'polite' },
        h(Icon, { name: props.toast.kind === 'error' ? 'warn' : 'check' }),
        h('span', null, props.toast.text),
        props.toast.kind === 'error' ? h(IconButton, { icon: 'close', label: props.closeLabel, onClick: props.onClose }) : null)
    }

    /* ── list ─────────────────────────────────────────────────────────────────────────────────────────────── */

    function Row(props) {
      return h('li', {
        className: 'sw-row' + (props.muted ? ' is-muted' : ''),
        'data-pending': props.pending ? 'true' : undefined,
      },
        h('button', {
          type: 'button',
          className: 'sw-row-open',
          'aria-label': props.openLabel + ': ' + props.title,
          onClick: props.onOpen,
        }),
        h('span', { className: 'sw-row-icon sw-row-icon-' + props.kind }, h(Icon, { name: props.icon, size: 18 })),
        h('div', { className: 'sw-row-main' },
          h('div', { className: 'sw-row-title' },
            h('span', { className: 'sw-row-name' + (props.mono ? ' sw-mono' : '') }, props.title),
            props.tags),
          props.description ? h('p', { className: 'sw-row-desc' + (props.descMono ? ' sw-mono' : '') }, props.description) : null),
        h('div', { className: 'sw-row-end' },
          h('div', { className: 'sw-row-actions' }, props.actions),
          props.toggle))
    }

    function Group(props) {
      if (!props.children || !props.children.length) return null
      return h('section', { className: 'sw-group' },
        h('div', { className: 'sw-group-head' },
          h('h3', { className: 'sw-group-title' }, props.title),
          h('span', { className: 'sw-group-count' }, String(props.children.length))),
        props.hint ? h('p', { className: 'sw-group-hint' }, props.hint) : null,
        h('ul', { className: 'sw-rows' }, props.children))
    }

    function SkeletonRows() {
      return h('ul', { className: 'sw-rows', 'aria-hidden': 'true' },
        [0, 1, 2, 3].map(function (i) {
          return h('li', { key: i, className: 'sw-row sw-row-skeleton' },
            h('span', { className: 'sw-row-icon sw-skel' }),
            h('div', { className: 'sw-row-main' },
              h('span', { className: 'sw-skel sw-skel-title' }),
              h('span', { className: 'sw-skel sw-skel-desc' })))
        }))
    }

    function EmptyState(props) {
      return h('div', { className: 'sw-empty' },
        h('span', { className: 'sw-empty-icon' }, h(Icon, { name: props.icon || 'empty', size: 22 })),
        props.title ? h('p', { className: 'sw-empty-title' }, props.title) : null,
        h('p', { className: 'sw-empty-text' }, props.text),
        props.action ? h('div', { className: 'sw-empty-action' }, props.action) : null)
    }

    /* ── editor helpers ───────────────────────────────────────────────────────────────────────────────────── */

    function kvText(map) {
      return Object.keys(map || {}).map(function (key) { return key + '=' + map[key] }).join('\n')
    }

    function kvValid(text) {
      return String(text || '').split(/\r?\n/).every(function (line) {
        var trimmed = line.trim()
        return !trimmed || trimmed.indexOf('=') > 0
      })
    }

    function validate(kind, fields, text) {
      var errors = {}
      if (kind === 'skills') {
        if (!SKILL_NAME.test(fields.name.trim())) errors.name = text.errors.skillName
        if (!fields.description.trim()) errors.description = text.errors.description
      } else if (kind === 'mcp') {
        if (!SERVER_NAME.test(fields.serverName.trim())) errors.serverName = text.errors.serverName
        if (fields.transport === 'stdio' && !fields.command.trim()) errors.command = text.errors.command
        if (fields.transport === 'streamable-http' && !fields.url.trim()) errors.url = text.errors.url
        if (fields.transport === 'stdio' && !kvValid(fields.env)) errors.env = text.errors.kv
        if (fields.transport === 'streamable-http' && !kvValid(fields.headers)) errors.headers = text.errors.kv
      } else if (!fields.text.trim()) {
        errors.text = text.errors.promptText
      }
      return errors
    }

    function SkillForm(props) {
      var f = props.fields
      var ro = props.readOnly
      var e = props.touched ? props.errors : {}
      var t = props.text.fields
      return [
        h(Field, { key: 'name', id: 'sw-f-name', label: t.skillName, hint: t.skillNameHint, error: e.name },
          h(Input, { id: 'sw-f-name', mono: true, value: f.name, readOnly: ro, invalid: Boolean(e.name), autoFocus: props.mode === 'create', placeholder: 'code-review', onChange: props.set('name') })),
        h(Field, { key: 'desc', id: 'sw-f-desc', label: t.description, hint: t.descriptionHint, error: e.description },
          h(Input, { id: 'sw-f-desc', value: f.description, readOnly: ro, invalid: Boolean(e.description), onChange: props.set('description') })),
        h(Field, { key: 'when', id: 'sw-f-when', label: t.whenToUse, hint: t.whenToUseHint },
          h(Input, { id: 'sw-f-when', value: f.whenToUse, readOnly: ro, onChange: props.set('whenToUse') })),
        h('div', { key: 'flags', className: 'sw-settings' },
          h(SettingRow, { label: t.modelInvocable, hint: t.modelInvocableHint, checked: f.modelInvocable, disabled: ro, onChange: props.set('modelInvocable') }),
          h(SettingRow, { label: t.userInvocable, hint: t.userInvocableHint, checked: f.userInvocable, disabled: ro, onChange: props.set('userInvocable') })),
        h(Field, { key: 'body', id: 'sw-f-body', label: t.body, hint: t.bodyHint, aside: props.loading ? props.text.loading : t.chars(f.content.length) },
          h(TextArea, { id: 'sw-f-body', mono: true, rows: 14, value: f.content, readOnly: ro || props.loading, onChange: props.set('content') })),
        props.path ? h('div', { key: 'path', className: 'sw-meta-line' }, h('span', null, t.path), h('code', { className: 'sw-mono' }, props.path)) : null,
      ]
    }

    function McpForm(props) {
      var f = props.fields
      var e = props.touched ? props.errors : {}
      var t = props.text.fields
      var ro = props.readOnly
      var http = f.transport === 'streamable-http'
      var prefix = 'mcp__' + (f.serverName.trim() || '<server>') + '__*'
      return [
        h(Field, { key: 'name', id: 'sw-f-server', label: t.serverName, hint: t.serverNameHint, error: e.serverName },
          h(Input, { id: 'sw-f-server', mono: true, value: f.serverName, readOnly: ro, invalid: Boolean(e.serverName), autoFocus: props.mode === 'create', placeholder: 'github', onChange: props.set('serverName') })),
        h(Field, { key: 'transport', id: 'sw-f-transport', label: t.transport },
          h(Segmented, {
            label: t.transport,
            value: f.transport,
            disabled: ro,
            options: [{ value: 'stdio', label: 'stdio' }, { value: 'streamable-http', label: 'Streamable HTTP' }],
            onChange: props.set('transport'),
          })),
        http
          ? h(Field, { key: 'url', id: 'sw-f-url', label: t.url, hint: t.urlHint, error: e.url },
            h(Input, { id: 'sw-f-url', mono: true, value: f.url, readOnly: ro, invalid: Boolean(e.url), placeholder: 'http://127.0.0.1:3000/mcp', onChange: props.set('url') }))
          : h('div', { key: 'cmd', className: 'sw-grid' },
            h(Field, { id: 'sw-f-cmd', label: t.command, hint: t.commandHint, error: e.command },
              h(Input, { id: 'sw-f-cmd', mono: true, value: f.command, readOnly: ro, invalid: Boolean(e.command), placeholder: 'npx', onChange: props.set('command') })),
            h(Field, { id: 'sw-f-args', label: t.args, hint: t.argsHint },
              h(Input, { id: 'sw-f-args', mono: true, value: f.args, readOnly: ro, placeholder: '-y @modelcontextprotocol/server-github', onChange: props.set('args') }))),
        http
          ? h(Field, { key: 'headers', id: 'sw-f-headers', label: t.headers, hint: t.headersHint, error: e.headers },
            h(TextArea, { id: 'sw-f-headers', mono: true, rows: 4, value: f.headers, readOnly: ro, invalid: Boolean(e.headers), placeholder: 'Authorization=Bearer …', onChange: props.set('headers') }))
          : h(Field, { key: 'env', id: 'sw-f-env', label: t.env, hint: t.envHint, error: e.env },
            h(TextArea, { id: 'sw-f-env', mono: true, rows: 4, value: f.env, readOnly: ro, invalid: Boolean(e.env), placeholder: 'GITHUB_TOKEN=…', onChange: props.set('env') })),
        h('div', { key: 'flags', className: 'sw-settings' },
          h(SettingRow, { label: t.enabled, hint: t.enabledHint, checked: f.enabled, disabled: ro, onChange: props.set('enabled') }),
          h(SettingRow, { label: t.failOnStartup, hint: t.failOnStartupHint, checked: f.failOnStartupError, disabled: ro, onChange: props.set('failOnStartupError') })),
        h('div', { key: 'prefix', className: 'sw-meta-line' }, h('span', null, t.toolPrefix), h('code', { className: 'sw-mono' }, prefix)),
      ]
    }

    function PromptForm(props) {
      var f = props.fields
      var e = props.touched ? props.errors : {}
      var t = props.text.fields
      return [
        h(Field, { key: 'title', id: 'sw-f-title', label: t.promptTitle, hint: t.promptTitleHint },
          h(Input, { id: 'sw-f-title', value: f.title, autoFocus: props.mode === 'create', onChange: props.set('title') })),
        h(Field, { key: 'text', id: 'sw-f-text', label: t.promptText, hint: t.promptTextHint, error: e.text, aside: t.chars(f.text.length) },
          h(TextArea, { id: 'sw-f-text', rows: 16, value: f.text, invalid: Boolean(e.text), onChange: props.set('text') })),
        h('div', { key: 'flags', className: 'sw-settings' },
          h(SettingRow, { label: t.promptEnabled, hint: t.promptEnabledHint, checked: f.enabled, onChange: props.set('enabled') })),
      ]
    }

    /* ── panel ────────────────────────────────────────────────────────────────────────────────────────────── */

    function rowKey(kind, row) {
      return kind + ':' + (kind === 'skills' ? row.name : row.id)
    }

    function isOn(kind, row) {
      return kind === 'skills' ? row.modelInvocable : row.enabled
    }

    function Panel(props) {
      var ctx = props.ctx
      var text = stringsFor(useLocale(ctx))

      var s = React.useState({ phase: 'loading', data: null, error: null })
      var state = s[0], setState = s[1]
      var tabState = React.useState('skills')
      var tab = tabState[0], setTab = tabState[1]
      var queryState = React.useState('')
      var query = queryState[0], setQuery = queryState[1]
      var filterState = React.useState('all')
      var filter = filterState[0], setFilter = filterState[1]
      var draftState = React.useState(null)
      var draft = draftState[0], setDraft = draftState[1]
      var confirmState = React.useState(null)
      var confirm = confirmState[0], setConfirm = confirmState[1]
      var pendingState = React.useState({})
      var pending = pendingState[0], setPending = pendingState[1]
      var savingState = React.useState(false)
      var saving = savingState[0], setSaving = savingState[1]
      var toastState = React.useState(null)
      var toast = toastState[0], setToast = toastState[1]

      var lockRef = React.useRef(false)
      var aliveRef = React.useRef(true)
      var searchRef = React.useRef(null)
      var toastTimer = React.useRef(null)

      React.useEffect(function () {
        aliveRef.current = true
        return function () {
          aliveRef.current = false
          if (toastTimer.current) clearTimeout(toastTimer.current)
        }
      }, [])

      function notify(kind, message) {
        if (toastTimer.current) clearTimeout(toastTimer.current)
        setToast({ kind: kind, text: message })
        toastTimer.current = setTimeout(function () { if (aliveRef.current) setToast(null) }, kind === 'error' ? 7000 : 2600)
      }

      var load = React.useCallback(async function (quiet) {
        if (!quiet) setState(function (prev) { return { phase: 'loading', data: prev.data, error: null } })
        try {
          var data = await call('catalog')
          if (aliveRef.current) setState({ phase: 'ready', data: data, error: null })
        } catch (error) {
          if (aliveRef.current) setState(function (prev) { return { phase: 'error', data: prev.data, error: String((error && error.message) || error) } })
        }
      }, [])

      React.useEffect(function () { load(false) }, [load])

      // `/` focuses the search box, the way host lists do.
      React.useEffect(function () {
        function onKey(event) {
          if (event.key !== '/' || draft || confirm) return
          var target = event.target
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
          if (!searchRef.current) return
          event.preventDefault()
          searchRef.current.focus()
        }
        window.addEventListener('keydown', onKey)
        return function () { window.removeEventListener('keydown', onKey) }
      }, [draft, confirm])

      /**
       * One write at a time: a ref answers synchronously, the state drives rendering.
       * @returns 'ok' | 'failed' | 'busy' — a second click while a write runs must not look like success.
       */
      async function withWrite(operation) {
        if (lockRef.current) return 'busy'
        lockRef.current = true
        try {
          await operation()
          return 'ok'
        } catch (error) {
          notify('error', String((error && error.message) || error))
          return 'failed'
        } finally {
          lockRef.current = false
          await load(true)
        }
      }

      var data = state.data
      var lists = {
        skills: data ? data.skills.rows : [],
        mcp: data ? data.mcp.rows : [],
        prompts: data ? data.prompts.rows : [],
      }
      var supported = {
        skills: !data || data.skills.supported !== false,
        mcp: !data || data.mcp.supported !== false,
        prompts: !data || data.prompts.supported !== false,
      }

      var all = lists[tab]
      var activeCount = all.filter(function (row) { return isOn(tab, row) }).length
      var needle = query.trim().toLowerCase()
      var visible = all.filter(function (row) {
        if (filter === 'on' && !isOn(tab, row)) return false
        if (filter === 'off' && isOn(tab, row)) return false
        if (!needle) return true
        var hay = tab === 'mcp'
          ? [row.serverName, row.command, (row.args || []).join(' '), row.url, row.id]
          : tab === 'skills'
            ? [row.name, row.description, row.whenToUse, row.source]
            : [row.title, row.text, row.id]
        return hay.join(' ').toLowerCase().indexOf(needle) !== -1
      })

      /* drafts */

      function openDraft(kind, row) {
        if (kind === 'skills') {
          var readOnly = Boolean(row) && !row.writable
          setDraft({
            kind: kind, mode: row ? (readOnly ? 'view' : 'edit') : 'create', readOnly: readOnly, touched: false,
            originalName: row ? row.name : null, path: row ? row.path : '', loading: Boolean(row),
            fields: {
              name: row ? row.name : '', description: row ? row.description : '', whenToUse: row ? row.whenToUse || '' : '',
              modelInvocable: row ? row.modelInvocable : true, userInvocable: row ? row.userInvocable : true, content: '',
            },
          })
          if (row) {
            call('skill.detail', { name: row.name }).then(function (detail) {
              if (!aliveRef.current) return
              setDraft(function (cur) {
                if (!cur || cur.kind !== 'skills' || cur.originalName !== row.name) return cur
                return Object.assign({}, cur, {
                  loading: false, path: detail.path || cur.path,
                  fields: Object.assign({}, cur.fields, { content: detail.content || '', whenToUse: detail.whenToUse || cur.fields.whenToUse }),
                })
              })
            }).catch(function (error) {
              if (!aliveRef.current) return
              setDraft(null)
              notify('error', String((error && error.message) || error))
            })
          }
          return
        }
        if (kind === 'mcp') {
          var c = row || {}
          // A server another bundle declares is read-only here: saving it would create a second managed row.
          var external = Boolean(row && row.external)
          setDraft({
            kind: kind, mode: row ? (external ? 'view' : 'edit') : 'create', readOnly: external, touched: false,
            fields: {
              id: row ? row.id : '', serverName: c.serverName || '', transport: c.transport || 'stdio',
              command: c.command || '', args: (c.args || []).join(' '), env: kvText(c.env), url: c.url || '',
              headers: kvText(c.headers), enabled: row ? row.enabled : true, failOnStartupError: Boolean(c.failOnStartupError),
            },
          })
          return
        }
        setDraft({
          kind: kind, mode: row ? 'edit' : 'create', readOnly: false, touched: false,
          fields: { id: row ? row.id : '', title: row ? row.title : '', text: row ? row.text : '', enabled: row ? row.enabled : true },
        })
      }

      // `N` opens the create drawer for the current tab, the counterpart of `/` for search.
      React.useEffect(function () {
        function onKey(event) {
          if (draft || confirm) return
          if (event.metaKey || event.ctrlKey || event.altKey) return
          if (event.key !== 'n' && event.key !== 'N') return
          var target = event.target
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
          if (!CREATABLE[tab] || !supported[tab]) return
          event.preventDefault()
          openDraft(tab, null)
        }
        window.addEventListener('keydown', onKey)
        return function () { window.removeEventListener('keydown', onKey) }
      }, [draft, confirm, tab, supported.skills, supported.mcp, supported.prompts])

      function setField(key) {
        return function (value) {
          setDraft(function (cur) {
            if (!cur) return cur
            var fields = Object.assign({}, cur.fields)
            fields[key] = value
            return Object.assign({}, cur, { fields: fields })
          })
        }
      }

      var draftErrors = draft ? validate(draft.kind, draft.fields, text) : {}
      var draftInvalid = Object.keys(draftErrors).length > 0

      async function saveDraft() {
        var cur = draft
        if (!cur || cur.readOnly || saving) return
        if (draftInvalid) {
          setDraft(Object.assign({}, cur, { touched: true }))
          return
        }
        var f = cur.fields
        setSaving(true)
        var outcome = await withWrite(async function () {
          if (cur.kind === 'skills') {
            await call('skill.save', {
              name: f.name.trim(), originalName: cur.originalName || undefined, description: f.description,
              whenToUse: f.whenToUse, modelInvocable: f.modelInvocable, userInvocable: f.userInvocable, content: f.content,
            })
          } else if (cur.kind === 'mcp') {
            await call('mcp.save', {
              id: f.id || undefined, serverName: f.serverName.trim(), transport: f.transport, command: f.command,
              args: f.args, env: f.env, url: f.url, headers: f.headers, enabled: f.enabled, failOnStartupError: f.failOnStartupError,
            })
          } else {
            await call('prompt.save', { id: f.id || undefined, title: f.title, text: f.text, enabled: f.enabled })
          }
        })
        if (!aliveRef.current) return
        setSaving(false)
        if (outcome === 'busy') {
          notify('error', text.busyWrite)
          return
        }
        if (outcome === 'ok') {
          setDraft(null)
          notify('ok', cur.mode === 'create' ? text.toast.created : text.toast.saved)
        }
      }

      async function toggle(kind, row, next) {
        var key = rowKey(kind, row)
        if (pending[key]) return
        // Optimistic: flip locally, revert when the host refuses.
        setPending(function (p) { var n = Object.assign({}, p); n[key] = true; return n })
        setState(function (prev) {
          if (!prev.data) return prev
          var copy = Object.assign({}, prev.data)
          var group = Object.assign({}, copy[kind])
          group.rows = group.rows.map(function (r) {
            if (rowKey(kind, r) !== key) return r
            return kind === 'skills' ? Object.assign({}, r, { modelInvocable: next }) : Object.assign({}, r, { enabled: next })
          })
          copy[kind] = group
          return Object.assign({}, prev, { data: copy })
        })
        var outcome = await withWrite(async function () {
          if (kind === 'skills') await call('skill.setInvocation', { name: row.name, modelInvocable: next, userInvocable: row.userInvocable })
          else if (kind === 'mcp' && row.external) await call('mcp.setExternalEnabled', { entryId: row.entryId, enabled: next })
          else if (kind === 'mcp') await call('mcp.setEnabled', { id: row.id, enabled: next })
          else await call('prompt.setEnabled', { id: row.id, enabled: next })
        })
        if (!aliveRef.current) return
        setPending(function (p) { var n = Object.assign({}, p); delete n[key]; return n })
        // A refused or skipped write leaves the optimistic flip on screen; reload so the row shows the host's truth.
        if (outcome !== 'ok') {
          await load(true)
          return
        }
        notify('ok', next ? text.toast.enabled : text.toast.disabled)
      }

      async function remove() {
        var cur = confirm
        if (!cur) return
        setSaving(true)
        var outcome = await withWrite(async function () {
          if (cur.kind === 'skills') await call('skill.remove', { name: cur.row.name })
          else if (cur.kind === 'mcp') await call('mcp.remove', { id: cur.row.id })
          else await call('prompt.remove', { id: cur.row.id })
        })
        if (!aliveRef.current) return
        setSaving(false)
        if (outcome === 'busy') {
          notify('error', text.busyWrite)
          return
        }
        if (outcome === 'ok') {
          setConfirm(null)
          if (draft) setDraft(null)
          notify('ok', text.toast.removed)
        }
      }

      function askRemove(kind, row) {
        var label = kind === 'skills' ? row.name : kind === 'mcp' ? (row.serverName || row.id) : (row.title || row.id)
        setConfirm({ kind: kind, row: row, label: label })
      }

      /* rows */

      function renderRow(kind, row) {
        var key = rowKey(kind, row)
        var on = isOn(kind, row)
        var busy = Boolean(pending[key])
        var tags = []
        var actions = []
        var editable = kind === 'skills' ? row.writable : !(kind === 'mcp' && row.external)

        if (kind === 'skills') {
          if (!row.writable) tags.push(h(Tag, { key: 'ro' }, h(Icon, { name: 'lock', size: 11 }), text.readOnly))
          if (row.invalid) tags.push(h(Tag, { key: 'inv', tone: 'warn' }, text.invalid))
          if (!row.userInvocable) tags.push(h(Tag, { key: 'uo' }, text.userOff))
          tags.push(h(Tag, { key: 'src', tone: 'quiet' }, row.source || row.provider))
        } else if (kind === 'mcp') {
          tags.push(h(Tag, { key: 'tr', tone: 'quiet' }, row.transport === 'streamable-http' ? 'HTTP' : 'stdio'))
          if (row.external) tags.push(h(Tag, { key: 'ro' }, h(Icon, { name: 'lock', size: 11 }), text.readOnly))
          if (row.phase === 'failed') tags.push(h(Tag, { key: 'f', tone: 'error' }, 'failed'))
        } else {
          // `applied` is the host's own answer to "this prompt is in the assembled system prompt right now".
          if (row.applied) tags.push(h(Tag, { key: 'on', tone: 'ok' }, text.injected))
          else tags.push(h(Tag, { key: 'off', tone: 'quiet' }, text.off))
          tags.push(h(Tag, { key: 'len', tone: 'quiet' }, text.fields.chars(String(row.text || '').length)))
        }

        if (editable) {
          actions.push(h(IconButton, { key: 'edit', icon: 'edit', label: text.edit, onClick: function () { openDraft(kind, row) } }))
          actions.push(h(IconButton, { key: 'rm', icon: 'trash', danger: true, label: text.remove, onClick: function () { askRemove(kind, row) } }))
        }

        var description = kind === 'skills'
          ? row.description
          : kind === 'mcp'
            ? (row.transport === 'streamable-http' ? row.url : [row.command].concat(row.args || []).join(' '))
            : String(row.text || '').replace(/\s+/g, ' ')

        return h(Row, {
          key: key,
          kind: kind,
          icon: kind === 'skills' ? 'skill' : kind === 'mcp' ? 'server' : 'prompt',
          title: kind === 'skills' ? row.name : kind === 'mcp' ? (row.serverName || row.id) : (row.title || row.id),
          mono: kind !== 'prompts',
          tags: tags,
          description: description,
          descMono: kind === 'mcp',
          muted: !on,
          pending: busy,
          openLabel: editable ? text.edit : text.view,
          onOpen: function () { openDraft(kind, row) },
          actions: actions,
          toggle: h(Switch, {
            checked: on,
            pending: busy,
            label: kind === 'skills' ? text.fields.modelInvocable : on ? text.on : text.off,
            disabled: (kind === 'skills' && !row.writable) || (kind === 'mcp' && row.external && !row.toggleable),
            onChange: function (next) { toggle(kind, row, next) },
          }),
        })
      }

      function groupsFor(kind, rows) {
        if (kind === 'skills') {
          return [
            { id: 'skillsMine', rows: rows.filter(function (r) { return r.writable }) },
            { id: 'skillsProject', rows: rows.filter(function (r) { return !r.writable && /^project/.test(r.source || '') }) },
            { id: 'skillsOther', rows: rows.filter(function (r) { return !r.writable && !/^project/.test(r.source || '') }) },
          ]
        }
        if (kind === 'mcp') {
          return [
            { id: 'mcpManaged', rows: rows.filter(function (r) { return !r.external }) },
            { id: 'mcpExternal', rows: rows.filter(function (r) { return r.external }) },
          ]
        }
        return [{ id: 'prompts', rows: rows }]
      }

      /* render */

      var tabs = ['skills', 'mcp', 'prompts']
      // Skills are authored on disk (or by the agent): the panel views, toggles and edits them but never creates one.
      var canCreate = CREATABLE[tab] && Boolean(supported[tab])
      // An empty list is never "filtered": the empty state has to stay readable even when a search was typed.
      var filtering = (Boolean(needle) || filter !== 'all') && all.length > 0
      var content

      if (state.phase === 'loading' && !data) {
        content = h(SkeletonRows)
      } else if (state.phase === 'error' && !data) {
        content = h('div', { className: 'sw-failure' },
          h(Icon, { name: 'warn' }),
          h('span', null, text.loadFailed + ': ' + state.error),
          h(Button, { onClick: function () { load(false) } }, text.retry))
      } else if (!visible.length) {
        content = filtering
          ? h(EmptyState, {
            icon: 'search',
            title: text.emptySearch,
            text: text.emptySearchText,
            action: h(Button, { onClick: function () { setQuery(''); setFilter('all') } }, text.clearFilters),
          })
          : h(EmptyState, {
            icon: tab === 'skills' ? 'skill' : tab === 'mcp' ? 'plug' : 'prompt',
            title: text.emptyTitle[tab],
            text: text.empty[tab],
          })
      } else {
        content = h('div', { className: 'sw-groups' },
          groupsFor(tab, visible).map(function (group) {
            return h(Group, { key: group.id, title: text.groups[group.id], hint: text.groupHint[group.id] },
              group.rows.map(function (row) { return renderRow(tab, row) }))
          }))
      }

      var drawer = null
      if (draft) {
        var titles = text.drawerTitle[draft.kind]
        var formProps = {
          fields: draft.fields, set: setField, text: text, mode: draft.mode, readOnly: draft.readOnly,
          errors: draftErrors, touched: draft.touched, loading: draft.loading, path: draft.path,
        }
        var canDelete = draft.mode !== 'create' && !draft.readOnly
        drawer = h(Drawer, {
          title: titles[draft.mode],
          subtitle: draft.mode === 'create' ? null : (draft.kind === 'skills' ? draft.originalName : draft.kind === 'mcp' ? draft.fields.serverName : draft.fields.title),
          note: draft.mode === 'create' ? text.createNote[draft.kind] : null,
          icon: draft.kind === 'skills' ? 'skill' : draft.kind === 'mcp' ? 'server' : 'prompt',
          closeLabel: text.close,
          blocked: Boolean(confirm),
          onClose: function () { if (!saving) setDraft(null) },
          onSave: saveDraft,
          saveDisabled: draft.readOnly || saving,
          banner: draft.readOnly
            ? h('div', { className: 'sw-banner' }, h(Icon, { name: 'lock' }), h('span', null, text.readOnlyNote))
            : draft.kind === 'mcp' && draft.mode !== 'create'
              ? h('div', { className: 'sw-banner' }, h(Icon, { name: 'refresh' }), h('span', null, text.reloadHint))
              : null,
          footHint: draft.readOnly ? '' : text.saveShortcut,
          footer: draft.readOnly
            ? [h(Button, { key: 'close', onClick: function () { setDraft(null) } }, text.close)]
            : [
              canDelete ? h(Button, {
                key: 'del', variant: 'danger-ghost', icon: 'trash', disabled: saving,
                onClick: function () {
                  var row = draft.kind === 'skills'
                    ? { name: draft.originalName }
                    : { id: draft.fields.id, serverName: draft.fields.serverName, title: draft.fields.title }
                  askRemove(draft.kind, row)
                },
              }, text.remove) : null,
              h('span', { key: 'gap', className: 'sw-grow' }),
              h(Button, { key: 'cancel', disabled: saving, onClick: function () { setDraft(null) } }, text.cancel),
              h(Button, { key: 'save', variant: 'primary', disabled: saving || draft.loading, onClick: saveDraft },
                saving ? text.saving : draft.mode === 'create' ? text.create : text.save),
            ],
        },
          draft.kind === 'skills' ? h(SkillForm, formProps) : draft.kind === 'mcp' ? h(McpForm, formProps) : h(PromptForm, formProps))
      }

      return h('div', { className: 'sw-page' },
        h(StyleSheet),
        h('header', { className: 'sw-head' },
          h('div', { className: 'sw-heading' },
            h('h1', { className: 'sw-title' }, text.title),
            h('p', { className: 'sw-intro' }, text.intro)),
          h('div', { className: 'sw-toolbar' },
            h(IconButton, {
              icon: 'refresh', label: text.refresh,
              disabled: state.phase === 'loading',
              onClick: function () { load(false) },
            }),
            canCreate ? h(Button, {
              variant: 'primary', icon: 'plus', title: text.addHint[tab],
              onClick: function () { openDraft(tab, null) },
            }, text.add[tab]) : null)),

        h('div', { className: 'sw-body' },
          h('nav', { className: 'sw-tabs', role: 'tablist' },
            tabs.map(function (id) {
              var total = lists[id].length
              return h('button', {
                key: id, type: 'button', role: 'tab',
                'aria-selected': tab === id ? 'true' : 'false',
                'data-active': tab === id ? 'true' : 'false',
                className: 'sw-tab',
                onClick: function () { setTab(id); setFilter('all') },
              }, text.tabs[id], data ? h('span', { className: 'sw-tab-count' }, String(total)) : null)
            })),

          !supported[tab] ? h('div', { className: 'sw-banner sw-banner-warn' }, h(Icon, { name: 'warn' }), h('span', null, text.unsupported[tab])) : null,

          h('div', { className: 'sw-filters' },
            h('label', { className: 'sw-search' },
              h(Icon, { name: 'search', className: 'sw-search-icon' }),
              h('input', {
                ref: searchRef,
                className: 'sw-search-input',
                type: 'search',
                value: query,
                placeholder: text.search,
                title: text.searchHint,
                'aria-label': text.search,
                onChange: function (event) { setQuery(event.target.value) },
                onKeyDown: function (event) { if (event.key === 'Escape' && query) { event.preventDefault(); setQuery('') } },
              }),
              h('kbd', { className: 'sw-kbd', 'aria-hidden': 'true' }, '/')),
            h(Segmented, {
              label: text.filter.all,
              value: filter,
              options: [
                { value: 'all', label: text.filter.all },
                { value: 'on', label: text.filter.on, count: activeCount },
                { value: 'off', label: text.filter.off, count: all.length - activeCount },
              ],
              onChange: setFilter,
            }),
            h('span', { className: 'sw-stats' }, text.stats(all.length, activeCount))),

          content),

        drawer,

        confirm ? h(Dialog, {
          title: text.confirmTitle[confirm.kind],
          body: text.confirmBody[confirm.kind](confirm.label),
          onClose: function () { if (!saving) setConfirm(null) },
          footer: [
            h(Button, { key: 'no', disabled: saving, onClick: function () { setConfirm(null) } }, text.cancel),
            h(Button, { key: 'yes', variant: 'danger', disabled: saving, onClick: remove }, saving ? text.saving : text.remove),
          ],
        }) : null,

        h(Toast, { toast: toast, closeLabel: text.close, onClose: function () { setToast(null) } }))
    }

    /* ── styles: host tokens only; literal colors appear only in the switch thumb ───────────────────────── */

    var FOCUS = 'outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px;'

    var CSS = [
      // page frame — mirrors the host Plugins page
      '.sw-page{box-sizing:border-box;height:100%;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:20px;padding:0 clamp(24px,4vw,48px) 64px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);}',
      '.sw-page>*{width:100%;max-width:960px;}',
      '.sw-page *{box-sizing:border-box;}',
      '.sw-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:16px;padding-top:28px;}',
      '[data-platform=darwin] .sw-head{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px));}',
      '.sw-heading{min-width:0;}',
      '.sw-title{margin:0;font-size:20px;font-weight:500;line-height:28px;}',
      '.sw-intro{margin:4px 0 0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);}',
      '.sw-toolbar{display:flex;align-items:center;gap:8px;flex:none;}',
      '.sw-body{display:flex;flex-direction:column;gap:16px;}',
      '.sw-grow{flex:1;}',
      '.sw-mono{font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);}',

      // tabs — mirrors Settings › Plugins
      '.sw-tabs{display:flex;align-items:flex-end;gap:22px;border-bottom:.5px solid var(--dsw-alias-border-l2);}',
      '.sw-tab{position:relative;display:inline-flex;align-items:center;gap:6px;padding:7px 1px 9px;border:0;background:none;font:inherit;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary);cursor:pointer;}',
      '.sw-tab:hover,.sw-tab[data-active=true]{color:var(--dsw-alias-label-primary);}',
      '.sw-tab[data-active=true]:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;border-radius:2px 2px 0 0;background:var(--dsw-alias-label-primary);}',
      '.sw-tab:focus-visible{' + FOCUS + 'border-radius:2px;}',
      '.sw-tab-count{min-width:18px;height:16px;padding:0 5px;border-radius:8px;font-size:11px;line-height:16px;text-align:center;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-fill-l1,var(--dsw-alias-bg-layer-2));}',
      '.sw-tab[data-active=true] .sw-tab-count{color:var(--dsw-alias-label-secondary);}',

      // filters row
      '.sw-filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}',
      '.sw-search{position:relative;flex:1 1 240px;max-width:360px;display:flex;align-items:center;}',
      '.sw-search-icon{position:absolute;left:10px;color:var(--dsw-alias-label-tertiary);pointer-events:none;}',
      '.sw-search-input{width:100%;height:32px;padding:0 30px 0 32px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;}',
      '.sw-search-input::placeholder{color:var(--dsw-alias-label-dimmed,var(--dsw-alias-label-tertiary));}',
      '.sw-search-input:focus{outline:none;border-color:var(--dsw-alias-state-business-primary);}',
      '.sw-search-input::-webkit-search-cancel-button{display:none;}',
      '.sw-kbd{position:absolute;right:8px;min-width:18px;height:18px;padding:0 4px;border:.5px solid var(--dsw-alias-border-l3);border-radius:4px;font:inherit;font-size:11px;line-height:17px;text-align:center;color:var(--dsw-alias-label-tertiary);pointer-events:none;}',
      '.sw-search-input:focus~.sw-kbd,.sw-search-input:not(:placeholder-shown)~.sw-kbd{display:none;}',
      '.sw-stats{margin-left:auto;font-size:12px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;}',

      // segmented control
      '.sw-seg{display:inline-flex;padding:2px;gap:2px;border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-fill-l1,var(--dsw-alias-bg-layer-2));}',
      '.sw-seg-item{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 10px;border:0;border-radius:calc(var(--dsw-radius-md,8px) - 2px);background:none;font:inherit;font-size:12px;color:var(--dsw-alias-label-secondary);cursor:pointer;}',
      '.sw-seg-item:hover:not(:disabled){color:var(--dsw-alias-label-primary);}',
      '.sw-seg-item.is-active{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-elevation-soft,0 1px 2px rgba(0,0,0,.08));}',
      '.sw-seg-item:focus-visible{' + FOCUS + '}',
      '.sw-seg-count{font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;}',

      // buttons
      '.sw-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 12px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1;white-space:nowrap;cursor:pointer;}',
      '.sw-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);}',
      '.sw-btn:focus-visible{' + FOCUS + '}',
      '.sw-btn:disabled{opacity:.5;cursor:default;}',
      '.sw-btn-primary{border-color:transparent;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-label-primary-inverted,var(--dsw-alias-bg-base));}',
      '.sw-btn-primary:hover:not(:disabled){background:var(--dsw-alias-label-primary);opacity:.86;}',
      '.sw-btn-danger{border-color:transparent;background:var(--dsw-alias-state-error-primary);color:#fff;}',
      '.sw-btn-danger:hover:not(:disabled){background:var(--dsw-alias-state-error-primary);opacity:.86;}',
      '.sw-btn-danger-ghost{border-color:transparent;background:none;color:var(--dsw-alias-state-error-primary);padding:0 8px;}',
      '.sw-btn-danger-ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger,var(--dsw-alias-interactive-bg-hover));}',
      '.sw-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:var(--dsw-radius-md,8px);background:none;color:var(--dsw-alias-label-secondary);cursor:pointer;}',
      '.sw-icon-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}',
      '.sw-icon-btn-danger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger,var(--dsw-alias-interactive-bg-hover));color:var(--dsw-alias-state-error-primary);}',
      '.sw-icon-btn:focus-visible{' + FOCUS + 'outline-offset:1px;}',
      '.sw-icon-btn:disabled{opacity:.4;cursor:default;}',
      '.sw-toolbar .sw-icon-btn{width:32px;height:32px;}',

      // switch
      '.sw-switch{position:relative;flex:none;width:30px;height:18px;padding:0;border:0;border-radius:9px;background:var(--dsw-alias-fill-l2,var(--dsw-alias-border-l2));cursor:pointer;transition:background .15s ease;}',
      '.sw-switch[aria-checked=true]{background:var(--dsw-alias-state-business-primary);}',
      '.sw-switch-thumb{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.24);transition:transform .15s ease;}',
      '.sw-switch[aria-checked=true] .sw-switch-thumb{transform:translateX(12px);}',
      '.sw-switch:focus-visible{' + FOCUS + '}',
      '.sw-switch:disabled{cursor:default;opacity:.45;}',
      '.sw-switch[data-pending=true]{opacity:.7;}',
      '.sw-switch[data-pending=true] .sw-switch-thumb{animation:sw-pulse 1s ease-in-out infinite;}',
      '@keyframes sw-pulse{50%{opacity:.4;}}',

      // tags
      '.sw-tag{display:inline-flex;align-items:center;gap:3px;height:18px;padding:0 6px;border-radius:var(--dsw-radius-xs,4px);font-size:11px;line-height:1;white-space:nowrap;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-fill-l1,var(--dsw-alias-bg-layer-2));}',
      '.sw-tag-quiet{background:none;border:.5px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-tertiary);}',
      '.sw-tag-warn{color:var(--dsw-alias-state-warn-label,var(--dsw-alias-state-warn-primary));background:var(--dsw-alias-state-warn-tertiary,var(--dsw-alias-bg-layer-2));}',
      '.sw-tag-ok{color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-state-success-secondary,var(--dsw-alias-bg-layer-2));}',
      '.sw-tag-error{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-state-error-secondary,var(--dsw-alias-bg-layer-2));}',

      // groups & rows — mirrors the Plugins page cards
      '.sw-groups{display:flex;flex-direction:column;gap:24px;}',
      '.sw-group{display:flex;flex-direction:column;gap:6px;}',
      '.sw-group-head{display:flex;align-items:center;gap:8px;}',
      '.sw-group-title{margin:0;font-size:14px;font-weight:500;line-height:22px;}',
      '.sw-group-count{font-size:12px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;}',
      '.sw-group-hint{margin:-4px 0 2px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);}',
      '.sw-rows{display:flex;flex-direction:column;gap:2px;margin:0 -8px;padding:0;list-style:none;}',
      '.sw-row{position:relative;display:flex;align-items:center;gap:14px;min-width:0;padding:8px;border-radius:var(--dsw-radius-xl,12px);}',
      '.sw-row:hover{background:var(--dsw-alias-interactive-bg-hover);}',
      '.sw-row-open{position:absolute;inset:0;z-index:0;width:100%;padding:0;border:0;border-radius:inherit;background:none;cursor:pointer;}',
      '.sw-row-open:focus-visible{' + FOCUS + '}',
      '.sw-row-icon{position:relative;z-index:0;flex:none;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg,10px);color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);pointer-events:none;}',
      '.sw-row-main{position:relative;z-index:0;flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;pointer-events:none;}',
      '.sw-row-title{display:flex;align-items:center;flex-wrap:wrap;gap:6px;min-width:0;}',
      '.sw-row-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:500;line-height:20px;}',
      '.sw-row-name.sw-mono{font-size:13px;}',
      '.sw-row-desc{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary);}',
      '.sw-row-desc.sw-mono{font-size:12px;}',
      '.sw-row-end{position:relative;z-index:1;flex:none;display:flex;align-items:center;gap:10px;}',
      '.sw-row-actions{display:flex;align-items:center;gap:2px;opacity:0;transition:opacity .12s ease;}',
      '.sw-row:hover .sw-row-actions,.sw-row:focus-within .sw-row-actions{opacity:1;}',
      '@media (hover:none){.sw-row-actions{opacity:1;}}',
      '.sw-row.is-muted .sw-row-name{color:var(--dsw-alias-label-secondary);}',
      '.sw-row.is-muted .sw-row-icon{color:var(--dsw-alias-label-tertiary);}',
      '.sw-row[data-pending=true]{opacity:.75;}',

      // skeleton, empty, failure
      '.sw-row-skeleton:hover{background:none;}',
      '.sw-skel{display:block;border-radius:var(--dsw-radius-xs,4px);background:var(--dsw-alias-bg-skeleton,var(--dsw-alias-bg-layer-2));animation:sw-skel 2s cubic-bezier(.36,0,.64,1) infinite;}',
      '.sw-row-icon.sw-skel{border-color:transparent;}',
      '.sw-skel-title{width:min(160px,50%);height:12px;margin:4px 0;}',
      '.sw-skel-desc{width:min(320px,80%);height:10px;margin:4px 0;}',
      '@keyframes sw-skel{0%{opacity:1}40%{opacity:.55}80%,to{opacity:1}}',
      '@media (prefers-reduced-motion:reduce){.sw-skel,.sw-switch[data-pending=true] .sw-switch-thumb{animation:none;}.sw-switch-thumb,.sw-drawer,.sw-layer{transition:none;animation:none;}}',
      '.sw-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:40px 28px;text-align:center;border:.5px dashed var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-xl,12px);}',
      '.sw-empty-icon{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;margin-bottom:2px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg,10px);color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-1);}',
      '.sw-empty-title{margin:0;font-size:14px;font-weight:500;line-height:22px;color:var(--dsw-alias-label-primary);}',
      '.sw-empty-text{max-width:440px;margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);}',
      '.sw-empty-action{margin-top:6px;}',
      '.sw-failure{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--dsw-alias-state-error-primary);}',
      '.sw-banner{display:flex;align-items:flex-start;gap:8px;padding:9px 12px;border-radius:var(--dsw-radius-md,8px);font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-fill-l1,var(--dsw-alias-bg-layer-2));}',
      '.sw-banner svg{flex:none;margin-top:1px;}',
      '.sw-banner-warn{color:var(--dsw-alias-state-warn-label,var(--dsw-alias-state-warn-primary));background:var(--dsw-alias-state-warn-tertiary,var(--dsw-alias-bg-layer-2));}',

      // overlay layers
      '.sw-layer{position:fixed;inset:0;z-index:80;display:flex;justify-content:flex-end;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.36));animation:sw-fade .14s ease-out;overscroll-behavior:contain;}',
      '.sw-layer-center{justify-content:center;align-items:center;padding:24px;}',
      '@keyframes sw-fade{from{opacity:0}}',
      '@keyframes sw-slide{from{transform:translateX(24px);opacity:.4}}',
      '@keyframes sw-pop{from{transform:scale(.97);opacity:0}}',

      // drawer
      '.sw-drawer{display:flex;flex-direction:column;width:min(600px,100vw);height:100%;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1));border-left:.5px solid var(--dsw-alias-border-l2);box-shadow:var(--dsw-elevation-panel,var(--dsw-shadow-lv3,0 12px 40px rgba(0,0,0,.24)));animation:sw-slide .18s cubic-bezier(.2,.8,.2,1);}',
      '.sw-drawer-head{display:flex;align-items:center;gap:12px;padding:18px 20px 14px;}',
      '.sw-drawer-icon{flex:none;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg,10px);color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);}',
      '.sw-drawer-heading{flex:1;min-width:0;}',
      '.sw-drawer-title{margin:0;font-size:16px;font-weight:500;line-height:24px;}',
      '.sw-drawer-sub{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);font-family:var(--dsw-font-mono,ui-monospace,monospace);}',
      '.sw-drawer-note{margin:4px 0 0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);}',
      '.sw-drawer>.sw-banner{margin:0 20px 4px;}',
      '.sw-drawer-body{flex:1;overflow:auto;display:flex;flex-direction:column;gap:18px;padding:12px 20px 24px;overscroll-behavior:contain;}',
      '.sw-drawer-foot{display:flex;align-items:center;gap:8px;padding:12px 20px;border-top:.5px solid var(--dsw-alias-border-l2);}',
      '.sw-drawer-hint{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary);}',
      '.sw-drawer-foot .sw-grow{flex:1;}',

      // dialog
      '.sw-dialog{width:min(420px,100vw - 32px);padding:20px;border-radius:var(--dsw-radius-panel,14px);background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1));border:.5px solid var(--dsw-alias-border-l2);box-shadow:var(--dsw-elevation-prominent,var(--dsw-shadow-lv3,0 18px 48px rgba(0,0,0,.28)));animation:sw-pop .14s ease-out;}',
      '.sw-dialog-title{margin:0;font-size:16px;font-weight:500;line-height:24px;}',
      '.sw-dialog-body{margin:8px 0 20px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
      '.sw-dialog-foot{display:flex;justify-content:flex-end;gap:8px;}',

      // form
      '.sw-field{display:flex;flex-direction:column;gap:6px;min-width:0;}',
      '.sw-field-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;}',
      '.sw-field-label{font-size:13px;font-weight:500;line-height:20px;color:var(--dsw-alias-label-primary);}',
      '.sw-field-aside{font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;}',
      '.sw-field-hint,.sw-field-error{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);}',
      '.sw-field-error{color:var(--dsw-alias-state-error-primary);}',
      '.sw-input{width:100%;height:32px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:22px;}',
      '.sw-input.sw-mono{font-size:13px;}',
      '.sw-input::placeholder{color:var(--dsw-alias-label-dimmed,var(--dsw-alias-label-tertiary));}',
      '.sw-input:focus{outline:none;border-color:var(--dsw-alias-state-business-primary);}',
      '.sw-input.is-invalid{border-color:var(--dsw-alias-state-error-primary);}',
      '.sw-input[readonly]{background:var(--dsw-alias-fill-l1,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-secondary);}',
      '.sw-textarea{height:auto;min-height:96px;padding:8px 10px;resize:vertical;line-height:1.6;}',
      '.sw-textarea.sw-mono{font-size:12.5px;}',
      '.sw-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:12px;}',
      '@media (max-width:560px){.sw-grid{grid-template-columns:1fr;}}',
      '.sw-settings{display:flex;flex-direction:column;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg,10px);}',
      '.sw-setting{display:flex;align-items:center;gap:16px;padding:10px 12px;}',
      '.sw-setting+.sw-setting{border-top:.5px solid var(--dsw-alias-border-l2);}',
      '.sw-setting-text{flex:1;min-width:0;}',
      '.sw-setting-label{font-size:13px;line-height:20px;}',
      '.sw-setting-hint{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);}',
      '.sw-meta-line{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-tertiary);}',
      '.sw-meta-line code{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:2px 6px;border-radius:4px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-fill-l1,var(--dsw-alias-bg-layer-2));}',

      // toast
      '.sw-toast{position:fixed;left:50%;bottom:28px;z-index:90;display:flex;align-items:center;gap:8px;max-width:min(560px,100vw - 48px);min-height:36px;padding:6px 8px 6px 12px;transform:translateX(-50%);border-radius:var(--dsw-radius-lg,10px);font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1));border:.5px solid var(--dsw-alias-border-l2);box-shadow:var(--dsw-elevation-prominent,var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.2)));animation:sw-pop .14s ease-out;}',
      '.sw-toast>span{overflow-wrap:anywhere;padding-right:4px;}',
      '.sw-toast-ok>svg{color:var(--dsw-alias-state-success-primary);flex:none;}',
      '.sw-toast-error>svg:first-child{color:var(--dsw-alias-state-error-primary);flex:none;}',
    ].join('\n')

    function StyleSheet() {
      return h('style', { 'data-switch': '' }, CSS)
    }

    /* ── sidebar entry ────────────────────────────────────────────────────────────────────────────────────── */

    function SidebarEntry(props) {
      var size = props.size || 18
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.7, strokeLinecap: 'round', 'aria-hidden': 'true',
      },
        h('path', { d: 'M4 8h16' }),
        h('path', { d: 'M4 16h16' }),
        h('circle', { cx: 9, cy: 8, r: 2.6, fill: props.active ? 'currentColor' : 'var(--dsw-alias-bg-base,#fff)' }),
        h('circle', { cx: 15, cy: 16, r: 2.6, fill: props.active ? 'currentColor' : 'var(--dsw-alias-bg-base,#fff)' }))
    }

    /* ── plugin ───────────────────────────────────────────────────────────────────────────────────────────── */

    function apply(ctx) {
      ctx.effect(function () {
        return ctx.locale.register(LOCALE_NS, { zh: {}, en: {} })
      }, 'dsh-switch: dictionaries')

      function BoundPanel(props) {
        return h(Panel, Object.assign({}, props, { ctx: ctx }))
      }

      ctx.slots.inject('main', function* () {
        yield ctx.slots.register({ name: 'main', key: PANEL_ID, locale: LOCALE_NS }, BoundPanel)
      })

      ctx.slots.inject('sidebar.panellist', function () {
        return ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 7,
          label: function () { return stringsFor(activeLocale(ctx)).title },
          locale: LOCALE_NS,
        }, SidebarEntry)
      })
    }

    return {
      name: '@local/dsh-switch',
      inject: ['slots', 'locale'],
      apply: apply,
    }
  },
})
