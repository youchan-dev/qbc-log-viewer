import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// File: src/main.tsx （末尾に追記）

import { parseQbcLog } from './parseQbcLog.ts';
import { SAMPLE_LOG } from './sample.ts';

const log = parseQbcLog(SAMPLE_LOG);

const sumLoaded = log.trajs.reduce((acc, t) => acc + t.loaded, 0);
const sumOverThreshold = log.trajs.reduce(
  (acc, t) => acc + (t.metrics.over_threshold?.count ?? 0),
  0
);

console.log('traj 数:', log.trajs.length);
console.log('sumLoaded:', sumLoaded);
console.log('sumOverThreshold:', sumOverThreshold);
console.log('比率:', ((sumOverThreshold / sumLoaded) * 100).toFixed(2) + '%');
console.log('パースできなかった行:', log.unparsedLines);
console.table(
  log.trajs.map((t) => ({
    id: t.id,
    組成: t.composition,
    seed: t.seed,
    selected: t.metrics.selected?.count,
    over_threshold: t.metrics.over_threshold?.count,
    警告: t.warnings.length,
  }))
);

// File: src/main.tsx （さらに末尾に追記）

import { judge, DEFAULT_CONFIG } from './judge';

const result = judge(log, DEFAULT_CONFIG);

console.log('=== 判定 ===');
console.log('比率:', (result.ratio * 100).toFixed(2) + '%');
console.log('終了条件:', result.converged ? '終了' : '続行');
console.log(
  'NaN除外時:',
  (result.ratioExcludingNaN * 100).toFixed(2) + '%',
  result.convergedExcludingNaN ? '(終了)' : '(続行)'
);
console.log('判定値は信頼できるか:', result.trustworthy);
console.table(result.issues);
