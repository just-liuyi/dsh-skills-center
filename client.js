/*! @local/dsh-skills-center 1.9.5 client half: the 技能中心 sidebar entry and the management panel. */
window.__ModuleLoader__.load({
  id: '@local/dsh-skills-center',
  factory: (require) => {
    'use strict'

    var React = require('react')
    var h = React.createElement

    var PANEL_ID = 'dsh-skills-center'
    var LOCALE_NS = 'dshSkillsCenter'
    var API = '/dsh-skills-center/rpc'
    var SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    var SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/
    /** Local skill creation stays on disk. The Skills toolbar adds online sources. */
    var CREATABLE = { skills: false, mcp: true, prompts: true, tools: false, components: false }

    /* ── text ──────────────────────────────────────────────────────────────────────────────────────────────── */

    var STR = {
      zh: {
        title: '能力中心',
        intro: '统一管理 Skill、MCP 服务器、提示词、工具与组件更新，改动即时生效。',
        tabs: { skills: 'Skill', mcp: 'MCP', prompts: '提示词', tools: 'Tools', components: '组件' },
        search: '搜索',
        searchHint: '按 / 聚焦搜索',
        refresh: '刷新',
        add: { skills: '新建 Skill', mcp: '新建 MCP 服务器', prompts: '新建提示词' },
        addHint: { skills: '新建 Skill（N）', mcp: '新建 MCP 服务器（N）', prompts: '新建提示词（N）' },
        filter: { all: '全部', on: '已启用', off: '已停用' },
        groups: {
          skillsMine: '我的 Skill', skillsProject: '当前项目', skillsOther: '内置与插件',
          mcpManaged: '由技能中心管理', mcpExternal: '其他插件',
          prompts: '注入段落', tools: '系统工具',
        },
        groupHint: {
          skillsMine: '位于 ~/.dsh/skills 或 ~/.agents/skills，可编辑、启停与删除。',
          skillsProject: '来自工作区的 .dsh/skills 或 .agents/skills，仅在此展示。',
          skillsOther: '由内置包或其他插件提供，仅在此展示。',
          mcpManaged: '作为独立条目挂载，工具名为 mcp__<服务器名>__<工具名>。',
          mcpExternal: '其他插件已启用的服务器，只能在此启停。',
          prompts: '每条启用的提示词作为独立段落，位于工具说明之后、结构化输出之前。', tools: '内置包和插件提供的工具，仅供查看。',
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
        emptyTitle: { skills: '暂无 Skill', mcp: '还没有 MCP 服务器', prompts: '还没有提示词', tools: '暂无工具' },
        empty: {
          skills: '项目与内置 Skill 会自动出现在这里；自己的 Skill 放在 ~/.dsh/skills 或 ~/.agents/skills，面板里可以查看、启停和编辑。',
          mcp: '添加后，它的工具会直接出现在模型的工具列表里。点右上角「新建 MCP 服务器」，或按 N。',
          prompts: '它会随每次请求注入系统提示词。点右上角「新建提示词」，或按 N 新建一条。', tools: '系统工具由内置包和插件提供，这里仅展示。',
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
        online: {
          local: '本地安装', remote: '在线安装', scope: '安装来源', add: '添加技能', addHint: '添加技能（N）',
          searchMode: '搜索技能', linkMode: '从链接添加', searchLabel: '搜索 skills.sh', searchPlaceholder: '例如 Cloudflare、React、代码审查',
          searchNote: '从 skills.sh 搜索并直接添加技能，新增默认停用，回到列表后手动开启。', searchSubmit: '搜索', searching: '正在搜索 skills.sh…',
          searchStart: '搜索你需要的技能', searchStartHint: '输入产品、框架或任务关键词，按 Enter 或点击搜索。',
          searchEmpty: '没有找到相关技能', searchEmptyHint: '换一个关键词，或切换到「从链接添加」。', searchError: '搜索未完成，请检查网络后重试。',
          results: function (n) { return n + ' 个搜索结果' }, installs: function (n) { return n.toLocaleString('zh-CN') + ' 次安装' },
          resultPreview: '添加', resultInstalled: '已添加', unsupportedResult: '暂不支持此来源',
          adding: '正在添加技能…', addedDisabled: '已添加，默认停用，请在列表开启。', alreadyAdded: '已添加，现有启停状态保持不变。', returnToList: '回到技能列表',
          backSearch: '返回搜索结果', backLink: '更换链接', previewFilter: '筛选此来源的技能', visibleSelect: '全选当前结果',
          noPreviewMatches: '没有匹配的技能', clearPreviewFilter: '清除筛选', selectedHint: '新增技能默认停用，添加后请在列表手动开启；已存在技能的状态不变。',
          linkNote: '粘贴 GitHub 或 skills.sh 链接，先预览再安装。', previewTitle: '确认技能', previewCount: function (n) { return '已解析 ' + n + ' 个技能' },
          installedPreviewHint: '已安装的技能可在此更新；安装按钮只处理勾选的未安装技能。',
          localEmpty: '点击右上角「添加技能」，搜索 skills.sh 或粘贴技能链接。自己的技能也可以放入用户技能目录。',
          searchRequired: '先输入搜索关键词。', previewFailed: '未能读取技能，请重试或更换链接。',
          note: '按在线来源管理 Skill；安装后保存在本地，可独立启停和更新。',
          emptyTitle: '还没有在线来源', empty: '点击右上角「添加技能」，搜索 skills.sh 或从 GitHub、skills.sh 链接选择安装。',
          url: '技能或仓库链接', urlHint: '支持 GitHub、skills.sh 技能详情链接，以及 owner/repo 简写。',
          urlError: '请输入 GitHub、skills.sh 技能详情链接或 owner/repo。', preview: '预览技能', previewing: '正在读取技能…',
          previewNote: '选择要安装的 Skill。默认安装到用户范围，当前项目技能仍只读。',
          available: '未安装', installed: '已安装', conflict: '本地已存在', modified: '本地已修改', updateAvailable: '有更新',
          install: '安装', installSelected: '添加所选', installing: '正在添加所选技能…', installedDone: '技能已添加，新增默认停用，请在列表开启。',
          selected: function (n) { return '已选择 ' + n + ' 项' }, selectAll: '选择可安装项', clearSelection: '清空选择',
          associate: '关联内容一致的本地技能', associateHint: '明确允许为已有技能建立来源关联；内容有差异时会拒绝，不会覆盖。',
          conflictHint: '已有同名技能。仅内容一致时可勾选上方的关联选项后添加。',
          noSkills: '这个来源没有可展示的 Skill。', noneSelected: '选择至少一个技能后安装。',
          refresh: '刷新来源', refreshing: '正在刷新来源…', refreshed: '来源列表已刷新，已安装内容未更新',
          update: '更新', updating: '正在更新技能…', updated: '技能已更新', uninstall: '卸载',
          uninstallTitle: '卸载在线 Skill', uninstallBody: function (n) { return '将卸载「' + n + '」的本地内容，仍可从来源重新安装。' },
          removeSource: '删除来源', removeSourceTitle: '删除在线来源',
          removeSourceBody: function (label, count) { return '将删除来源「' + label + '」及其下 ' + count + ' 个技能，此操作不可撤销。' },
          partialHint: '按需导入：当前仅管理已解析的技能，可搜索或通过仓库链接添加其他技能。',
          expandAll: '全部展开', collapseAll: '全部折叠', expandSource: '展开来源', collapseSource: '折叠来源',
          summary: function (installed, total, on) { return '已管理 ' + installed + ' 项 · 已启用 ' + on },
          source: '来源', openSource: '打开 GitHub 来源', version: '版本', managedNote: '此技能由在线来源管理。内容仅供查看，启停和更新请在列表中操作。',
          busy: '任务进行中，请等待完成后关闭。', inspect: '查看并选择安装', notChecked: '尚未检查更新', upstreamRemoved: '上游已移除',
        },
        components: {
          hint: '检查本机通过 npm 安装的组件在 registry 上的最新版本，并可一键更新。git、本地链接等来源没有可比对的版本。',
          check: '检查更新', checking: '正在检查…', updateAll: '全部更新', update: '更新', updating: '更新中…',
          installed: '已安装', latest: '最新', upToDate: '已是最新', available: '可更新', failed: '检查失败', prerelease: '预发布', disabled: '已停用',
          neverChecked: '尚未检查', lastChecked: '上次检查', empty: '没有通过 npm 安装的组件。', allCurrent: '所有 npm 组件都是最新版本。',
          skippedTitle: '不支持自动更新的组件', skippedHint: '这些组件不是从 npm 安装的，无法按版本号比较：',
          reasonGit: 'git 来源', reasonLink: '本地链接', reasonFile: '本地文件', reasonUrl: '网址/压缩包', reasonAlias: 'npm 别名', reasonOther: '来源未知',
          updated: '已更新，重启 DeepSeek Harness 后加载新代码。', updatedOff: '已更新；该组件原本停用，仍保持停用。',
          unsupported: '当前环境没有插件管理器，无法检查和更新组件。',
          footer: '更新由宿主插件管理器执行：安装目标版本并保持原有启用状态，失败时恢复原版本。替换过的插件需要重启 DeepSeek Harness 才会加载新代码。',
        },
        busyWrite: '上一次修改还在保存，请稍后再试。',
        reloadHint: '宿主会重新加载该服务器，现有连接可能短暂中断。',
        unsupported: {
          mcp: '当前环境没有配置编辑器，MCP 只能查看。',
          prompts: '当前环境没有系统提示词服务，提示词只会保存、不会注入。',
          skills: '当前配置没有 Skill 服务。', tools: '当前环境没有工具目录。',
        },
      },
      en: {
        title: 'Capability Center',
        intro: 'Manage skills, MCP servers, prompts, tools and component updates in one place. Changes apply immediately.',
        tabs: { skills: 'Skills', mcp: 'MCP', prompts: 'Prompts', tools: 'Tools', components: 'Components' },
        search: 'Search',
        searchHint: 'Press / to search',
        refresh: 'Refresh',
        add: { skills: 'New skill', mcp: 'New MCP server', prompts: 'New prompt' },
        addHint: { skills: 'New skill (N)', mcp: 'New MCP server (N)', prompts: 'New prompt (N)' },
        filter: { all: 'All', on: 'Enabled', off: 'Disabled' },
        groups: {
          skillsMine: 'My skills', skillsProject: 'This project', skillsOther: 'Bundled and plugins',
          mcpManaged: 'Managed by Skills Center', mcpExternal: 'Other plugins',
          prompts: 'Injected sections', tools: 'System tools',
        },
        groupHint: {
          skillsMine: 'Under ~/.dsh/skills or ~/.agents/skills: editable, switchable and deletable.',
          skillsProject: 'From the workspace .dsh/skills or .agents/skills; shown here only.',
          skillsOther: 'Provided by bundled packages or other plugins; shown here only.',
          mcpManaged: 'Mounted as their own entries; tools appear as mcp__<server>__<tool>.',
          mcpExternal: 'Servers other plugins enabled; only their switch is available here.',
          prompts: 'Each enabled prompt is its own section, after tool guidance and before structured output.', tools: 'Read-only tools provided by built-in packages and plugins.',
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
        emptyTitle: { skills: 'No skills here', mcp: 'No MCP servers yet', prompts: 'No prompts yet', tools: 'No tools available' },
        empty: {
          skills: 'Project and bundled skills appear here automatically; your own live in ~/.dsh/skills or ~/.agents/skills, where this panel can view, toggle and edit them.',
          mcp: 'Its tools appear directly in the model\'s tool list. Use “New MCP server” in the top-right corner, or press N.',
          prompts: 'It is injected into every request\'s system prompt. Use “New prompt” in the top-right corner, or press N.', tools: 'System tools are shown here read-only.',
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
        online: {
          local: 'Local installs', remote: 'Online installs', scope: 'Installation source', add: 'Add skill', addHint: 'Add skill (N)',
          searchMode: 'Search skills', linkMode: 'Add from link', searchLabel: 'Search skills.sh', searchPlaceholder: 'For example Cloudflare, React, code review',
          searchNote: 'Search skills.sh and add skills directly. New skills stay disabled until you enable them in the list.', searchSubmit: 'Search', searching: 'Searching skills.sh…',
          searchStart: 'Find a skill for your task', searchStartHint: 'Enter a product, framework or task, then press Enter or Search.',
          searchEmpty: 'No matching skills', searchEmptyHint: 'Try another keyword, or switch to “Add from link”.', searchError: 'Search failed. Check your connection and try again.',
          results: function (n) { return n + ' search results' }, installs: function (n) { return n.toLocaleString('en-US') + ' installs' },
          resultPreview: 'Add', resultInstalled: 'Added', unsupportedResult: 'Source not supported yet',
          adding: 'Adding skill…', addedDisabled: 'Added and disabled by default. Enable it in the skill list.', alreadyAdded: 'Already added. Its enabled state is unchanged.', returnToList: 'Back to skill list',
          backSearch: 'Back to results', backLink: 'Change link', previewFilter: 'Filter skills in this source', visibleSelect: 'Select visible',
          noPreviewMatches: 'No matching skills', clearPreviewFilter: 'Clear filter', selectedHint: 'New skills stay disabled until you enable them in the list. Existing skills keep their enabled state.',
          linkNote: 'Paste a GitHub or skills.sh link, then review before installing.', previewTitle: 'Review skills', previewCount: function (n) { return n + ' skills ready to review' },
          installedPreviewHint: 'Installed skills can be updated here. Install only handles selected, uninstalled skills.',
          localEmpty: 'Use “Add skill” in the top-right to search skills.sh or paste a link. You can also author skills in your user skill directory.',
          searchRequired: 'Enter a search keyword first.', previewFailed: 'Could not read this skill. Retry or use another link.',
          note: 'Manage skills by online source. Installed skills are stored locally and can be toggled or updated individually.',
          emptyTitle: 'No online sources yet', empty: 'Use “Add skill” in the top-right to search skills.sh or install from a GitHub or skills.sh link.',
          url: 'Skill or repository link', urlHint: 'Accepts GitHub and skills.sh skill links, as well as owner/repo shorthand.',
          urlError: 'Enter a GitHub or skills.sh skill link, or owner/repo.', preview: 'Preview skills', previewing: 'Reading skills…',
          previewNote: 'Choose skills to install for your user. Project skills remain read-only.',
          available: 'Not installed', installed: 'Installed', conflict: 'Already exists locally', modified: 'Locally modified', updateAvailable: 'Update available',
          install: 'Install', installSelected: 'Add selected', installing: 'Adding selected skills…', installedDone: 'Skills added. New skills stay disabled until you enable them in the list.',
          selected: function (n) { return n + ' selected' }, selectAll: 'Select installable', clearSelection: 'Clear selection',
          associate: 'Associate identical local skills', associateHint: 'Explicitly allow linking existing skills to this source. Different content is rejected and never overwritten.',
          conflictHint: 'A skill with this name exists. Enable association above only if its content is identical.',
          noSkills: 'No skills are available in this source.', noneSelected: 'Select at least one skill to install.',
          refresh: 'Refresh source', refreshing: 'Refreshing source…', refreshed: 'Source list refreshed; installed content was not updated',
          update: 'Update', updating: 'Updating skill…', updated: 'Skill updated', uninstall: 'Uninstall',
          uninstallTitle: 'Uninstall online skill', uninstallBody: function (n) { return 'The local content of “' + n + '” will be uninstalled. You can install it again from its source.' },
          removeSource: 'Delete source', removeSourceTitle: 'Delete online source',
          removeSourceBody: function (label, count) { return '“' + label + '” and its ' + count + ' skills will be deleted. This cannot be undone.' },
          partialHint: 'Imported on demand: only resolved skills are managed here. Search or use the repository link to add other skills.',
          expandAll: 'Expand all', collapseAll: 'Collapse all', expandSource: 'Expand source', collapseSource: 'Collapse source',
          summary: function (installed, total, on) { return installed + ' managed · ' + on + ' enabled' },
          source: 'Source', openSource: 'Open GitHub source', version: 'Version', managedNote: 'This skill is managed by an online source. View its content here; use the list to toggle or update it.',
          busy: 'A task is running. Wait for it to finish before closing.', inspect: 'View and choose skills', notChecked: 'Updates not checked yet', upstreamRemoved: 'Removed upstream',
        },
        components: {
          hint: 'Check every component installed from npm against its newest registry release and update it in one click. Git, local links and other sources have no comparable version.',
          check: 'Check for updates', checking: 'Checking…', updateAll: 'Update all', update: 'Update', updating: 'Updating…',
          installed: 'Installed', latest: 'Latest', upToDate: 'Up to date', available: 'Update available', failed: 'Check failed', prerelease: 'Prerelease', disabled: 'Disabled',
          neverChecked: 'Never checked', lastChecked: 'Last checked', empty: 'No component was installed from npm.', allCurrent: 'Every npm component is up to date.',
          skippedTitle: 'Components without automatic updates', skippedHint: 'These were not installed from npm, so there is no version to compare:',
          reasonGit: 'git source', reasonLink: 'local link', reasonFile: 'local file', reasonUrl: 'URL / tarball', reasonAlias: 'npm alias', reasonOther: 'unknown source',
          updated: 'Updated. The new code loads after DeepSeek Harness restarts.', updatedOff: 'Updated. The component was disabled and stays disabled.',
          unsupported: 'This app has no plugin manager, so components cannot be checked or updated.',
          footer: 'The host plugin manager performs the update: it installs the target version with its previous on/off state and restores the old one on failure. A replaced plugin loads its new code after DeepSeek Harness restarts.',
        },
        busyWrite: 'The previous change is still saving; try again in a moment.',
        reloadHint: 'The host reloads this server; existing connections may drop briefly.',
        unsupported: {
          mcp: 'No configuration editor is available here, so MCP servers are view-only.',
          prompts: 'No system-prompt service here; prompts are stored but not injected.',
          skills: 'This configuration has no skill service.', tools: 'No tool catalog is available here.',
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

    async function call(action, payload, signal) {
      var response = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: action, payload: payload || {} }),
        signal: signal,
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
      down: ['M4 6l4 4 4-4'],
      right: ['M6 4l4 4-4 4'],
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
        'aria-label': props.ariaLabel,
        onChange: function (event) { props.onChange(event.target.value) },
        onKeyDown: props.onKeyDown,
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

    function useFocusTrap(active, rootRef) {
      React.useEffect(function () {
        if (!active || !rootRef.current) return undefined
        var root = rootRef.current
        var previous = document.activeElement
        function controls() {
          return Array.prototype.slice.call(root.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex="0"]'))
            .filter(function (element) { return element.getClientRects().length > 0 })
        }
        var first = root.querySelector('input:not([disabled]),textarea:not([disabled])') || controls()[0]
        if (first) first.focus()
        function onKey(event) {
          if (event.key !== 'Tab') return
          var items = controls()
          if (!items.length) { event.preventDefault(); root.focus(); return }
          var current = document.activeElement
          var edge = event.shiftKey ? items[0] : items[items.length - 1]
          if (current === edge || !root.contains(current)) {
            event.preventDefault()
            items[event.shiftKey ? items.length - 1 : 0].focus()
          }
        }
        document.addEventListener('keydown', onKey, true)
        return function () {
          document.removeEventListener('keydown', onKey, true)
          if (previous && previous.isConnected && typeof previous.focus === 'function') previous.focus()
        }
      }, [active])
    }

    function Drawer(props) {
      var rootRef = React.useRef(null)
      useFocusTrap(!props.focusBlocked, rootRef)
      // While a confirmation sits on top, ESC belongs to it.
      useEscape(!props.blocked && !props.closeDisabled, props.onClose)
      var bodyRef = React.useRef(null)
      // Backdrop clicks deliberately do not dismiss a working panel.
      return h('div', { className: 'sw-layer sw-drawer-layer' },
        h('aside', {
          className: 'sw-drawer' + (props.className ? ' ' + props.className : ''), ref: rootRef, tabIndex: -1,
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
            h(Button, { className: 'sw-drawer-dismiss', icon: 'close', disabled: props.closeDisabled || props.blocked,
              title: props.closeLabel + ': ' + props.title, onClick: props.onClose }, props.closeLabel),
            h('div', { className: 'sw-drawer-heading' },
              h('h2', { className: 'sw-drawer-title' }, props.title),
              props.subtitle ? h('p', { className: 'sw-drawer-sub' }, props.subtitle) : null,
              props.note ? h('p', { className: 'sw-drawer-note' }, props.note) : null)),
          props.banner,
          h('div', { className: 'sw-drawer-body', ref: bodyRef }, props.children),
          props.footer && props.footer.length
            ? h('footer', { className: 'sw-drawer-foot' },
              h('span', { className: 'sw-drawer-hint' }, props.footHint || ''),
              props.footer)
            : null))
    }

    function Dialog(props) {
      var rootRef = React.useRef(null)
      useFocusTrap(true, rootRef)
      useEscape(true, props.onClose)
      return h('div', {
        className: 'sw-layer sw-layer-center',
        onMouseDown: function (event) { if (event.target === event.currentTarget) props.onClose() },
      },
        h('div', { className: 'sw-dialog', ref: rootRef, tabIndex: -1, role: 'alertdialog', 'aria-modal': 'true', 'aria-label': props.title },
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
      return kind + ':' + (kind === 'skills' || kind === 'tools' ? row.name : row.id)
    }

    function isOn(kind, row) {
      return kind === 'skills' ? row.installed !== false && row.modelInvocable !== false : kind === 'tools' ? true : row.enabled
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
      var sourceDraftState = React.useState(null)
      var sourceDraft = sourceDraftState[0], setSourceDraft = sourceDraftState[1]
      var writingState = React.useState(false)
      var writing = writingState[0], setWriting = writingState[1]
      var operationState = React.useState(null)
      var operation = operationState[0], setOperation = operationState[1]
      var sourceStatusState = React.useState({})
      var sourceStatus = sourceStatusState[0], setSourceStatus = sourceStatusState[1]
      var collapsedState = React.useState({})
      var collapsed = collapsedState[0], setCollapsed = collapsedState[1]
      var toolState = React.useState(null)
      var toolDetail = toolState[0], setToolDetail = toolState[1]
      // npm components: loaded lazily when the tab is opened, because the check reaches the registry.
      var compState = React.useState({ phase: 'idle', loading: false, packages: [], skipped: [], error: null, at: null, supported: true, reason: null, running: null, notices: {} })
      var comp = compState[0], setComp = compState[1]

      var lockRef = React.useRef(false)
      var aliveRef = React.useRef(true)
      var searchRef = React.useRef(null)
      var toastTimer = React.useRef(null)
      var sourceRequestRef = React.useRef(0)
      var sourceReadAbortRef = React.useRef(null)
      var compRequestRef = React.useRef(0)

      React.useEffect(function () {
        aliveRef.current = true
        return function () {
          aliveRef.current = false
          sourceRequestRef.current += 1
          if (sourceReadAbortRef.current) sourceReadAbortRef.current.abort()
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

      var loadComponents = React.useCallback(async function (force) {
        var request = ++compRequestRef.current
        setComp(function (prev) { return Object.assign({}, prev, { loading: true, error: null }) })
        try {
          var value = await call('component.list', { force: force === true })
          if (!aliveRef.current || request !== compRequestRef.current) return
          setComp(function (prev) {
            // Keep per-row outcome notes: a reload follows every update and must not erase its own result.
            return { phase: 'ready', loading: false, packages: value.packages || [], skipped: value.skipped || [], at: value.at || null, supported: value.supported !== false, reason: value.reason || null, running: null, notices: prev.notices || {} }
          })
        } catch (error) {
          if (!aliveRef.current || request !== compRequestRef.current) return
          setComp(function (prev) { return Object.assign({}, prev, { loading: false, phase: 'error', error: String((error && error.message) || error) }) })
        }
      }, [])

      // The registry is only read once the user opens the tab, and never again on its own.
      React.useEffect(function () {
        if (tab !== 'components') return
        if (comp.phase !== 'idle' || comp.loading) return
        loadComponents(false)
      }, [tab, comp.phase, comp.loading, loadComponents])

      // `/` focuses the search box, the way host lists do.
      React.useEffect(function () {
        function onKey(event) {
          if (event.key !== '/' || draft || confirm || sourceDraft || toolDetail) return
          var target = event.target
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
          if (!searchRef.current) return
          event.preventDefault()
          searchRef.current.focus()
        }
        window.addEventListener('keydown', onKey)
        return function () { window.removeEventListener('keydown', onKey) }
      }, [draft, confirm, sourceDraft, toolDetail])

      /**
       * One write at a time: a ref answers synchronously, the state drives rendering.
       * @returns 'ok' | 'failed' | 'busy' — a second click while a write runs must not look like success.
       */
      async function withWrite(operation) {
        if (lockRef.current) return 'busy'
        lockRef.current = true
        setWriting(true)
        try {
          await operation()
          return 'ok'
        } catch (error) {
          notify('error', String((error && error.message) || error))
          return 'failed'
        } finally {
          await load(true)
          lockRef.current = false
          if (aliveRef.current) setWriting(false)
        }
      }

      var data = state.data
      var sources = data && data.skills ? (data.skills.sources || []) : []
      var lists = {
        skills: data && data.skills ? data.skills.rows || [] : [],
        mcp: data && data.mcp ? data.mcp.rows || [] : [],
        prompts: data && data.prompts ? data.prompts.rows || [] : [],
        tools: data && data.tools ? data.tools.rows || [] : [],
        // Components come from their own lazy RPC, never from the catalog.
        components: comp.packages || [],
      }
      var supported = {
        skills: !data || data.skills.supported !== false,
        mcp: !data || data.mcp.supported !== false,
        prompts: !data || data.prompts.supported !== false,
        tools: !data || Boolean(data.tools && data.tools.supported !== false),
        components: comp.supported !== false,
      }
      // The main list contains installed skills only; uninstalled repository entries stay in link previews.
      var all = lists[tab].filter(function (row) { return tab !== 'skills' || row.installed !== false }).map(function (row) {
        if (tab !== 'skills' || row.origin !== 'online') return row
        var source = sources.find(function (item) { return item.id === row.sourceId })
        return Object.assign({}, row, { sourceUrl: source ? source.url : row.sourceUrl, sourceLabel: row.sourceLabel || (source && source.label) })
      })
      var onlineGroups = sources.map(function (source) {
        var installed = lists.skills.filter(function (row) { return row.origin === 'online' && row.sourceId === source.id && row.installed !== false })
        var entries = installed.map(function (row) {
          var metadata = (source.skills || []).find(function (skill) { return skill.name === row.name })
          return Object.assign({}, metadata || {}, row, { installed: true, sourceUrl: source.url, sourceLabel: source.label })
        })
        return Object.assign({}, source, { skills: entries, availableSkills: source.skills || [] })
      }).filter(function (source) { return source.skills.length > 0 })
      var installedRows = all.filter(function (row) { return row.installed !== false })
      var activeCount = installedRows.filter(function (row) { return isOn(tab, row) }).length
      var needle = query.trim().toLowerCase()
      function matches(row, source) {
        if (filter === 'on' && !isOn(tab, row)) return false
        if (filter === 'off' && (row.installed === false || isOn(tab, row))) return false
        if (!needle) return true
        var hay = tab === 'mcp'
          ? [row.serverName, row.command, (row.args || []).join(' '), row.url, row.id]
          : tab === 'skills'
            ? [row.name, row.description, row.whenToUse, row.source, row.sourceLabel, row.sourceUrl, source && source.label, source && source.url]
            : tab === 'tools' ? [row.name, row.description] : [row.title, row.text, row.id]
        return hay.join(' ').toLowerCase().indexOf(needle) !== -1
      }
      var visible = all.filter(function (row) { return matches(row) })
      var visibleSources = onlineGroups.map(function (source) {
        return Object.assign({}, source, { visible: source.skills.filter(function (row) { return matches(row, source) }) })
      }).filter(function (source) { return source.visible.length > 0 })

      function cancelSourceRead() {
        sourceRequestRef.current += 1
        if (sourceReadAbortRef.current) sourceReadAbortRef.current.abort()
        sourceReadAbortRef.current = null
      }
      function beginSourceRead() {
        cancelSourceRead()
        var controller = new AbortController()
        sourceReadAbortRef.current = controller
        return { id: sourceRequestRef.current, controller: controller }
      }
      function readIsCurrent(request) {
        return aliveRef.current && request.id === sourceRequestRef.current && !request.controller.signal.aborted
      }
      function openSource(source, selectedName) {
        cancelSourceRead()
        setSourceDraft({ mode: source ? 'link' : 'search', url: source ? source.url : '', phase: 'idle',
          preview: source && selectedName ? { source: source, skills: source.availableSkills || source.skills || [] } : null,
          selected: selectedName ? [selectedName] : [], associate: false, error: null, notice: null, failedAdd: null, addingKey: null,
          directoryQuery: '', searchPhase: 'idle', results: [], searchedQuery: '', searchError: null, previewFilter: '', picked: null })
      }
      function returnToSkillList() {
        if (sourceDraft && sourceDraft.phase === 'installing') return
        cancelSourceRead()
        setSourceDraft(null)
        setTab('skills')
        setQuery('')
        setFilter('all')
      }
      async function addDirectorySkill(skill) {
        if (!sourceDraft || sourceDraft.phase !== 'idle' || writing || lockRef.current || skill.installed || skill.supported === false) return
        cancelSourceRead()
        var key = skill.url || skill.id
        patchSource({ phase: 'installing', addingKey: key, error: null, failedAdd: null, notice: null, searchPhase: 'ready' })
        setOperation(text.online.adding + ' ' + skill.name)
        var result = null
        var failure = null
        var outcome = await withWrite(async function () {
          try { result = await call('source.add', { url: skill.url }) }
          catch (error) { failure = String(error.message || error); throw error }
        })
        if (!aliveRef.current) return
        setOperation(null)
        if (outcome === 'ok') {
          setSourceDraft(function (cur) {
            if (!cur) return cur
            return Object.assign({}, cur, {
              phase: 'idle', addingKey: null, failedAdd: null, error: null,
              notice: result.name + ' · ' + (result.added ? text.online.addedDisabled : text.online.alreadyAdded),
              results: cur.results.map(function (item) {
                return item.url === skill.url || (skill.id && item.id === skill.id)
                  ? Object.assign({}, item, { installed: true, installedName: result.name }) : item
              }),
            })
          })
          if (result.sourceId) setCollapsed(function (prev) { return Object.assign({}, prev, { [result.sourceId]: false }) })
        } else {
          patchSource({ phase: 'idle', addingKey: null, failedAdd: skill, error: failure || text.busyWrite })
        }
      }
      function closeSource() {
        if (sourceDraft && sourceDraft.phase === 'installing') return
        cancelSourceRead()
        setSourceDraft(null)
      }
      function patchSource(patch) {
        setSourceDraft(function (cur) { return cur ? Object.assign({}, cur, patch) : cur })
      }
      function changeSourceMode(mode) {
        if (!sourceDraft || sourceDraft.phase === 'installing') return
        cancelSourceRead()
        patchSource({ mode: mode, preview: null, selected: [], associate: false, phase: 'idle', searchPhase: 'idle', error: null, searchError: null, notice: null, failedAdd: null, previewFilter: '', picked: null })
      }
      function changeDirectoryQuery(value) {
        cancelSourceRead()
        patchSource({ directoryQuery: value, phase: 'idle', searchPhase: 'idle', results: [], searchedQuery: '', searchError: null, error: null, notice: null, failedAdd: null })
      }
      function selectableSkill(skill, associate) {
        return !skill.installed && (!skill.conflict || (skill.canAssociate && associate))
      }
      async function searchDirectory(event) {
        if (event) event.preventDefault()
        if (!sourceDraft || sourceDraft.phase === 'installing') return
        var keyword = sourceDraft.directoryQuery.trim()
        if (!keyword) { patchSource({ searchError: text.online.searchRequired }); return }
        var request = beginSourceRead()
        patchSource({ phase: 'idle', searchPhase: 'searching', searchError: null, error: null, preview: null, selected: [], picked: null, notice: null, failedAdd: null })
        try {
          var result = await call('source.search', { query: keyword }, request.controller.signal)
          if (!readIsCurrent(request)) return
          patchSource({ searchPhase: 'ready', results: Array.isArray(result.skills) ? result.skills : [], searchedQuery: keyword })
        } catch (error) {
          if (!readIsCurrent(request)) return
          patchSource({ searchPhase: 'error', searchError: String((error && error.message) || text.online.searchError) })
        } finally {
          if (readIsCurrent(request)) sourceReadAbortRef.current = null
        }
      }
      function sourceUrl(value) {
        var url = String(value || '').trim()
        if (/^(?:www\.)?(?:skills\.sh|github\.com)\//i.test(url)) url = 'https://' + url
        else if (/^[\w.-]+\/[\w.-]+$/.test(url)) url = 'https://github.com/' + url
        var parsed = new URL(url)
        var host = parsed.hostname.toLowerCase()
        var parts = parsed.pathname.split('/').filter(Boolean)
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port ||
          (host !== 'github.com' && host !== 'skills.sh' && host !== 'www.skills.sh') ||
          (host === 'github.com' ? parts.length < 2 : parts.length < 2 || parts.length > 3)) throw new Error(text.online.urlError)
        return url
      }
      async function previewSource(value, picked) {
        if (!sourceDraft || sourceDraft.phase === 'installing') return
        var url
        try { url = sourceUrl(typeof value === 'string' ? value : sourceDraft.url) }
        catch (error) { patchSource({ error: text.online.urlError }); return }
        var request = beginSourceRead()
        patchSource({ url: url, phase: 'previewing', error: null, selected: [], preview: null, picked: picked || null, previewFilter: '', notice: null, failedAdd: null })
        try {
          var result = await call('source.preview', { url: url }, request.controller.signal)
          if (!readIsCurrent(request)) return
          var skills = result.skills || []
          // Directory slugs are not installation names. Trust only names resolved by the preview.
          var suggested = Array.isArray(result.selectedNames) ? result.selectedNames : skills.filter(function (skill) { return skill.selected === true }).map(function (skill) { return skill.name })
          if (!suggested.length && skills.length === 1) suggested = [skills[0].name]
          var selected = suggested.filter(function (name, i) {
            return suggested.indexOf(name) === i && skills.some(function (skill) { return skill.name === name && selectableSkill(skill, false) })
          })
          patchSource({ preview: result, selected: selected, associate: false, phase: 'idle', error: null })
        } catch (error) {
          if (!readIsCurrent(request)) return
          patchSource({ phase: 'idle', error: String((error && error.message) || text.online.previewFailed) })
        } finally {
          if (readIsCurrent(request)) sourceReadAbortRef.current = null
        }
      }
      function backFromPreview() {
        cancelSourceRead()
        patchSource({ preview: null, selected: [], phase: 'idle', error: null, previewFilter: '', picked: null })
      }
      async function updatePreviewSkill(skill) {
        if (!sourceDraft || sourceDraft.phase !== 'idle' || writing) return
        var previous = sourceDraft
        patchSource({ phase: 'installing', error: null })
        setOperation(text.online.updating + ' ' + skill.name)
        var failure = null
        var outcome = await withWrite(async function () {
          try { await call('skill.update', { name: skill.name }) }
          catch (error) { failure = String(error.message || error); throw error }
        })
        if (!aliveRef.current) return
        setOperation(null)
        patchSource({ phase: 'idle', error: failure })
        if (outcome === 'ok') {
          notify('ok', text.online.updated)
          // Re-read the preview after updating, rather than leaving stale update flags on screen.
          await previewSource(previous.url, previous.picked)
        } else if (outcome === 'busy') patchSource({ error: text.busyWrite })
      }
      async function installSource() {
        var cur = sourceDraft
        if (!cur || cur.phase !== 'idle' || !cur.preview || writing) return
        var names = cur.selected.filter(function (name) {
          return (cur.preview.skills || []).some(function (skill) { return skill.name === name && selectableSkill(skill, cur.associate) })
        })
        if (!names.length) { patchSource({ error: text.online.noneSelected }); return }
        patchSource({ phase: 'installing', error: null })
        setOperation(text.online.installing)
        var outcome = await withWrite(async function () {
          try {
            await call('source.install', { token: cur.preview.token, url: cur.preview.source.url || cur.url,
              names: names, enabled: false, associate: cur.associate })
          } catch (error) { if (aliveRef.current) patchSource({ error: String(error.message || error) }); throw error }
        })
        if (!aliveRef.current) return
        setOperation(null)
        patchSource({ phase: 'idle' })
        if (outcome === 'ok') { setSourceDraft(null); setTab('skills'); setQuery(''); setFilter('all'); notify('ok', text.online.installedDone) }
        else if (outcome === 'busy') patchSource({ error: text.busyWrite })
      }
      /** One action per source: refreshing re-reads upstream and updates the source record. */
      async function sourceAction(source) {
        if (writing) return
        var key = 'source:' + source.id
        setPending(function (p) { return Object.assign({}, p, { [key]: true }) })
        setSourceStatus(function (p) { return Object.assign({}, p, { [source.id]: { pending: true, text: text.online.refreshing } }) })
        setOperation(text.online.refreshing)
        var outcome = await withWrite(async function () {
          try { await call('source.refresh', { id: source.id }) }
          catch (error) {
            setSourceStatus(function (p) { return Object.assign({}, p, { [source.id]: { error: true, text: String(error.message || error) } }) })
            throw error
          }
        })
        if (!aliveRef.current) return
        setOperation(null)
        setPending(function (p) { var n = Object.assign({}, p); delete n[key]; return n })
        if (outcome === 'ok') {
          setSourceStatus(function (p) { return Object.assign({}, p, { [source.id]: { text: text.online.refreshed } }) })
          notify('ok', text.online.refreshed)
        } else if (outcome === 'busy') {
          setSourceStatus(function (p) { return Object.assign({}, p, { [source.id]: { error: true, text: text.busyWrite } }) })
        }
      }
      async function updateSkill(row) {
        if (writing) return
        var key = rowKey('skills', row)
        setPending(function (p) { return Object.assign({}, p, { [key]: true }) })
        setOperation(text.online.updating + ' ' + row.name)
        var outcome = await withWrite(function () { return call('skill.update', { name: row.name }) })
        if (!aliveRef.current) return
        setOperation(null)
        setPending(function (p) { var n = Object.assign({}, p); delete n[key]; return n })
        if (outcome === 'ok') notify('ok', text.online.updated)
        else if (outcome === 'busy') notify('error', text.busyWrite)
      }

      /* npm components */

      /** The host answers how the update ended; a persisted change can still report `application: 'failed'`. */
      function componentOutcome(result) {
        var application = result && result.application
        var failure = result && result.error
        if (application === 'applied' || application === 'restart-required') return { kind: 'ok', text: text.components.updated }
        if (application === 'failed') {
          var detail = failure ? [failure.code, failure.diagnostic].filter(Boolean).join(': ') : ''
          return { kind: 'error', text: text.components.failed + (detail ? ': ' + detail : '') }
        }
        if (result && result.nextStep) return { kind: 'info', text: result.nextStep }
        return { kind: 'info', text: text.components.updated }
      }

      function componentNotice(name, notice) {
        setComp(function (prev) {
          var notices = Object.assign({}, prev.notices)
          if (notice) notices[name] = notice
          else delete notices[name]
          return Object.assign({}, prev, { notices: notices })
        })
      }

      async function updateComponent(name) {
        if (writing) return 'busy'
        setComp(function (prev) { return Object.assign({}, prev, { running: name }) })
        setOperation(text.components.updating + ' ' + name)
        var failure = null
        var result = null
        var outcome = await withWrite(async function () {
          try { result = await call('component.update', { name: name }) }
          catch (error) { failure = String((error && error.message) || error); throw error }
        })
        if (!aliveRef.current) return outcome
        setOperation(null)
        setComp(function (prev) { return Object.assign({}, prev, { running: null }) })
        if (outcome === 'ok') {
          var notice = componentOutcome(result)
          componentNotice(name, notice)
          notify(notice.kind === 'error' ? 'error' : 'ok', name + ' · ' + notice.text)
        } else if (outcome === 'failed' && failure) {
          componentNotice(name, { kind: 'error', text: failure })
        } else if (outcome === 'busy') {
          componentNotice(name, { kind: 'error', text: text.busyWrite })
        }
        await loadComponents(true)
        return outcome
      }

      async function updateAllComponents() {
        if (writing) return
        var targets = comp.packages.filter(function (row) { return row.updateAvailable && !row.error }).map(function (row) { return row.name })
        for (var i = 0; i < targets.length; i += 1) {
          if (!aliveRef.current) return
          await updateComponent(targets[i])
        }
      }

      /* drafts */

      function openDraft(kind, row) {
        if (kind === 'tools') { setToolDetail(row); return }
        if (kind === 'skills') {
          var readOnly = Boolean(row) && (!row.writable || row.editable === false)
          setDraft({
            kind: kind, mode: row ? (readOnly ? 'view' : 'edit') : 'create', readOnly: readOnly, touched: false,
            originalName: row ? row.name : null, path: row ? row.path : '', loading: Boolean(row), managed: Boolean(row && row.managed),
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
                  readOnly: cur.readOnly || detail.editable === false, mode: cur.readOnly || detail.editable === false ? 'view' : cur.mode,
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
          if (draft || confirm || sourceDraft || toolDetail) return
          if (event.metaKey || event.ctrlKey || event.altKey) return
          if (event.key !== 'n' && event.key !== 'N') return
          var target = event.target
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
          if ((tab !== 'skills' && !CREATABLE[tab]) || !supported[tab] || writing) return
          event.preventDefault()
          if (tab === 'skills') openSource(null)
          else openDraft(tab, null)
        }
        window.addEventListener('keydown', onKey)
        return function () { window.removeEventListener('keydown', onKey) }
      }, [draft, confirm, sourceDraft, toolDetail, tab, writing, supported.skills, supported.mcp, supported.prompts, supported.tools])

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
        if (pending[key] || writing) return
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
          if (kind === 'skills') await call('skill.setInvocation', { name: row.name, enabled: next })
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
          if (cur.kind === 'source') await call('source.remove', { id: cur.id })
          else if (cur.kind === 'skills') await call('skill.remove', { name: cur.row.name })
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

      /** Deleting a source deletes every skill it manages, so the count is part of the confirmation. */
      function askRemoveSource(source) {
        var count = source.skills.filter(function (row) { return row.installed !== false }).length
        setConfirm({ kind: 'source', id: source.id, label: source.label || source.id, count: count })
      }

      /* rows */

      function renderRow(kind, row) {
        var key = rowKey(kind, row)
        var on = isOn(kind, row)
        var busy = Boolean(pending[key])
        var tags = []
        var actions = []
        var editable = kind === 'skills' ? row.writable && row.editable !== false : kind !== 'tools' && !(kind === 'mcp' && row.external)

        if (kind === 'skills') {
          if (!row.writable) tags.push(h(Tag, { key: 'ro' }, h(Icon, { name: 'lock', size: 11 }), text.readOnly))
          if (row.invalid) tags.push(h(Tag, { key: 'inv', tone: 'warn' }, text.invalid))
          if (!row.userInvocable) tags.push(h(Tag, { key: 'uo' }, text.userOff))
          tags.push(h(Tag, { key: 'src', tone: 'quiet' }, row.source || row.provider))
        } else if (kind === 'mcp') {
          tags.push(h(Tag, { key: 'tr', tone: 'quiet' }, row.transport === 'streamable-http' ? 'HTTP' : 'stdio'))
          if (row.external) tags.push(h(Tag, { key: 'ro' }, h(Icon, { name: 'lock', size: 11 }), text.readOnly))
          if (row.phase === 'failed') tags.push(h(Tag, { key: 'f', tone: 'error' }, 'failed'))
        } else if (kind === 'tools') {
          tags.push(h(Tag, { key: 'ro' }, text.readOnly))
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
          : kind === 'tools' ? row.description
          : kind === 'mcp'
            ? (row.transport === 'streamable-http' ? row.url : [row.command].concat(row.args || []).join(' '))
            : String(row.text || '').replace(/\s+/g, ' ')

        return h(Row, {
          key: key,
          kind: kind,
          icon: kind === 'skills' ? 'skill' : kind === 'mcp' ? 'server' : kind === 'tools' ? 'plug' : 'prompt',
          title: kind === 'skills' || kind === 'tools' ? row.name : kind === 'mcp' ? (row.serverName || row.id) : (row.title || row.id),
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
            disabled: writing || kind === 'tools' || (kind === 'skills' && !row.writable) || (kind === 'mcp' && row.external && !row.toggleable),
            onChange: function (next) { toggle(kind, row, next) },
          }),
        })
      }

      function renderOnlineRow(source, row) {
        var installed = row.installed !== false
        var on = installed && isOn('skills', row)
        var busy = Boolean(pending[rowKey('skills', row)])
        var tags = [h(Tag, { key: 'installed', tone: installed ? (on ? 'ok' : 'quiet') : 'quiet' }, installed ? (on ? text.on : text.off) : text.online.available)]
        if (row.conflict && !installed) tags.push(h(Tag, { key: 'conflict', tone: 'warn' }, text.online.conflict))
        if (row.localModified) tags.push(h(Tag, { key: 'modified', tone: 'warn' }, text.online.modified))
        if (row.updateAvailable) tags.push(h(Tag, { key: 'update', tone: 'ok' }, text.online.updateAvailable))
        if (row.upstreamRemoved) tags.push(h(Tag, { key: 'removed', tone: 'warn' }, text.online.upstreamRemoved))
        var actions = installed ? [
          h(IconButton, { key: 'view', icon: 'skill', label: text.view, disabled: writing, onClick: function () { openDraft('skills', row) } }),
          h(Button, { key: 'update', icon: 'refresh', disabled: writing || row.localModified || row.upstreamRemoved,
            title: row.localModified ? text.online.modified : undefined, onClick: function () { updateSkill(row) } }, text.online.update),
          h(IconButton, { key: 'remove', icon: 'trash', label: text.online.uninstall, danger: true, disabled: writing,
            onClick: function () { askRemove('skills', row) } }),
        ] : [h(Button, { key: 'install', icon: 'plus', disabled: writing || Boolean(row.conflict && !row.canAssociate),
          title: row.conflict || text.online.install, onClick: function () { openSource(source, row.conflict ? null : row.name) } }, row.canAssociate ? text.online.inspect : text.online.install)]
        return h(Row, {
          key: source.id + ':' + row.name, kind: 'skills', icon: 'skill', mono: true, title: row.name,
          description: row.description, tags: tags, muted: !on, pending: busy, actions: actions,
          openLabel: installed ? text.view : text.online.inspect,
          onOpen: function () { if (installed) openDraft('skills', row); else openSource(source, row.conflict ? null : row.name) },
          toggle: installed ? h(Switch, { checked: on, pending: busy, label: row.name + ': ' + text.fields.modelInvocable,
            disabled: writing || !row.writable, onChange: function (next) { toggle('skills', row, next) } }) : null,
        })
      }
      function setAllSourcesCollapsed(next) {
        setCollapsed(function (prev) {
          var state = Object.assign({}, prev)
          onlineGroups.forEach(function (source) { state[source.id] = next })
          return state
        })
      }

      /** Online sources start collapsed: an unknown id means closed until the user expands it. */
      function sourceClosed(source) {
        return collapsed[source.id] !== false
      }

      function renderSource(source) {
        var installed = source.skills.filter(function (row) { return row.installed !== false })
        var on = installed.filter(function (row) { return isOn('skills', row) }).length
        var status = sourceStatus[source.id]
        var closed = sourceClosed(source)
        var contentId = 'sw-source-content-' + source.id
        return h('section', { key: source.id, className: 'sw-source' },
          h('div', { className: 'sw-source-head' },
            h('button', { type: 'button', className: 'sw-source-toggle', 'aria-expanded': !closed, 'aria-controls': contentId,
              title: (closed ? text.online.expandSource : text.online.collapseSource) + ': ' + (source.label || source.id),
              onClick: function () { setCollapsed(function (prev) { return Object.assign({}, prev, { [source.id]: !closed }) }) } },
              h(Icon, { name: closed ? 'right' : 'down' }),
              h('span', { className: 'sw-source-title' }, source.label || source.id),
              h('span', { className: 'sw-source-summary' }, text.online.summary(installed.length, source.skills.length, on))),
            h('div', { className: 'sw-source-actions' },
              h(Button, { className: 'sw-source-action', disabled: writing, onClick: function () { sourceAction(source) } }, text.online.refresh),
              h(Button, { className: 'sw-source-action is-danger', disabled: writing,
                onClick: function () { askRemoveSource(source) } }, text.online.removeSource))),
          h('div', { className: 'sw-source-meta' },
            h('a', { href: source.url, target: '_blank', rel: 'noopener noreferrer', title: text.online.openSource }, source.url),
            source.ref ? h(Tag, { tone: 'quiet' }, source.ref) : null,
            source.commit ? h('code', { title: source.commit }, source.commit.slice(0, 8)) : null),
          source.partial ? h('p', { className: 'sw-field-hint' }, text.online.partialHint) : null,
          status ? h('p', { className: 'sw-source-status' + (status.error ? ' is-error' : ''), role: status.error ? 'alert' : 'status' }, status.text) : null,
          h('div', { id: contentId, hidden: closed }, source.visible.length
            ? h('ul', { className: 'sw-rows sw-online-rows' }, source.visible.map(function (row) { return renderOnlineRow(source, row) }))
            : h('p', { className: 'sw-group-hint' }, text.online.noSkills)))
      }

      /* npm components: one row per updatable bundle, plus the sources that cannot be compared */

      function componentClock(iso) {
        if (!iso) return text.components.neverChecked
        var at = new Date(iso)
        if (Number.isNaN(at.getTime())) return text.components.neverChecked
        try { return at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) } catch (error) { return at.toISOString().slice(11, 16) }
      }

      function componentReason(reason) {
        var c = text.components
        if (reason === 'git') return c.reasonGit
        if (reason === 'link') return c.reasonLink
        if (reason === 'file') return c.reasonFile
        if (reason === 'url') return c.reasonUrl
        if (reason === 'alias') return c.reasonAlias
        return c.reasonOther
      }

      function renderComponentRow(row) {
        var c = text.components
        var busy = comp.running === row.name
        var notice = comp.notices[row.name]
        var tags = []
        if (row.error) tags.push(h(Tag, { key: 'err', tone: 'error' }, c.failed))
        else if (row.updateAvailable) tags.push(h(Tag, { key: 'up', tone: 'ok' }, c.available))
        else tags.push(h(Tag, { key: 'ok', tone: 'quiet' }, c.upToDate))
        if (row.latest && row.stable === false) tags.push(h(Tag, { key: 'pre', tone: 'quiet' }, c.prerelease))
        if (row.enabled === false) tags.push(h(Tag, { key: 'off', tone: 'quiet' }, c.disabled))
        var versions = c.installed + ' ' + (row.installed || '—') + ' · ' + c.latest + ' ' + (row.latest || (row.error ? '—' : '…'))
        return h('li', { key: row.name, className: 'sw-row sw-comp-row', 'data-pending': busy ? 'true' : undefined },
          h('span', { className: 'sw-row-icon' }, h(Icon, { name: 'plug', size: 18 })),
          h('div', { className: 'sw-row-main' },
            h('div', { className: 'sw-row-title' },
              h('span', { className: 'sw-row-name sw-mono' }, row.name), tags),
            row.description ? h('p', { className: 'sw-row-desc' }, row.description) : null,
            h('p', { className: 'sw-comp-versions sw-mono' }, versions),
            row.error ? h('p', { className: 'sw-comp-note sw-comp-note-error' }, c.failed + ': ' + row.error) : null,
            busy ? h('p', { className: 'sw-comp-note' }, c.updating) : null,
            notice ? h('p', { className: 'sw-comp-note sw-comp-note-' + notice.kind, role: notice.kind === 'error' ? 'alert' : 'status' }, notice.text) : null),
          h('div', { className: 'sw-row-end' },
            h('div', { className: 'sw-row-actions' },
              h(Button, { variant: row.updateAvailable ? 'primary' : null, icon: 'refresh',
                disabled: writing || !row.updateAvailable || Boolean(row.error),
                onClick: function () { updateComponent(row.name) } }, busy ? c.updating : c.update))))
      }

      function renderComponents() {
        var c = text.components
        if (!comp.supported) return h(EmptyState, { icon: 'warn', title: c.skippedTitle, text: c.unsupported })
        var pending = comp.packages.filter(function (row) { return row.updateAvailable }).length
        return h('div', { className: 'sw-components' },
          h('div', { className: 'sw-comp-head' },
            h('div', { className: 'sw-comp-toolbar' },
              h(Button, { icon: 'refresh', disabled: comp.loading || writing, onClick: function () { loadComponents(true) } },
                comp.loading ? c.checking : c.check),
              h(Button, { variant: pending ? 'primary' : null, icon: 'refresh', disabled: comp.loading || writing || !pending, onClick: updateAllComponents },
                c.updateAll + (pending ? ' (' + pending + ')' : ''))),
            h('span', { className: 'sw-comp-meta' }, c.lastChecked + ' · ' + componentClock(comp.at))),
          h('p', { className: 'sw-group-hint' }, c.hint),
          comp.error ? h('div', { className: 'sw-banner sw-source-error', role: 'alert' }, h(Icon, { name: 'warn' }), h('span', null, comp.error),
            h(Button, { disabled: comp.loading || writing, onClick: function () { loadComponents(true) } }, text.retry)) : null,
          comp.loading && !comp.packages.length ? h(SkeletonRows) : null,
          !comp.loading && comp.phase === 'ready' && !comp.packages.length
            ? h(EmptyState, { icon: 'plug', title: c.empty, text: c.footer })
            : null,
          comp.packages.length
            ? h('ul', { className: 'sw-rows' }, comp.packages.map(renderComponentRow))
            : null,
          comp.phase === 'ready' && comp.packages.length && !pending
            ? h('p', { className: 'sw-comp-note sw-comp-note-ok' }, c.allCurrent)
            : null,
          comp.skipped.length
            ? h('details', { className: 'sw-comp-skipped' },
              h('summary', null, c.skippedTitle + ' (' + comp.skipped.length + ')'),
              h('p', { className: 'sw-group-hint' }, c.skippedHint),
              h('ul', { className: 'sw-rows' }, comp.skipped.map(function (item) {
                return h('li', { key: item.name, className: 'sw-comp-skipped-row' },
                  h('span', { className: 'sw-mono' }, item.name + (item.version ? ' ' + item.version : '')),
                  h('span', { className: 'sw-comp-note' }, ' · ' + componentReason(item.reason)),
                  item.source ? h('code', { className: 'sw-mono sw-comp-source', title: item.source }, String(item.source)) : null)
              })))
            : null,
          h('p', { className: 'sw-comp-note' }, c.footer))
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
        return [{ id: kind === 'tools' ? 'tools' : 'prompts', rows: rows }]
      }

      /* render */

      var tabs = ['skills', 'mcp', 'prompts', 'tools', 'components']
      // Local skills keep their existing editors; online skills enter through source preview.
      var canCreate = (tab === 'skills' || CREATABLE[tab]) && Boolean(supported[tab])
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
      } else if (tab === 'components') {
        content = renderComponents()
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
            text: tab === 'skills' ? text.online.localEmpty : text.empty[tab],
          })
      } else if (tab === 'skills') {
        var localVisible = visible.filter(function (row) { return row.origin !== 'online' })
        content = h('div', { className: 'sw-groups' },
          localVisible.length ? h('section', { className: 'sw-skill-section' },
            h('h2', { className: 'sw-skill-section-title' }, text.online.local),
            h('div', { className: 'sw-groups' }, groupsFor('skills', localVisible).map(function (group) {
              return h(Group, { key: group.id, title: text.groups[group.id], hint: text.groupHint[group.id] },
                group.rows.map(function (row) { return renderRow('skills', row) }))
            }))) : null,
          visibleSources.length ? h('section', { className: 'sw-skill-section' },
            h('div', { className: 'sw-skill-section-head' },
              h('h2', { className: 'sw-skill-section-title' }, text.online.remote),
              h('div', { className: 'sw-skill-section-actions', role: 'group', 'aria-label': text.online.remote },
                h(Button, { disabled: !onlineGroups.some(sourceClosed),
                  onClick: function () { setAllSourcesCollapsed(false) } }, text.online.expandAll),
                h(Button, { disabled: !onlineGroups.some(function (source) { return !sourceClosed(source) }),
                  onClick: function () { setAllSourcesCollapsed(true) } }, text.online.collapseAll))),
            h('div', { className: 'sw-groups' }, visibleSources.map(renderSource))) : null)
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
          blocked: Boolean(confirm), focusBlocked: Boolean(confirm), closeDisabled: saving,
          onClose: function () { if (!saving) setDraft(null) },
          onSave: saveDraft,
          saveDisabled: draft.readOnly || saving,
          banner: draft.readOnly
            ? h('div', { className: 'sw-banner' }, h(Icon, { name: 'lock' }), h('span', null, draft.managed ? text.online.managedNote : text.readOnlyNote))
            : draft.kind === 'mcp' && draft.mode !== 'create'
              ? h('div', { className: 'sw-banner' }, h(Icon, { name: 'refresh' }), h('span', null, text.reloadHint))
              : null,
          footHint: draft.readOnly ? '' : text.saveShortcut,
          // A read-only drawer is closed by its header control; a second footer close would duplicate it.
          footer: draft.readOnly
            ? null
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

      var sourceDrawer = null
      if (sourceDraft) {
        var sourceBusy = sourceDraft.phase === 'installing'
        var sourceReading = sourceDraft.phase === 'previewing'
        var directoryBusy = sourceDraft.searchPhase === 'searching'
        var preview = sourceDraft.preview
        var previewSkills = preview ? preview.skills || [] : []
        var previewNeedle = sourceDraft.previewFilter.trim().toLowerCase()
        var previewVisible = previewSkills.filter(function (skill) {
          return !previewNeedle || [skill.name, skill.description, skill.path].join(' ').toLowerCase().indexOf(previewNeedle) !== -1
        })
        var selectedCount = sourceDraft.selected.length
        var searchMode = sourceDraft.mode === 'search'
        var directoryResults = null
        if (searchMode && !preview) {
          if (directoryBusy) {
            directoryResults = h('div', { className: 'sw-directory-state', role: 'status', 'aria-live': 'polite' },
              h(Icon, { name: 'refresh', size: 20 }), h('p', null, text.online.searching))
          } else if (sourceDraft.searchPhase === 'error') {
            directoryResults = h('div', { className: 'sw-directory-state is-error', role: 'alert' },
              h(Icon, { name: 'warn', size: 20 }), h('p', null, sourceDraft.searchError || text.online.searchError),
              h(Button, { disabled: sourceBusy, onClick: searchDirectory }, text.retry))
          } else if (sourceDraft.searchPhase === 'ready' && !sourceDraft.results.length) {
            directoryResults = h(EmptyState, { icon: 'search', title: text.online.searchEmpty, text: text.online.searchEmptyHint })
          } else if (sourceDraft.results.length) {
            directoryResults = h('section', { className: 'sw-directory-results', 'aria-label': text.online.searchMode },
              h('div', { className: 'sw-directory-summary', role: 'status', 'aria-live': 'polite' },
                h('span', null, text.online.results(sourceDraft.results.length)), h('span', null, sourceDraft.searchedQuery)),
              h('ul', { className: 'sw-directory-list' }, sourceDraft.results.map(function (skill) {
                var supportedResult = skill.supported !== false && Boolean(skill.url)
                var installations = Number(skill.installs)
                return h('li', { key: skill.id || skill.url || [skill.source, skill.name].join(':'), className: 'sw-directory-card' },
                  h('div', { className: 'sw-directory-card-main' },
                    h('div', { className: 'sw-directory-card-title' },
                      h('strong', null, skill.name)),
                    h('div', { className: 'sw-directory-card-meta' },
                      h('span', { className: 'sw-mono' }, skill.source),
                      Number.isFinite(installations) && installations >= 0 ? h('span', null, text.online.installs(installations)) : null),
                    !supportedResult ? h('p', { className: 'sw-directory-unsupported' }, skill.unsupportedReason || text.online.unsupportedResult) : null),
                  h('div', { className: 'sw-directory-card-actions' },
                    h(Button, { disabled: sourceBusy || sourceReading || writing || !supportedResult || skill.installed,
                      icon: skill.installed ? 'check' : 'plus',
                      onClick: function () { addDirectorySkill(skill) } }, sourceDraft.addingKey === (skill.url || skill.id) ? text.online.adding : skill.installed ? text.online.resultInstalled : text.online.resultPreview),
                    skill.installed ? h(IconButton, { icon: 'skill', label: text.view + ': ' + skill.name, disabled: sourceBusy || sourceReading || writing,
                      onClick: function () { previewSource(skill.url, skill) } }) : null))
              })))
          } else {
            directoryResults = h(EmptyState, { icon: 'search', title: text.online.searchStart, text: text.online.searchStartHint })
          }
        }
        sourceDrawer = h(Drawer, {
          title: preview ? text.online.previewTitle : text.online.add,
          subtitle: preview ? preview.source.label : null,
          note: preview ? text.online.selectedHint : searchMode ? text.online.searchNote : text.online.linkNote,
          className: 'sw-add-drawer', icon: preview ? 'skill' : searchMode ? 'search' : 'plus',
          closeLabel: text.close, closeDisabled: sourceBusy, blocked: sourceBusy, onClose: closeSource,
          onSave: installSource, saveDisabled: sourceBusy || sourceReading || !preview || !selectedCount,
          banner: sourceBusy ? h('div', { className: 'sw-banner', role: 'status', 'aria-live': 'polite' }, h(Icon, { name: 'refresh' }),
            h('span', null, operation || text.online.installing)) : null,
          footHint: preview ? text.online.selected(selectedCount) : '',
          // Without a preview or a notice the footer would only repeat the header close.
          footer: preview || sourceDraft.notice ? [
            h('span', { key: 'gap', className: 'sw-grow' }),
            h(Button, { key: 'cancel', disabled: sourceBusy, onClick: !preview && sourceDraft.notice ? returnToSkillList : closeSource },
              preview ? text.cancel : sourceDraft.notice ? text.online.returnToList : text.close),
            preview ? h(Button, { key: 'install', variant: 'primary', disabled: sourceBusy || sourceReading || writing || !selectedCount, onClick: installSource },
              sourceBusy ? text.saving : text.online.installSelected) : null,
          ] : null,
        },
          !preview ? h('div', { className: 'sw-add-modes' }, h(Segmented, {
            label: text.online.add, value: sourceDraft.mode, disabled: sourceBusy,
            options: [{ value: 'search', label: text.online.searchMode }, { value: 'link', label: text.online.linkMode }], onChange: changeSourceMode,
          })) : h('div', { className: 'sw-preview-back' }, h(Button, { disabled: sourceBusy, onClick: backFromPreview }, searchMode ? text.online.backSearch : text.online.backLink)),
          !preview && searchMode ? h('form', { className: 'sw-discovery-form', onSubmit: searchDirectory },
            h(Field, { id: 'sw-directory-query', label: text.online.searchLabel,
              error: sourceDraft.searchPhase !== 'error' ? sourceDraft.searchError : null },
              h('div', { className: 'sw-source-input' },
                h(Input, { id: 'sw-directory-query', value: sourceDraft.directoryQuery, autoFocus: true, disabled: sourceBusy,
                  placeholder: text.online.searchPlaceholder, onChange: changeDirectoryQuery }),
                h(Button, { type: 'submit', variant: 'primary', icon: 'search', disabled: sourceBusy || sourceReading || directoryBusy || !sourceDraft.directoryQuery.trim() }, text.online.searchSubmit)))) : null,
          !preview && !searchMode ? h('form', { className: 'sw-discovery-form', onSubmit: function (event) { event.preventDefault(); previewSource() } },
            h(Field, { id: 'sw-source-url', label: text.online.url, hint: text.online.urlHint },
              h('div', { className: 'sw-source-input' },
                h(Input, { id: 'sw-source-url', mono: true, value: sourceDraft.url, autoFocus: true, disabled: sourceBusy,
                  placeholder: 'https://skills.sh/cloudflare/skills/cloudflare',
                  onChange: function (url) { cancelSourceRead(); patchSource({ url: url, phase: 'idle', preview: null, selected: [], error: null }) } }),
                h(Button, { type: 'submit', variant: 'primary', disabled: sourceBusy || sourceReading || !sourceDraft.url.trim() }, text.online.preview)))) : null,
          sourceReading ? h('div', { className: 'sw-banner', role: 'status', 'aria-live': 'polite' }, h(Icon, { name: 'refresh' }),
            h('span', null, text.online.previewing)) : null,
          sourceDraft.notice ? h('div', { className: 'sw-banner', role: 'status', 'aria-live': 'polite' }, h(Icon, { name: 'check' }), h('span', null, sourceDraft.notice)) : null,
          sourceDraft.error ? h('div', { className: 'sw-banner sw-source-error', role: 'alert' }, h(Icon, { name: 'warn' }), h('span', null, sourceDraft.error),
            !preview ? h(Button, { disabled: sourceBusy || sourceReading, onClick: function () {
              if (sourceDraft.failedAdd) addDirectorySkill(sourceDraft.failedAdd)
              else previewSource(sourceDraft.url, sourceDraft.picked)
            } }, text.retry) : null) : null,
          !preview && searchMode ? h('div', { className: 'sw-discovery-pane' + (sourceDraft.results.length ? '' : ' is-centered') }, directoryResults) : null,
          preview ? h('section', { className: 'sw-source-preview' },
            h('div', { className: 'sw-preview-source' },
              h('div', { className: 'sw-preview-source-heading' }, h('strong', null, preview.source.label), h('span', null, text.online.previewCount(previewSkills.length))),
              h('div', { className: 'sw-source-meta' },
                h('a', { href: preview.source.url, target: '_blank', rel: 'noopener noreferrer' }, preview.source.url),
                preview.source.ref ? h('span', null, preview.source.ref) : null,
                preview.source.commit ? h('code', { title: preview.source.commit }, preview.source.commit.slice(0, 8)) : null)),
            h('div', { className: 'sw-preview-tools' },
              h(Input, { id: 'sw-preview-filter', value: sourceDraft.previewFilter, disabled: sourceBusy, autoFocus: true,
                ariaLabel: text.online.previewFilter, placeholder: text.online.previewFilter, onChange: function (value) { patchSource({ previewFilter: value }) } }),
              h('div', { className: 'sw-selection-toolbar' },
                h(Button, { disabled: sourceBusy || !previewVisible.some(function (skill) { return selectableSkill(skill, sourceDraft.associate) }), onClick: function () {
                  var names = sourceDraft.selected.slice()
                  previewVisible.forEach(function (skill) { if (selectableSkill(skill, sourceDraft.associate) && names.indexOf(skill.name) === -1) names.push(skill.name) })
                  patchSource({ selected: names, error: null })
                } }, text.online.visibleSelect),
                h(Button, { disabled: sourceBusy || !selectedCount, onClick: function () { patchSource({ selected: [], error: null }) } }, text.online.clearSelection))),
            previewSkills.some(function (skill) { return skill.canAssociate })
              ? h('div', { className: 'sw-settings' }, h(SettingRow, { label: text.online.associate, hint: text.online.associateHint,
                checked: sourceDraft.associate, disabled: sourceBusy, onChange: function (associate) {
                  patchSource({ associate: associate, selected: sourceDraft.selected.filter(function (name) {
                    return previewSkills.some(function (skill) { return skill.name === name && selectableSkill(skill, associate) })
                  }) })
                } })) : null,
            previewVisible.length ? h('ul', { className: 'sw-source-choices' }, previewVisible.map(function (skill) {
              var selectable = selectableSkill(skill, sourceDraft.associate)
              return h('li', { key: skill.path || skill.name, className: 'sw-source-choice' + (sourceDraft.selected.indexOf(skill.name) !== -1 ? ' is-selected' : '') },
                h('label', null,
                  h('input', { type: 'checkbox', checked: sourceDraft.selected.indexOf(skill.name) !== -1,
                    disabled: sourceBusy || !selectable, onChange: function (event) {
                      var selected = sourceDraft.selected.filter(function (name) { return name !== skill.name })
                      if (event.target.checked) selected.push(skill.name)
                      patchSource({ selected: selected, error: null })
                    } }),
                  h('span', { className: 'sw-source-choice-text' },
                    h('span', { className: 'sw-source-choice-title' }, h('strong', { className: 'sw-mono' }, skill.name),
                      skill.installed || skill.conflict ? h(Tag, { tone: skill.conflict ? 'warn' : 'quiet' }, skill.installed ? text.online.installed : text.online.conflict) : null),
                    h('span', { className: 'sw-source-choice-description' }, skill.description),
                    skill.path ? h('span', { className: 'sw-source-choice-path sw-mono' }, skill.path) : null,
                    skill.conflict ? h('span', { className: 'sw-source-choice-warning' }, typeof skill.conflict === 'string' ? skill.conflict : text.online.conflictHint) : null)),
                skill.installed ? h(Button, { className: 'sw-preview-update', icon: 'refresh',
                  disabled: sourceBusy || writing || skill.localModified || skill.upstreamRemoved,
                  title: skill.localModified ? text.online.modified : skill.upstreamRemoved ? text.online.upstreamRemoved : undefined,
                  onClick: function () { updatePreviewSkill(skill) } }, text.online.update) : null)
            })) : h(EmptyState, { icon: 'search', title: previewNeedle ? text.online.noPreviewMatches : text.online.noSkills,
              text: previewNeedle ? text.emptySearchText : text.online.noneSelected,
              action: previewNeedle ? h(Button, { onClick: function () { patchSource({ previewFilter: '' }) } }, text.online.clearPreviewFilter) : null }),
            previewSkills.some(function (skill) { return skill.installed }) ? h('p', { className: 'sw-field-hint' }, text.online.installedPreviewHint) : null) : null)
      }

      var toolsDrawer = toolDetail ? h(Drawer, {
        title: text.tabs.tools, subtitle: toolDetail.name, icon: 'plug', closeLabel: text.close,
        onClose: function () { setToolDetail(null) },
        banner: h('div', { className: 'sw-banner' }, h(Icon, { name: 'lock' }), h('span', null, text.readOnlyNote)),
      }, h('p', { className: 'sw-tool-description' }, toolDetail.description || ''),
        toolDetail.inputSchema || toolDetail.parameters || toolDetail.schema
          ? h('pre', { className: 'sw-tool-schema sw-mono' }, JSON.stringify(toolDetail.inputSchema || toolDetail.parameters || toolDetail.schema, null, 2)) : null) : null

      return h('div', { className: 'sw-page' },
        h(StyleSheet),
        h('header', { className: 'sw-head' },
          h('div', { className: 'sw-heading' },
            h('h1', { className: 'sw-title' }, text.title),
            h('p', { className: 'sw-intro' }, text.intro)),
          h('div', { className: 'sw-toolbar' },
            h(IconButton, {
              icon: 'refresh', label: tab === 'components' ? text.components.check : text.refresh,
              disabled: state.phase === 'loading' || writing || (tab === 'components' && comp.loading),
              onClick: function () { if (tab === 'components') loadComponents(true); else load(false) },
            }),
            canCreate ? h(Button, {
              variant: 'primary', icon: 'plus', disabled: writing, title: tab === 'skills' ? text.online.addHint : text.addHint[tab],
              onClick: function () { if (tab === 'skills') openSource(null); else openDraft(tab, null) },
            }, tab === 'skills' ? text.online.add : text.add[tab]) : null)),

        h('div', { className: 'sw-body' },
          h('nav', { className: 'sw-tabs', role: 'tablist' },
            tabs.map(function (id) {
              var total = lists[id].filter(function (row) { return id !== 'skills' || row.installed !== false }).length
              // The component tab advertises pending updates instead of its row count.
              var badge = id === 'components'
                ? (comp.packages.filter(function (row) { return row.updateAvailable }).length || null)
                : (data ? total : null)
              return h('button', {
                key: id, type: 'button', role: 'tab',
                'aria-selected': tab === id ? 'true' : 'false',
                'data-active': tab === id ? 'true' : 'false',
                className: 'sw-tab',
                onClick: function () { setTab(id); setFilter('all') },
              }, text.tabs[id], badge !== null ? h('span', { className: 'sw-tab-count' }, String(badge)) : null)
            })),

          !supported[tab] ? h('div', { className: 'sw-banner sw-banner-warn' }, h(Icon, { name: 'warn' }),
            h('span', null, tab === 'components' ? text.components.unsupported : text.unsupported[tab])) : null,

          operation ? h('div', { className: 'sw-banner', role: 'status', 'aria-live': 'polite' }, h(Icon, { name: 'refresh' }), h('span', null, operation)) : null,
          state.phase === 'error' && data ? h('div', { className: 'sw-banner sw-source-error', role: 'alert' }, h(Icon, { name: 'warn' }), h('span', null, text.loadFailed + ': ' + state.error),
            h(Button, { disabled: writing, onClick: function () { load(false) } }, text.retry)) : null,

          tab !== 'components' ? h('div', { className: 'sw-filters' },
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
                { value: 'off', label: text.filter.off, count: installedRows.length - activeCount },
              ],
              onChange: setFilter,
            }),
            h('span', { className: 'sw-stats' }, text.stats(installedRows.length, activeCount)))
            : null,

          content),

        drawer, sourceDrawer, toolsDrawer,

        confirm ? h(Dialog, {
          title: confirm.kind === 'source' ? text.online.removeSourceTitle
            : confirm.kind === 'skills' && confirm.row.origin === 'online' ? text.online.uninstallTitle : text.confirmTitle[confirm.kind],
          body: confirm.kind === 'source' ? text.online.removeSourceBody(confirm.label, confirm.count)
            : confirm.kind === 'skills' && confirm.row.origin === 'online' ? text.online.uninstallBody(confirm.label) : text.confirmBody[confirm.kind](confirm.label),
          onClose: function () { if (!saving) setConfirm(null) },
          footer: [
            h(Button, { key: 'no', disabled: saving, onClick: function () { setConfirm(null) } }, text.cancel),
            h(Button, { key: 'yes', variant: 'danger', disabled: saving, onClick: remove }, saving ? text.saving
              : confirm.kind === 'source' ? text.online.removeSource
                : confirm.kind === 'skills' && confirm.row.origin === 'online' ? text.online.uninstall : text.remove),
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
      '@keyframes sw-drawer-slide{from{transform:translateX(calc(100% + 24px))}}',
      '@keyframes sw-pop{from{transform:scale(.97);opacity:0}}',

      // drawer — a docked sheet: panel surface, left border, slides in like the host's own sidebar
      '.sw-drawer-layer{padding:var(--dsh-frame-top-clearance,0px) 0 0;align-items:stretch;animation:sw-fade .2s ease-out;background:color-mix(in srgb,var(--dsw-alias-bg-mask-1,rgba(0,0,0,.36)) 30%,transparent);}',
      '.sw-drawer{display:flex;flex-direction:column;width:min(560px,100%);height:100%;overflow:hidden;background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base));border:0;border-left:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-panel,14px) 0 0 var(--dsw-radius-panel,14px);box-shadow:var(--dsw-elevation-prominent,var(--dsw-shadow-lv3,-16px 0 40px rgba(0,0,0,.16)));animation:sw-drawer-slide .26s cubic-bezier(.22,1,.36,1);}',
      '.sw-drawer-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;padding:14px 18px 13px;border-bottom:.5px solid var(--dsw-alias-border-l2);}',
      '.sw-drawer-dismiss{height:28px;padding:0 10px;font-size:12px;color:var(--dsw-alias-label-secondary);background:transparent;}',
      '.sw-drawer-dismiss:hover:not(:disabled){color:var(--dsw-alias-label-primary);}',
      '.sw-drawer-heading{flex:1;min-width:0;}',
      '.sw-drawer-title{margin:0;font-size:16px;font-weight:500;line-height:24px;}',
      '.sw-drawer-sub{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);font-family:var(--dsw-font-mono,ui-monospace,monospace);}',
      '.sw-drawer-note{margin:4px 0 0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);}',
      '.sw-drawer>.sw-banner{margin:12px 18px 0;}',
      '.sw-drawer-body{flex:1;overflow:auto;display:flex;flex-direction:column;gap:16px;padding:16px 18px 20px;overscroll-behavior:contain;}',
      '.sw-drawer-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:8px;row-gap:8px;padding:12px 18px;border-top:.5px solid var(--dsw-alias-border-l2);background:inherit;}',
      '.sw-drawer-hint{flex:none;font-size:12px;color:var(--dsw-alias-label-tertiary);margin-right:auto;}',
      '.sw-drawer-foot .sw-grow{flex:1;}',
      '@media(max-width:640px){.sw-drawer-layer{padding:var(--dsh-frame-top-clearance,0px) 0 0;}.sw-drawer{width:100%;height:100%;border-radius:0;}}',

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

      // source management uses the same controls and host theme as local lists
      '.sw-skill-section{display:flex;flex-direction:column;gap:14px;}',
      '.sw-skill-section-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px;}',
      '.sw-skill-section-actions{display:flex;align-items:center;flex-wrap:wrap;gap:6px;}',
      '.sw-skill-section-actions .sw-btn{height:28px;font-size:12px;padding:0 10px;}',
      '.sw-skill-section-title{margin:0;font-size:15px;line-height:22px;font-weight:500;color:var(--dsw-alias-label-primary);}',
      '.sw-source{display:flex;flex-direction:column;gap:10px;padding:14px 16px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xl,12px);background:var(--dsw-alias-bg-layer-1);}',
      '.sw-source-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px;}',
      '.sw-source-toggle{display:flex;flex:1;min-width:160px;align-items:center;flex-wrap:wrap;gap:8px;border:0;padding:2px 0;background:none;text-align:left;font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;}',
      '.sw-source-toggle:focus-visible{' + FOCUS + 'border-radius:4px;}',
      '.sw-source-title{font-size:14px;font-weight:500;overflow-wrap:anywhere;}',
      '.sw-source-summary{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);}',
      '.sw-source-actions{display:flex;align-items:center;flex-wrap:wrap;gap:6px;}',
      '.sw-source-actions>.sw-btn{height:28px;padding:0 10px;font-size:12px;}',
      '.sw-source-actions>.sw-btn.is-danger{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-state-error-primary);}',
      '.sw-source-actions>.sw-btn.is-danger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger,var(--dsw-alias-interactive-bg-hover));}',
      '.sw-source-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);min-width:0;}',
      '.sw-source-meta a{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;text-decoration:none;}',
      '.sw-source-meta a:hover{text-decoration:underline;}',
      '.sw-source-meta code{font:inherit;font-family:var(--dsw-font-mono,monospace);}',
      '.sw-source-status{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
      '.sw-source-status.is-error,.sw-source-error{color:var(--dsw-alias-state-error-primary);}',

      // npm components: same rows as skills, plus a version line and a skipped list
      '.sw-components{display:flex;flex-direction:column;gap:12px;}',
      '.sw-comp-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;}',
      '.sw-comp-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;}',
      '.sw-comp-meta{margin-left:auto;font-size:12px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;}',
      '.sw-comp-row{align-items:flex-start;}',
      '.sw-comp-row .sw-row-main{gap:2px;}',
      '.sw-comp-versions{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);}',
      '.sw-comp-note{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
      '.sw-comp-note-error{color:var(--dsw-alias-state-error-primary);}',
      '.sw-comp-note-ok{color:var(--dsw-alias-state-success-primary);}',
      '.sw-comp-skipped{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg,10px);padding:10px 12px;}',
      '.sw-comp-skipped>summary{cursor:pointer;font-size:13px;color:var(--dsw-alias-label-secondary);}',
      '.sw-comp-skipped>summary:focus-visible{' + FOCUS + 'border-radius:4px;}',
      '.sw-comp-skipped .sw-rows{margin-top:6px;}',
      '.sw-comp-skipped-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12px;line-height:18px;padding:4px 0;}',
      '.sw-comp-source{overflow-wrap:anywhere;color:var(--dsw-alias-label-tertiary);}',
      '@media(max-width:520px){.sw-comp-meta{margin-left:0;}}',
      '.sw-online-rows .sw-row-actions{opacity:1;gap:4px;}',
      '.sw-online-rows .sw-row-end{gap:8px;}',
      '.sw-online-rows .sw-row-actions .sw-btn{height:28px;font-size:12px;padding:0 8px;}',
      '.sw-source-input{display:flex;align-items:center;gap:8px;}',
      '.sw-source-input .sw-input{flex:1;min-width:0;}',
      '.sw-source-preview{display:flex;flex-direction:column;gap:14px;}',
      '.sw-selection-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-tertiary);}',
      '.sw-selection-toolbar>span{margin-right:auto;}',
      '.sw-selection-toolbar .sw-btn{height:28px;font-size:12px;}',
      '.sw-source-choices{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg,10px);}',
      '.sw-source-choice+ .sw-source-choice{border-top:.5px solid var(--dsw-alias-border-l2);}',
      '.sw-source-choice label{display:flex;align-items:flex-start;gap:10px;padding:12px;cursor:pointer;}',
      '.sw-source-choice input{flex:none;margin:4px 0 0;accent-color:var(--dsw-alias-state-business-primary);}',
      '.sw-source-choice input:focus-visible{' + FOCUS + '}',
      '.sw-source-choice-text{display:flex;flex-direction:column;gap:5px;min-width:0;}',
      '.sw-source-choice-title{display:flex;align-items:center;flex-wrap:wrap;gap:6px;}',
      '.sw-source-choice-title strong{font-size:13px;font-weight:500;overflow-wrap:anywhere;}',
      '.sw-source-choice-description{font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;}',
      '.sw-source-choice-warning{font-size:12px;line-height:18px;color:var(--dsw-alias-state-warn-label,var(--dsw-alias-state-warn-primary));overflow-wrap:anywhere;}',
      '.sw-page>.sw-layer{max-width:none;}',
      // A fixed overlay must not let the wheel scroll the list behind it.
      '.sw-page:has(>.sw-layer){overflow:hidden;}',
      '.sw-tool-description{margin:0;font-size:14px;line-height:22px;white-space:pre-wrap;overflow-wrap:anywhere;}',
      '.sw-tool-schema{margin:0;font-size:12px;line-height:20px;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-secondary);}',
      '@media(max-width:680px){.sw-online-rows .sw-row{flex-wrap:wrap;}.sw-online-rows .sw-row-main{flex-basis:calc(100% - 60px);}.sw-online-rows .sw-row-end{margin-left:54px;flex:1;justify-content:flex-end;}.sw-source-summary{flex-basis:100%;padding-left:24px;}.sw-page{padding-left:20px;padding-right:20px;}.sw-source{padding:12px;}}',

      // discovery keeps search results and confirmation in one modal without duplicating primary actions
      '.sw-add-drawer{width:min(720px,100%);}',
      '.sw-add-drawer .sw-drawer-body{gap:18px;padding:16px 20px 22px;}',
      '.sw-add-drawer .sw-drawer-head{padding:14px 20px 13px;}',
      '.sw-add-drawer .sw-drawer-foot{padding:12px 20px;}',
      '.sw-add-modes{display:flex;}',
      '.sw-add-modes .sw-seg{width:100%;padding:3px;gap:4px;}',
      '.sw-add-modes .sw-seg-item{flex:1;justify-content:center;height:32px;font-size:13px;}',
      // The discovery body absorbs the leftover height; an empty result set is centred instead of leaving a void.
      '.sw-discovery-pane{display:flex;flex-direction:column;flex:1;min-height:0;}',
      '.sw-discovery-pane.is-centered{justify-content:center;}',
      '.sw-add-drawer .sw-empty{border:0;background:none;padding:24px 16px;}',
      '.sw-discovery-form{margin:0;}',
      '.sw-directory-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:220px;padding:28px;text-align:center;color:var(--dsw-alias-label-tertiary);}',
      '.sw-directory-state p{max-width:100%;margin:0;font-size:13px;line-height:20px;overflow-wrap:anywhere;}',
      '.sw-directory-state.is-error{color:var(--dsw-alias-state-error-primary);}',
      '.sw-directory-results{display:flex;flex-direction:column;gap:10px;}',
      '.sw-directory-summary{display:flex;justify-content:space-between;gap:12px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);}',
      '.sw-directory-summary span:last-child{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}',
      '.sw-directory-list{display:flex;flex-direction:column;gap:10px;list-style:none;padding:0;margin:0;}',
      '.sw-directory-card{display:flex;align-items:center;gap:16px;min-width:0;padding:16px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg,10px);background:var(--dsw-alias-bg-layer-1);}',
      '.sw-directory-card:hover{border-color:var(--dsw-alias-border-l4);}',
      '.sw-directory-card-actions{display:flex;flex:none;align-items:center;gap:6px;}',
      '.sw-directory-card-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px;}',
      '.sw-directory-card-title{display:flex;align-items:center;flex-wrap:wrap;gap:8px;}',
      '.sw-directory-card-title strong{font-size:14px;font-weight:500;line-height:21px;overflow-wrap:anywhere;}',
      '.sw-directory-card-meta{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);}',
      '.sw-directory-card-meta span{overflow-wrap:anywhere;}',
      '.sw-directory-unsupported{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;}',
      '.sw-preview-back .sw-btn{height:28px;padding:0 8px;font-size:12px;border-color:transparent;background:none;color:var(--dsw-alias-label-secondary);}',
      '.sw-preview-source{display:flex;flex-direction:column;gap:8px;padding-bottom:14px;border-bottom:.5px solid var(--dsw-alias-border-l2);}',
      '.sw-preview-source-heading{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px 12px;}',
      '.sw-preview-source-heading strong{font-size:14px;font-weight:500;overflow-wrap:anywhere;}',
      '.sw-preview-source-heading>span{font-size:12px;color:var(--dsw-alias-label-tertiary);}',
      '.sw-preview-tools{display:flex;align-items:center;flex-wrap:wrap;gap:10px;}',
      '.sw-preview-tools>.sw-input{flex:1 1 240px;min-width:0;}',
      '.sw-preview-tools .sw-selection-toolbar{margin-left:auto;}',
      '.sw-source-choice{display:flex;align-items:center;gap:10px;padding-right:12px;}',
      '.sw-source-choice.is-selected{background:var(--dsw-alias-interactive-bg-hover);}',
      '.sw-source-choice:first-child{border-radius:var(--dsw-radius-lg,10px) var(--dsw-radius-lg,10px) 0 0;}',
      '.sw-source-choice:last-child{border-radius:0 0 var(--dsw-radius-lg,10px) var(--dsw-radius-lg,10px);}',
      '.sw-source-choice>label{flex:1;min-width:0;}',
      '.sw-source-choice-path{font-size:11px;line-height:17px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;}',
      '.sw-preview-update{flex:none;height:28px;font-size:12px;padding:0 8px;}',
      '.sw-add-drawer .sw-source-error>span{flex:1;min-width:0;overflow-wrap:anywhere;}',
      '.sw-add-drawer .sw-source-error>.sw-btn{flex:none;height:26px;font-size:12px;padding:0 8px;}',
      '@media(max-width:520px){.sw-add-drawer .sw-drawer-body{padding:12px 16px 18px;}.sw-add-drawer .sw-drawer-head{padding:12px 16px 11px;}.sw-add-drawer .sw-drawer-foot{padding:12px 16px;}.sw-directory-card{align-items:flex-start;flex-direction:column;gap:12px;padding:14px;}.sw-directory-card>.sw-btn{align-self:flex-end;}.sw-source-choice{flex-wrap:wrap;}.sw-preview-update{margin:0 0 10px 34px;}}',

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
      }, 'dsh-skills-center: dictionaries')

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
      name: '@local/dsh-skills-center',
      inject: ['slots', 'locale'],
      apply: apply,
    }
  },
})
