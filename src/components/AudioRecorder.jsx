import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { api, errMsg } from '../api.js';

// 录音组件：MediaRecorder → ArrayBuffer → 主进程落盘 → onSaved(meta)
export default function AudioRecorder({ onSaved, onError }) {
  const [state, setState] = useState('idle'); // idle | recording | saving
  const [sec, setSec] = useState(0);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const ext = (rec.mimeType.split(';')[0].split('/')[1] || 'webm').replace('x-', '');
        try {
          setState('saving');
          const buf = await blob.arrayBuffer();
          const meta = await api.audioSave(buf, ext);
          onSaved(meta);
        } catch (err) {
          onError(errMsg(err));
        } finally {
          setState('idle');
          setSec(0);
        }
      };
      recRef.current = rec;
      rec.start();
      setState('recording');
      setSec(0);
      timerRef.current = setInterval(() => setSec((s) => s + 1), 1000);
    } catch {
      onError('无法访问麦克风：请检查系统录音权限，或改用「文件」上传录音。');
    }
  };

  const stop = () => {
    clearInterval(timerRef.current);
    recRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');

  return (
    <div className="flex">
      {state === 'idle' && (
        <button type="button" className="btn btn-sm" onClick={start} disabled={state === 'saving'}>
          <Icon name="mic" size={14} /> 开始录音
        </button>
      )}
      {state === 'recording' && (
        <button type="button" className="btn btn-sm btn-danger" onClick={stop}>
          <Icon name="stop" size={14} /> 停止（{mm}:{ss}）
        </button>
      )}
      {state === 'saving' && <span className="muted" style={{ fontSize: 12.5 }}>保存录音中…</span>}
    </div>
  );
}
