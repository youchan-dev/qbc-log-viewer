// File: src/judge.ts

import type { QbcLog, JudgeConfig, JudgeResult, Issue } from './types';

/** 設定の既定値。UI から上書きできるようにしておく */
export const DEFAULT_CONFIG: JudgeConfig = {
    overThresholdRatioLimit: 0.01,       // 1%
    expectedTrajCount: 100,              // 25組成 × 4 seed
    expectedSeedsPerComposition: 4,
};

/** traj から指定メトリックの count を安全に取り出す */
function metricCount(
    traj: QbcLog['trajs'][number],
    name: string
): number {
    return traj.metrics[name]?.count ?? 0;
}

/**
 * 判定と検査をまとめて行う純粋関数。
 * 外部の状態を読まず、引数だけで結果が決まる。
 */
export function judge(
    log: QbcLog,
    config: JudgeConfig = DEFAULT_CONFIG
): JudgeResult {
    const issues: Issue[] = [];
    const { trajs } = log;

    // ========== 1. 判定本体 ==========
    const sumLoaded = trajs.reduce((acc, t) => acc + t.loaded, 0);
    const sumOverThreshold = trajs.reduce(
        (acc, t) => acc + metricCount(t, 'over_threshold'),
        0
    );
    const ratio = sumLoaded === 0 ? 0 : sumOverThreshold / sumLoaded;
    const converged = ratio < config.overThresholdRatioLimit;

    // ========== 2. NaN 含有 traj を除いた参考値 ==========
    // NaN フレームは inf 置換されるため必然的に over_threshold に計上される。
    // 「物理的な不確かさ」由来か「計算破綻」由来かを分離するための指標。
    const cleanTrajs = trajs.filter((t) => t.warnings.length === 0);
    const cleanLoaded = cleanTrajs.reduce((acc, t) => acc + t.loaded, 0);
    const cleanOver = cleanTrajs.reduce(
        (acc, t) => acc + metricCount(t, 'over_threshold'),
        0
    );
    const ratioExcludingNaN = cleanLoaded === 0 ? 0 : cleanOver / cleanLoaded;
    const convergedExcludingNaN =
        ratioExcludingNaN < config.overThresholdRatioLimit;

    // ========== 3. 検査：判定値の信頼性 ==========

    // 3-1. traj 本数
    if (trajs.length !== config.expectedTrajCount) {
        issues.push({
            kind: 'traj_count_mismatch',
            severity: 'error',
            trajId: null,
            detail: `traj が ${trajs.length} 本（期待 ${config.expectedTrajCount} 本）。ジョブ落ちか集計漏れの可能性`,
        });
    }

    // 3-2. traj id の重複
    const idCounts = new Map<number, number>();
    for (const t of trajs) {
        idCounts.set(t.id, (idCounts.get(t.id) ?? 0) + 1);
    }
    for (const [id, count] of idCounts) {
        if (count > 1) {
            issues.push({
                kind: 'duplicate_traj_id',
                severity: 'error',
                trajId: id,
                detail: `traj ${id} が ${count} 回出現。ログの二重連結を疑う`,
            });
        }
    }

    // 3-3. 組成ごとの seed 数
    const byComposition = new Map<number | string, Set<string>>();
    for (const t of trajs) {
        if (!byComposition.has(t.composition)) {
            byComposition.set(t.composition, new Set());
        }
        byComposition.get(t.composition)!.add(t.seed);
    }
    for (const [comp, seeds] of byComposition) {
        if (seeds.size !== config.expectedSeedsPerComposition) {
            issues.push({
                kind: 'seed_missing',
                severity: 'error',
                trajId: null,
                detail: `組成 ${comp} の seed が ${seeds.size} 本（期待 ${config.expectedSeedsPerComposition} 本）: ${[...seeds].sort().join(', ')}`,
            });
        }
    }

    // 3-4 〜 3-6. traj 単位の検査
    const nFrames = log.meta.numeric.n_frames_per_traj;

    for (const t of trajs) {
        // loaded ≠ expected（ログ欠損・書き出し途中）
        if (t.loaded !== t.expected) {
            issues.push({
                kind: 'loaded_expected_mismatch',
                severity: 'error',
                trajId: t.id,
                detail: `loaded=${t.loaded} / expected=${t.expected}。読み込み不完全`,
            });
        }

        // NaN 警告
        for (const w of t.warnings) {
            issues.push({
                kind: 'nan_detected',
                severity: 'warn',
                trajId: t.id,
                detail:
                    w.startFrame !== null
                        ? `frame ${w.startFrame} 以降で NaN。力の発散を疑う`
                        : 'NaN 警告あり',
            });
        }

        // パーセントの再計算値とログ値の乖離
        for (const [name, m] of Object.entries(t.metrics)) {
            if (m.mismatch) {
                issues.push({
                    kind: 'percent_mismatch',
                    severity: 'warn',
                    trajId: t.id,
                    detail: `${name}: ログ ${m.reportedPercent}% / 再計算 ${m.computedPercent.toFixed(2)}%`,
                });
            }
        }

        // selected が目標本数に届いていない（tail 除外で候補が枯渇）
        if (nFrames !== undefined) {
            const selected = metricCount(t, 'selected');
            if (selected < nFrames) {
                issues.push({
                    kind: 'selected_shortfall',
                    severity: 'warn',
                    trajId: t.id,
                    detail: `selected=${selected}（目標 ${nFrames}）。tail 除外で候補が枯渇。構造破綻の可能性`,
                });
            }
        }
    }

    // 突合できなかった警告
    for (const w of log.orphanWarnings) {
        issues.push({
            kind: 'nan_detected',
            severity: 'warn',
            trajId: null,
            detail: `traj に紐付かない警告: ${w.message}`,
        });
    }

    // error が1件でもあれば、判定値は参考値として扱うべき
    const trustworthy = !issues.some((i) => i.severity === 'error');

    return {
        sumLoaded,
        sumOverThreshold,
        ratio,
        converged,
        ratioExcludingNaN,
        convergedExcludingNaN,
        issues,
        trustworthy,
    };
}
