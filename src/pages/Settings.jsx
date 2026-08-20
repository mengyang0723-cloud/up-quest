import React, { useEffect, useState } from 'react';
import { api, errMsg, isPreview } from '../api.js';
import Icon from '../components/Icon.jsx';

export default function Settings({ ctx }) {
  const { setError } = ctx;
  const [info, setInfo] = useState(null);
  const [result, setResult] = useState('');
  const [templateCount, setTemplateCount] = useState(0);

  const load = async () => {
    try {
      setInfo(await api.info());
      const ts = await api.templatesList();
      setTemplateCount(ts.length);
    } catch (err) { setError(errMsg(err)); }
  };
  useEffect(() => { load(); }, []);

  const doExport = async () => {
    setResult('');
    try {
      const r = await api.exportData();
      if (r.canceled) return;
      const sum = Object.entries(r.counts).map(([k, v]) => `${k} ${v} 条`).join('，');
      setResult(`已导出：${r.path}\n证据文件：${r.evidenceDir}\n内容：${sum}`);
    } catch (err) { setError(errMsg(err)); }
  };

  const doImport = async () => {
    if (!window.confirm('导入将覆盖当前全部数据（任务、证据、复盘）。确定继续？')) return;
    setResult('');
    try {
      const r = await api.importData();
      if (r.canceled) return;
      const sum = Object.entries(r.counts).map(([k, v]) => `${k} ${v} 条`).join('，');
      setResult(`已导入：${r.path}\n内容：${sum}`);
      ctx.reload();
    } catch (err) { setError(errMsg(err)); }
  };

  return (
    <div>
      <div className="page-head">
        <h1>设置</h1>
        <p>所有数据 100% 本地存储（SQLite + JSON），你拥有完整控制权。</p>
      </div>

      <div className="card">
        <div className="card-title"><Icon name="folder" size={15} /> 数据位置</div>
        <p className="card-sub">数据库、证据文件与自定义诊断模板都在这一个目录下：</p>
        {info && (
          <>
            <div className="path-line">数据库：{info.dbPath}</div>
            <div className="path-line">证据：{info.evidenceDir}</div>
            <div className="path-line">模板：{info.templatesDir}</div>
          </>
        )}
        <div className="flex mt16" style={{ gap: 8 }}>
          <button className="btn btn-sm" onClick={() => api.openDir('data')}>打开数据目录</button>
          <button className="btn btn-sm" onClick={() => api.openDir('evidence')}>打开证据目录</button>
          <button className="btn btn-sm" onClick={() => api.openDir('templates')}>打开模板目录</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title"><Icon name="refresh" size={15} /> 备份与恢复</div>
        <p className="card-sub">
          导出会生成一个 JSON 备份文件，并连同证据文件复制为同名 .evidence 文件夹；请把两者放在一起保管。
          导入时选择该 JSON 即可完整恢复。
        </p>
        <div className="setting-row" style={{ border: 'none', paddingBottom: 4 }}>
          <div>
            <div className="s-title">导出全部数据</div>
            <div className="s-desc">数据库全部表格 + 全部证据文件 → JSON 备份 + 证据文件夹</div>
          </div>
          <div className="s-actions">
            <button className="btn btn-sm btn-primary" onClick={doExport}><Icon name="refresh" size={13} /> 导出备份</button>
          </div>
        </div>
        <div className="setting-row" style={{ border: 'none' }}>
          <div>
            <div className="s-title">导入备份</div>
            <div className="s-desc">⚠ 导入会覆盖当前全部数据，请先导出当前数据</div>
          </div>
          <div className="s-actions">
            <button className="btn btn-sm btn-danger" onClick={doImport}><Icon name="folder" size={13} /> 导入恢复</button>
          </div>
        </div>
        {result && <div className="result-note" style={{ whiteSpace: 'pre-wrap' }}>{result}</div>}
      </div>

      <div className="card">
        <div className="card-title"><Icon name="doc" size={15} /> 自定义诊断模板</div>
        <p className="card-sub">
          把 JSON 模板文件放进模板目录即可使用（当前 {templateCount} 个自定义模板）。
          格式：{'{ "id": "my", "title": "名称", "dimensions": [ { "key": "dim1", "name": "维度名", "questions": ["陈述1","陈述2",...] } ] }'}
          ，每题按 1–5 打分，自动折算为 0–6 分。
        </p>
        <button className="btn btn-sm" onClick={() => api.openDir('templates')}>打开模板目录</button>
      </div>

      <div className="card">
        <div className="card-title"><Icon name="loop" size={15} /> 关于</div>
        <p className="card-sub">
          UP 进阶 · 可检查的循环 —— 理念源自 <a className="accent-link" href="https://github.com/byoungd/up" target="_blank" rel="noreferrer">byoungd/up《人生进阶指南》</a>。
        </p>
        <div className="setting-row" style={{ border: 'none', paddingBottom: 4 }}>
          <div>
            <div className="s-title">版本 {info?.version || '—'}</div>
            <div className="s-desc">Electron + React + SQLite · 离线运行 · 无任何网络上传</div>
          </div>
        </div>
        {isPreview && (
          <div className="result-note">当前为浏览器预览模式：数据仅存在 localStorage，录音/文件证据不可用。请运行 Electron 版本获得完整功能。</div>
        )}
      </div>
    </div>
  );
}
