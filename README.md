# UP 进阶 · 可检查的循环

基于 [byoungd/up《人生进阶指南》](https://github.com/byoungd/up) 理念开发的桌面应用。
核心是一个**可检查的循环**：

> 诊断现状 → 选择任务 → 主动练习 → 获得反馈 → 留下证据 → 调整下一步

技术栈：**Electron + React + Vite + SQLite（better-sqlite3）**，纯本地离线运行。

## 四条强制原则（已内建于应用逻辑）

| 原则 | 实现方式 |
| --- | --- |
| 1. 不设收藏，只设执行 | 没有收藏/标记功能；每个任务页附带「证据产出框」，必须产出文本 / 截图 / 录音 / 文件证据 |
| 2. 强制单线程 | 数据库部分唯一索引保证同一时刻只有一个 `active` 目标；未完成复盘无法开启新目标 |
| 3. 数据 100% 本地 | SQLite（`up.db`）+ JSON 备份导出/导入 + 证据文件目录，全部在 `%APPDATA%/up-quest/data` |
| 4. 复盘不可跳过 | 目标开始 7 天后（或标记完成后）强制弹出复盘模板：回顾目标 → 检查证据 → 分析差距 → 调整计划，全部填写才能提交 |

## 功能模块

- **诊断模块**：内置英语 CEFR 自测问卷（听力/阅读/口语/写作/词汇语法 × A1–C2，共 30 条 can-do 陈述）；
  支持自定义工作 / AI 素养诊断（JSON 模板可扩展）；输出 SVG 雷达图报告。
- **任务模块**：依据诊断短板自动推荐 25–45 分钟可执行任务（内置 22 条任务目录），时长可改、可手动增删；
  任务页强制附带「证据产出框」。
- **证据模块**：文本记录、图片、录音（浏览器 MediaRecorder）、任意文件；自动归档到目标；按周展示证据链，复盘时逐条核对。
- **复盘模块**：内置四段式周复盘模板 + 每周能力自评（0–6），驱动长期成长轨迹折线图。
- **仪表盘**：仅显示「当前唯一任务」「待检查证据数量」「距离下次复盘倒计时」三件事，外加循环阶段指示。

## 目录结构

```
up-quest/
├── package.json               # 依赖与构建配置（electron-builder 内嵌）
├── vite.config.js             # Vite 配置（base './' 支持 file:// 加载）
├── index.html
├── electron/                  # 主进程（Node 侧）
│   ├── main.js                # 窗口 / 菜单 / 单实例 / 数据目录
│   ├── preload.js             # contextBridge 安全 API 面（window.upAPI）
│   ├── db.js                  # SQLite schema（含单线程唯一索引）
│   └── ipc.js                 # 全部业务逻辑：目标/任务/证据/复盘/诊断/备份
├── src/                       # 渲染进程（React）
│   ├── main.jsx / App.jsx     # 入口与路由（含强制复盘门、首屏诊断引导）
│   ├── api.js                 # API 通道 + 浏览器预览 localStorage mock
│   ├── styles.css             # 设计系统（极简克制，全系统字体）
│   ├── util.js                # 日期 / 倒计时 / 格式化
│   ├── data/
│   │   ├── cefr.js            # CEFR 问卷 30 条陈述
│   │   ├── taskCatalog.js     # 任务目录 + 推荐算法
│   │   └── defaultTemplate.js # 内置「工作与 AI 素养」诊断模板
│   ├── components/
│   │   ├── Icon.jsx           # 内联 SVG 图标（无 emoji）
│   │   ├── RadarChart.jsx     # 手绘 SVG 雷达图
│   │   ├── LineChart.jsx      # 成长轨迹折线图
│   │   ├── EvidenceBox.jsx    # 任务页证据产出框
│   │   ├── AudioRecorder.jsx  # 录音组件
│   │   ├── ReviewForm.jsx     # 周复盘模板（不可跳过）
│   │   └── GoalForm.jsx       # 制定目标 + 挑选推荐任务
│   └── pages/
│       ├── Onboard.jsx        # 首屏：诊断引导（CEFR → 报告 → 目标）
│       ├── Dashboard.jsx      # 仪表盘三要素
│       ├── Focus.jsx          # 本周任务 + 证据产出
│       ├── Evidence.jsx       # 按周证据链
│       ├── Review.jsx         # 复盘 + 成长轨迹
│       └── Settings.jsx       # 数据控制权
├── scripts/
│   ├── check-jsx.cjs          # 开发期 JSX 语法校验（Babel，进程内）
│   └── check-imports.cjs      # import/require 引用解析校验
├── build/
│   └── icon.png               # 512×512 应用图标（生成脚本见 README 附录）
└── USAGE.md                   # 面向最终用户的使用说明
```

## 环境要求

- Node.js 18+（建议 20/22）
- Windows 10/11（开发与打包）；macOS（如需构建 .dmg）
- 构建安装包需联网（下载 Electron 二进制与构建工具）

## 启动开发环境

```bash
# 1. 安装依赖（会自动为 Electron 重建 better-sqlite3 原生模块）
npm install

# 2. 一键启动（Vite dev server + Electron 窗口，热更新）
npm run dev

# 只预览界面（纯浏览器，数据走 localStorage mock，无 Electron 能力）
npm run dev:renderer
```

> 如果 `npm install` 期间 better-sqlite3 没有可用的预编译二进制，
> 需要本机安装 Visual Studio Build Tools（C++ 工作负载）后执行：
> ```bash
> npm run rebuild
> ```

## 打包安装包

### Windows（.exe，NSIS 安装器）

```bash
npm run dist:win
# 产物：release/UP 进阶 Setup 1.0.0.exe（双击安装；可选安装目录、生成桌面快捷方式）
```

可选：生成 `build/icon.ico`（256×256 以上）并修改 `package.json` 的 `build.win.icon`，
NSIS 安装器与任务栏图标将使用自定义图标。

### macOS（.dmg）

```bash
# 必须在 macOS 上执行（electron-builder 不支持 Windows 交叉打包 dmg）
npm run dist:mac
# 产物：release/UP 进阶-1.0.0-arm64.dmg 与 -x64.dmg（Apple Silicon / Intel）
```

### 全部平台

```bash
npm run dist        # 当前平台默认目标
```

打包前会先执行 `vite build` 产出 `dist/`，electron-builder 将
`dist/` + `electron/` + 依赖（better-sqlite3 自动解包为 asar.unpacked）打进安装包。

## 数据位置与控制权

| 内容 | 路径 |
| --- | --- |
| SQLite 数据库 | `%APPDATA%/up-quest/data/up.db` |
| 证据文件（图片/录音/文件） | `%APPDATA%/up-quest/data/evidence/` |
| 自定义诊断模板 | `%APPDATA%/up-quest/data/templates/` |

- **导出备份**：应用内「设置 → 导出备份」，生成 `up-backup-*.json` + 同名 `.evidence/` 文件夹（全部证据文件），
  两者需放在一起保管。
- **导入恢复**：应用内「设置 → 导入备份」选择该 JSON，覆盖恢复全部数据（会先清空现有数据，请先导出）。
- 菜单栏「数据」提供导出/导入/打开目录快捷键（Ctrl+Shift+E / Ctrl+Shift+I）。

## 自定义诊断模板格式

在模板目录（`%APPDATA%/up-quest/data/templates/`）新建任意 `.json` 文件：

```json
{
  "id": "my-diagnosis",
  "title": "我的诊断名称",
  "dimensions": [
    {
      "key": "dim1",
      "name": "维度名",
      "questions": ["陈述 1（按 1–5 打分）", "陈述 2", "陈述 3", "陈述 4"]
    }
  ]
}
```

每题按 1（非常不符）– 5（非常符合）打分，应用自动折算为 0–6 分参与雷达图与任务推荐。
推荐任务目录在 `src/data/taskCatalog.js`，可自行扩展（`dim` 字段与模板 `key` 对应）。

## 常见问题

- **启动报 better-sqlite3 模块错误**：`npm run rebuild`（需要 VS Build Tools）。
- **录音失败**：检查系统麦克风权限；也可改用「文件」上传录音文件。
- **无法开启新目标**：单线程约束——先完成当前目标的复盘（仪表盘/复盘页会强制弹出模板）。
- **想换电脑**：导出备份 → 新机器安装应用 → 导入备份。

## 致谢与许可

理念与内容参考：[byoungd/up](https://github.com/byoungd/up)（MIT）。
本应用 MIT 许可，欢迎按需修改；数据始终归用户所有。
