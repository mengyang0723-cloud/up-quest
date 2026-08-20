import React, { useCallback, useEffect, useState } from 'react';
import { api, errMsg, isPreview } from '../api.js';
import Icon from './Icon.jsx';
import AudioRecorder from './AudioRecorder.jsx';
import { fmtDateTime, KIND_LABEL } from '../util.js';

const KIND_ICON = { text: 'paper', image: 'image', audio: 'mic', file: 'file' };

// 任务页面的「证据产出框」：文本 / 图片 / 录音 / 文件，全部落库归档
export default function EvidenceBox({ focusId, taskId }) {
  const [items, setItems] = useState(null);
  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState(null); // { name, relPath, size, kind }
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const rows = await api.evidenceList(focusId, taskId);
      setItems(rows);
    } catch (err) { setError(errMsg(err)); }
  }, [focusId, taskId]);

  useEffect(() => { load(); }, [load]);

  const addText = async () => {
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    try {
      await api.evidenceAdd({ taskId, focusId, kind: 'text', content, file: null });
      setText('');
      await load();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const pick = async (kinds, kind) => {
    try {
      const r = await api.dialogPickFiles(kinds);
      if (r.canceled || !r.files.length) return;
      const f = r.files[0];
      setPendingFile({ ...f, kind });
      setCaption(f.name);
    } catch (err) { setError(errMsg(err)); }
  };

  const submitFile = async () => {
    if (!pendingFile) return;
    setBusy(true);
    try {
      await api.evidenceAdd({ taskId, focusId, kind: pendingFile.kind, content: caption.trim(), file: pendingFile });
      setPendingFile(null);
      setCaption('');
      await load();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    try { await api.evidenceDelete(id); await load(); } catch (err) { setError(errMsg(err)); }
  };

  const open = async (id) => {
    try { await api.evidenceOpen(id); } catch (err) { setError(errMsg(err)); }
  };

  const markChecked = async (ev, checked) => {
    try { await api.evidenceSetChecked([ev.id], checked); await load(); } catch (err) { setError(errMsg(err)); }
  };

  return (
    <div className="evidence-box">
      <div className="evidence-box-head">
        <Icon name="check" size={13} />
        证据产出框 —— 完成任务必须留下可检查的证据
      </div>
      <div className="ev-input-row">
        <textarea
          className="textarea"
          placeholder="记录产出：听写稿、摘要、截图说明、复盘文字……（文本即证据）"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="文本证据"
        />
        <button className="btn btn-primary" onClick={addText} disabled={busy || !text.trim()}>提交</button>
      </div>
      <div className="ev-buttons mt8">
        <button className="btn btn-sm" onClick={() => pick(['image'], 'image')}><Icon name="image" size={14} /> 图片</button>
        <AudioRecorder
          onSaved={(meta) => api.evidenceAdd({ taskId, focusId, kind: 'audio', content: `录音 ${fmtDateTime(new Date().toISOString())}`, file: meta }).then(load).catch((e) => setError(errMsg(e)))}
          onError={setError}
        />
        <button className="btn btn-sm" onClick={() => pick(['audio', 'file'], 'file')}><Icon name="file" size={14} /> 文件</button>
      </div>

      {pendingFile && (
        <div className="ev-pending">
          <Icon name="file" size={14} />
          <span className="mono" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingFile.name}</span>
          <input
            className="input"
            placeholder="说明（可选，如：第 3 遍跟读录音）"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button className="btn btn-sm btn-primary" onClick={submitFile} disabled={busy}>归档为证据</button>
          <button className="btn-icon" onClick={() => setPendingFile(null)} aria-label="取消"><Icon name="x" size={14} /></button>
        </div>
      )}

      {error && <p className="danger-text" style={{ fontSize: 12.5, margin: '8px 0 0' }}>{error}</p>}

      {items && items.length > 0 && (
        <div className="ev-list">
          {items.map((ev) => (
            <div key={ev.id} className="ev-item">
              <span className="ev-kind"><Icon name={KIND_ICON[ev.kind] || 'paper'} size={15} /></span>
              <div className="ev-content">
                {ev.content && <div className="ev-text">{ev.content}</div>}
                {ev.file_name && (
                  <button className="ev-file" onClick={() => open(ev.id)} title="用系统默认程序打开">
                    <Icon name="external" size={12} /> {ev.file_name}
                    <span className="ev-time">{ev.file_size ? `${(ev.file_size / 1024).toFixed(0)} KB` : ''}</span>
                  </button>
                )}
                <span className="ev-time">{fmtDateTime(ev.created_at)} · {KIND_LABEL[ev.kind]}</span>
              </div>
              <div className="ev-meta">
                <input
                  className="checkbox"
                  type="checkbox"
                  checked={!!ev.checked}
                  onChange={(e) => markChecked(ev, e.target.checked)}
                  aria-label="标记为已检查"
                  title="复盘中已检查"
                />
                <button className="btn-icon" onClick={() => remove(ev.id)} aria-label="删除证据"><Icon name="trash" size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
