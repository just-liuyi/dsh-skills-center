# @local/dsh-skills-center · 技能中心

左侧栏入口，一个面板管三类东西：**Skill**、**MCP 服务器**、**提示词注入**。改动即时生效，不用回到对话里让助手代劳。

## 用法

安装后在左侧栏出现「技能中心」图标（在「VibeDev 更新」下方）。点开是三个标签页：

| 标签 | 能做什么 | 数据落在哪 |
|---|---|---|
| Skill | 列出、搜索、编辑、启停、删除（**不在面板里新建**，Skill 由磁盘目录决定） | `<dshHome>/skills/<name>/SKILL.md`，`~/.agents/skills` 同样可写；项目与内置技能只读 |
| MCP | 新建、编辑、删除服务器、启停；其他插件已启用的服务器只读列出 | 本 bundle 的 `dsh-switch-mcp` group 行，经 `configEditor` 写成 profile patch 覆盖 |
| 提示词 | 新建、编辑、启停、删除，按顺序注入系统提示词 | `<dshHome>/dsh-skills-center/store.json` |

`dshHome` 默认是 `~/.dsh`，跟随 `DSH_HOME`。

### 新建入口

- 只有 **MCP** 与 **提示词** 能新建；Skill 交给磁盘目录或 Agent 去创建，面板只负责查看、启停、编辑、删除。
- 「新建」按钮固定在面板右上角工具栏，空列表时也在那儿；空状态只留图标、标题和一句说明，不再出现第二个按钮，所以整页始终只有一个新建入口。
- 新建相关的界面沿用面板自己的排版：13/14px 字号、同款 40px 图标块、同款 32px 按钮与输入框，没有另起一套样式。
- 快捷键 `N` 在当前标签页打开新建抽屉（Skill 页无效），`/` 聚焦搜索；两者在输入框里都不拦截。
- 抽屉标题下有一行说明，写清保存后会发生什么（MCP：立即连接、工具前缀形状；提示词：按原文注入）。

### 提示词注入的位置

每个启用的条目注册成一条独立的系统提示词段落（section），`order: 9200`，在本机实测的位置是：

```
harness:identity → deployment:persona-prefix → tool:bridge-browser → tool:dsh-vibedev
→ mcp-resource-servers → ui:deliverable-file-references → [skills-center:prompt:<id>]
→ harness:source → app:web-surface → deployment:persona-suffix
```

也就是落在工具说明、交付物引用之后，harness 来源与 persona 后缀之前。注入文本按字面保留，不做 `{{变量}}` 插值（`interpolate: false`），正文里的花括号或 `${...}` 不会让装配失败——这两点都用宿主自己的 `systemPrompt.assemble()` 实测过。

它进的是**系统提示词**，不是对话消息：面板里启用后，下一个模型请求就会带上；关掉开关，段落立刻从装配结果里消失（`assemble()` 里不再有 `skills-center:prompt:*`）。面板行上的「注入中」标签就是宿主返回的 `applied` 字段。

## 实现范式

面板参照 cc-switch 的分层，而不是把功能塞进一个组件：

1. **视图不碰后端。** 所有读取和写入都走一层 `call(action, payload)`，落到宿主 `POST /dsh-skills-center/rpc`。客户端不引用任何 Harness Client 包，只用 `react` 与主题变量。
2. **三类实体共用一副骨架。** 搜索框、计数条、列表行、全屏编辑层、确认弹窗、写锁各自只有一份实现，Skills / MCP / Prompts 只是同一套行组件换了字段。
3. **写锁串行化。** `beginWrite` 用 ref + state 双写，避免连点两次都放行；每次写完后安静重载列表。
4. **删除要二次确认。** 删除走确认弹窗，启停不需要。
5. **全屏编辑层处理窗口级问题。** 固定遮罩、滚动锁、ESC 让路（输入框内不拦截）、点击遮罩关闭。

## 宿主 API

`POST /dsh-skills-center/rpc`，body 为 `{action, payload}`，应答 `{ok, value}` 或 `{ok:false, error}`。路由只接受同源 loopback 请求。

| action | 说明 |
|---|---|
| `catalog` | 一次取回三类列表 |
| `skill.detail` / `skill.save` / `skill.remove` / `skill.setInvocation` | Skill 读写与启停 |
| `mcp.save` / `mcp.remove` / `mcp.setEnabled` | 本面板管理的 MCP 条目 |
| `mcp.setExternalEnabled` | 切换其他插件声明的 MCP 条目 |
| `prompt.save` / `prompt.remove` / `prompt.setEnabled` | 提示词与 section 重新注册 |
| `diagnostics` | 只读诊断：当前提示词 section 名与浏览器 bundle 路径 |

## 设计取舍

- **Skill 用磁盘扫描而非只查注册表。** 本 profile 的 `skill-filesystem` 注册在 preset 作用域，根作用域读不到用户目录；面板合并「注册表 + 项目根 + 用户根」，后者才能编辑。
- **MCP 走 `configEditor` 而不是自己连服务器。** 每条服务器就是一棵正常的 `@deepseek-ai/dsh-mcp-client` 行，宿主负责连接、工具注册与卸载，面板只改配置。
- **停用的外部 MCP 行不列出。** 此时 Loader 里没有对应 entry，`configEditor` 也看不到；它们仍在「插件」页可见。

## 已知限制

- 编辑 Skill 只改 `<name>/SKILL.md` 的 frontmatter 与正文，不改 `references/` 等资源目录。
- MCP 的 `args` 以空格切分，参数本身含空格时请改用支持的位置写法。
- 外部 MCP 条目只能切换启停，不能在这里改配置。
