// 可执行任务目录：每个任务 25–45 分钟，必须有明确产出（证据）。
// dim: 对应诊断维度；levelMin/levelMax: 适用水平（0=任意）；kinds: 预期证据类型
export const CATALOG = [
  // —— 英语（CEFR） ——
  { id: 'cefr-ls-01', dim: 'listening', levelMin: 0, levelMax: 2, minutes: 30, kinds: ['text', 'image'],
    title: '慢速英语逐句听写',
    detail: '选一段 1 分钟慢速英语音频（新闻/对话均可），逐句暂停听写。完成后对照原文用红笔标出错处，写下 3 个新的生词。' },
  { id: 'cefr-ls-02', dim: 'listening', levelMin: 2, levelMax: 3, minutes: 30, kinds: ['text'],
    title: 'BBC 6 Minute English 精听',
    detail: '听一期 6 分钟节目，第一遍抓大意，第二遍记 5 个要点，第三遍听写 30 秒最难片段。产出：要点笔记 + 听写稿。' },
  { id: 'cefr-ls-03', dim: 'listening', levelMin: 4, levelMax: 6, minutes: 40, kinds: ['text'],
    title: 'TED 演讲精听 + 结构复述',
    detail: '选一段 8–10 分钟 TED 演讲，精听并写出演讲的三段式结构（观点→论证→结论）与 5 个关键论据。' },
  { id: 'cefr-rd-01', dim: 'reading', levelMin: 0, levelMax: 2, minutes: 30, kinds: ['text', 'image'],
    title: '分级读物精读 + 摘要',
    detail: '读 5–8 页分级读物，查 5 个生词并造 2 个句子；用中文写一段 80 字摘要，最后用英文写 3 个句子概括。' },
  { id: 'cefr-rd-02', dim: 'reading', levelMin: 2, levelMax: 4, minutes: 40, kinds: ['text'],
    title: '英文文章精读 + 观点提取',
    detail: '读一篇 800–1200 词英文文章，提取作者的核心观点、两个论据和一处你不同意的地方（附理由）。' },
  { id: 'cefr-rd-03', dim: 'reading', levelMin: 4, levelMax: 6, minutes: 45, kinds: ['text'],
    title: '专业文献阅读 + 批判笔记',
    detail: '读一篇与你工作/专业相关的英文文献，写出：研究问题、方法、结论、你发现的一个漏洞或疑问。' },
  { id: 'cefr-sp-01', dim: 'speaking', levelMin: 0, levelMax: 3, minutes: 30, kinds: ['audio'],
    title: '影子跟读 Shadowing（录音）',
    detail: '选一段 1 分钟慢速对话，跟读 3 遍，第 4 遍录音。产出：录音文件，回听并写下 2 个发音问题。' },
  { id: 'cefr-sp-02', dim: 'speaking', levelMin: 2, levelMax: 4, minutes: 35, kinds: ['audio'],
    title: '自问自答 3 分钟（录音）',
    detail: '围绕本周主题（如“我最近学到的一件事”）自问 3 个问题并各答 1 分钟，全程录音。回听，挑 1 句改写得更地道。' },
  { id: 'cefr-sp-03', dim: 'speaking', levelMin: 4, levelMax: 6, minutes: 40, kinds: ['audio'],
    title: '观点演讲 + 反驳练习（录音）',
    detail: '选一个争议话题，先录 3 分钟立场陈述，再录 2 分钟反驳自己。产出：两段录音 + 一段文字反思。' },
  { id: 'cefr-wr-01', dim: 'writing', levelMin: 0, levelMax: 2, minutes: 30, kinds: ['text'],
    title: '100 词主题写作',
    detail: '写一篇 100 词英文短文（今天最想记录的一件事）。写完后用 AI 或词典检查，标注 3 处可改进的表达。' },
  { id: 'cefr-wr-02', dim: 'writing', levelMin: 2, levelMax: 4, minutes: 40, kinds: ['text'],
    title: '150 词观点短文',
    detail: '就一个与你相关的话题写 150 词观点短文（开头观点 + 两个论据 + 结尾）。产出：成稿 + 自查清单。' },
  { id: 'cefr-wr-03', dim: 'writing', levelMin: 4, levelMax: 6, minutes: 45, kinds: ['text'],
    title: '邮件/报告改写',
    detail: '把一封真实的工作邮件或一份报告改写成更正式、更清晰的英文版本，保留原意，注明 3 处关键改写。' },
  { id: 'cefr-vb-01', dim: 'vocab', levelMin: 0, levelMax: 6, minutes: 25, kinds: ['image'],
    title: '生词卡 50 词（截图存档）',
    detail: '用 Anki / 欧路词典整理 50 个生词卡（含例句），完成后截图记录学习数据。产出：截图证据。' },
  { id: 'cefr-vb-02', dim: 'vocab', levelMin: 2, levelMax: 6, minutes: 30, kinds: ['text'],
    title: '搭配摘抄 + 造句',
    detail: '从本周读到的材料中摘抄 10 个地道搭配（verb+noun / adj+noun），各造一个自己的句子。' },

  // —— 工作 / AI 素养（自定义诊断） ——
  { id: 'wk-tools-01', dim: 'tools', levelMin: 0, levelMax: 6, minutes: 35, kinds: ['image', 'text'],
    title: '把一项重复工作做成清单/脚本',
    detail: '选一项你每周重复做的工作，把它整理成可复用的清单（或简单的脚本/模板）。产出：清单文件或截图。' },
  { id: 'wk-tools-02', dim: 'tools', levelMin: 0, levelMax: 6, minutes: 30, kinds: ['image'],
    title: '快捷键改造：记录并截图',
    detail: '学习 5 个你常用软件的高频快捷键并实际使用 20 分钟，记录前后操作耗时对比。产出：对比记录截图。' },
  { id: 'wk-ai-01', dim: 'ai', levelMin: 0, levelMax: 6, minutes: 35, kinds: ['text'],
    title: '提示词实验：5 种风格对比',
    detail: '用同一个任务（如写周报、写邮件）向 AI 提出 5 种不同风格的提示词，记录输出差异与你的选择理由。' },
  { id: 'wk-ai-02', dim: 'ai', levelMin: 0, levelMax: 6, minutes: 40, kinds: ['text', 'file'],
    title: '用 AI 完成一次真实工作产出',
    detail: '用 AI 完成一份真实的工作产出（报告初稿/PPT 大纲/数据分析），并人工修订。产出：修订前后对比。' },
  { id: 'wk-search-01', dim: 'search', levelMin: 0, levelMax: 6, minutes: 30, kinds: ['text'],
    title: '深度检索一个专业问题',
    detail: '选一个工作中的专业问题，用 3 种以上检索方式（搜索、文档站、问答、论文）找到答案，整理来源清单。' },
  { id: 'wk-data-01', dim: 'data', levelMin: 0, levelMax: 6, minutes: 40, kinds: ['file', 'image'],
    title: '用表格做一次小分析',
    detail: '把一周的工作/学习数据录入表格，做 2 个透视或图表，写出 3 条结论。产出：表格/图表文件或截图。' },
  { id: 'wk-write-01', dim: 'writing2', levelMin: 0, levelMax: 6, minutes: 40, kinds: ['text'],
    title: '把一段口头汇报改写成书面文档',
    detail: '把一段口头汇报（或想法）改写成结构清晰的书面文档：结论先行 + 要点 + 证据。产出：成稿。' },
  { id: 'wk-write-02', dim: 'writing2', levelMin: 0, levelMax: 6, minutes: 35, kinds: ['text'],
    title: '写作瘦身：删掉 30% 字数',
    detail: '取一篇你写过的 500 字以上文档，删掉 30% 字数且不损失信息。产出：原文 + 精简版对照。' },
];

// 依据诊断结果推荐任务：短板维度优先，命中水平区间，最多 limit 条
export function recommend(scores, limit = 5) {
  const out = [];
  const used = new Set();
  const low = Object.entries(scores)
    .filter(([, v]) => Number(v) < 4)
    .sort((a, b) => a[1] - b[1]);
  for (const [dim, score] of low) {
    const level = Math.max(0, Math.ceil(Number(score)));
    const cands = CATALOG.filter(
      (t) => t.dim === dim && level >= t.levelMin && level <= t.levelMax && !used.has(t.id)
    );
    for (const t of cands.slice(0, 2)) {
      out.push(t);
      used.add(t.id);
      if (out.length >= limit) return out;
    }
    if (out.length >= limit) return out;
  }
  // 无短板时给通用任务兜底
  if (!out.length) {
    for (const t of CATALOG) {
      if (t.levelMin === 0 && !used.has(t.id)) {
        out.push(t);
        used.add(t.id);
        if (out.length >= limit) break;
      }
    }
  }
  return out;
}
