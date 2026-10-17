import { useState, useCallback } from 'react';
import { parseQbcLog } from './parseQbcLog';
import { judge, DEFAULT_CONFIG } from './judge';
import { SAMPLE_LOG } from './sample';
import type { QbcLog, JudgeResult, JudgeConfig } from './types';
import './App.css';

interface State {
  log: QbcLog;
  result: JudgeResult;
  filename: string;
}

export default function App() {
  const [state, setState] = useState<State | null>(null);
  const [config, setConfig] = useState<JudgeConfig>(DEFAULT_CONFIG);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const loadText = useCallback(
    (text: string, filename: string, cfg: JudgeConfig = config) => {
      try {
        const log = parseQbcLog(text);
        const result = judge(log, cfg);
        setState({ log, result, filename });
        setParseError(null);
      } catch (e) {
        setParseError(String(e));
      }
    },
    [config],
  );

  const loadFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => loadText(e.target?.result as string, file.name);
      reader.readAsText(file);
    },
    [loadText],
  );

  const handleConfigChange = (key: keyof JudgeConfig, raw: string) => {
    const value = key === 'overThresholdRatioLimit'
      ? Number(raw) / 100
      : Number(raw);
    if (Number.isNaN(value)) return;
    const next = { ...config, [key]: value };
    setConfig(next);
    if (state) {
      setState((s) => s && { ...s, result: judge(s.log, next) });
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>QBC Log Viewer</h1>
        <p className="subtitle">over_threshold 比率による収束判定</p>
      </header>

      <section
        className={`upload-zone${dragOver ? ' drag-over' : ''}`}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) loadFile(file);
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
      >
        <p className="upload-hint">ログファイルをドロップ</p>
        <div className="upload-buttons">
          <label className="btn btn-primary">
            ファイルを選択
            <input
              type="file"
              accept=".log,.txt"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadFile(f);
                e.target.value = '';
              }}
            />
          </label>
          <button
            className="btn btn-secondary"
            onClick={() => loadText(SAMPLE_LOG, 'sample_qbc.log')}
          >
            サンプルを読み込む
          </button>
        </div>
      </section>

      {parseError && <div className="alert alert-error">{parseError}</div>}

      {state && <Results state={state} config={config} onConfigChange={handleConfigChange} />}
    </div>
  );
}

function Results({
  state,
  config,
  onConfigChange,
}: {
  state: State;
  config: JudgeConfig;
  onConfigChange: (key: keyof JudgeConfig, raw: string) => void;
}) {
  const { log, result, filename } = state;
  const nFrames = log.meta.numeric.n_frames_per_traj;
  const limitPct = config.overThresholdRatioLimit * 100;
  const errors = result.issues.filter((i) => i.severity === 'error');
  const warns = result.issues.filter((i) => i.severity === 'warn');

  return (
    <>
      <p className="filename">{filename}</p>

      {/* 収束判定 */}
      <section className={`verdict${result.converged ? ' converged' : ' not-converged'}`}>
        <span className="verdict-icon">{result.converged ? '✓' : '✗'}</span>
        <div>
          <div className="verdict-label">{result.converged ? '収束' : '未収束'}</div>
          <div className="verdict-ratio">
            over_threshold 比率: <strong>{(result.ratio * 100).toFixed(2)}%</strong>
            &nbsp;（終了条件: &lt;{limitPct.toFixed(1)}%）
          </div>
          {!result.converged && result.convergedExcludingNaN && (
            <div className="verdict-note">
              ※ NaN 含有 traj を除外すると収束（{(result.ratioExcludingNaN * 100).toFixed(2)}%）
            </div>
          )}
          {!result.trustworthy && (
            <div className="verdict-warn">⚠ データ不整合あり — 判定値は参考値</div>
          )}
        </div>
      </section>

      {/* 集計サマリ */}
      <section className="card stats-grid">
        <Stat label="総フレーム数" value={result.sumLoaded.toLocaleString()} />
        <Stat label="over_threshold フレーム" value={result.sumOverThreshold.toLocaleString()} />
        <Stat label="比率" value={`${(result.ratio * 100).toFixed(2)}%`} />
        <Stat
          label="NaN 除外後比率"
          value={`${(result.ratioExcludingNaN * 100).toFixed(2)}%`}
        />
        <Stat label="traj 本数" value={String(log.trajs.length)} />
        <Stat label="NaN 警告" value={String(warns.filter((w) => w.kind === 'nan_detected' && w.trajId !== null).length) + ' 本'} />
      </section>

      {/* 検査結果 */}
      {result.issues.length > 0 && (
        <section className="card">
          <h2>検査結果</h2>
          {errors.length > 0 && (
            <ul className="issue-list">
              {errors.map((issue, i) => (
                <li key={i} className="issue issue-error">
                  <span className="badge">ERROR</span>
                  {issue.trajId !== null && <span className="traj-ref">traj {issue.trajId}</span>}
                  <span>{issue.detail}</span>
                </li>
              ))}
            </ul>
          )}
          {warns.length > 0 && (
            <ul className="issue-list">
              {warns.map((issue, i) => (
                <li key={i} className="issue issue-warn">
                  <span className="badge">WARN</span>
                  {issue.trajId !== null && <span className="traj-ref">traj {issue.trajId}</span>}
                  <span>{issue.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* メタ情報 */}
      <section className="card">
        <h2>メタ情報</h2>
        <dl className="meta-grid">
          {Object.entries(log.meta.raw).map(([k, v]) => (
            <div key={k} className="meta-item">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* traj テーブル */}
      <section className="card">
        <h2>トラジェクトリ一覧（{log.trajs.length} 本）</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>組成</th>
                <th>Seed</th>
                <th>Loaded</th>
                <th>Selected</th>
                <th>Over Threshold</th>
                <th>Over Limit</th>
                <th>Excluded Tail</th>
                <th>NaN</th>
              </tr>
            </thead>
            <tbody>
              {log.trajs.map((t) => {
                const ot = t.metrics.over_threshold;
                const sel = t.metrics.selected;
                const hasNaN = t.warnings.length > 0;
                const otAlert = ot !== undefined && ot.computedPercent >= limitPct;
                const selWarn = nFrames !== undefined && sel !== undefined && sel.count < nFrames;

                return (
                  <tr key={t.id} className={hasNaN ? 'row-nan' : ''}>
                    <td>{t.id}</td>
                    <td>{t.composition}</td>
                    <td>{t.seed}</td>
                    <td>{t.loaded.toLocaleString()}</td>
                    <td className={selWarn ? 'cell-warn' : ''}>
                      {sel ? `${sel.count} (${sel.reportedPercent}%)` : '—'}
                    </td>
                    <td className={otAlert ? 'cell-alert' : ''}>
                      {ot ? `${ot.count} (${ot.reportedPercent}%)` : '—'}
                    </td>
                    <td>
                      {t.metrics.over_limit
                        ? `${t.metrics.over_limit.count} (${t.metrics.over_limit.reportedPercent}%)`
                        : '—'}
                    </td>
                    <td>
                      {t.metrics.excluded_tail
                        ? `${t.metrics.excluded_tail.count} (${t.metrics.excluded_tail.reportedPercent}%)`
                        : '—'}
                    </td>
                    <td>
                      {hasNaN
                        ? `⚠ frame ${t.warnings[0].startFrame ?? '?'}〜`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 判定設定 */}
      <section className="card config-card">
        <h2>判定設定</h2>
        <div className="config-grid">
          <ConfigField
            label="終了条件の閾値 (%)"
            value={String(config.overThresholdRatioLimit * 100)}
            step="0.1"
            onChange={(v) => onConfigChange('overThresholdRatioLimit', v)}
          />
          <ConfigField
            label="期待 traj 本数"
            value={String(config.expectedTrajCount)}
            onChange={(v) => onConfigChange('expectedTrajCount', v)}
          />
          <ConfigField
            label="組成あたり seed 数"
            value={String(config.expectedSeedsPerComposition)}
            onChange={(v) => onConfigChange('expectedSeedsPerComposition', v)}
          />
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ConfigField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: string;
  step?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="config-field">
      <label>{label}</label>
      <input
        type="number"
        min={0}
        step={step ?? '1'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
