// File: src/types.ts

/** ログ冒頭の "# key: value" メタ行 */
export interface QbcMeta {
    /** 既知・未知を問わず全て保持（将来のパラメータ追加に耐えるため） */
    raw: Record<string, string>;
    /** 数値として解釈できたものだけを別途保持 */
    numeric: Record<string, number>;
}

/** "name=X/Y (p%)" 形式の1メトリック */
export interface Metric {
    /** 分子 */
    count: number;
    /** 分母（基本は loaded と一致） */
    total: number;
    /** ログに書かれていたパーセント値 */
    reportedPercent: number;
    /** count/total から再計算した値 */
    computedPercent: number;
    /** 両者が乖離している（丸め誤差を超える）場合 true */
    mismatch: boolean;
}

/** 1 traj 行 */
export interface TrajRecord {
    id: number;
    path: string;
    /** パス末尾から2番目のディレクトリ名（例: K10Cl2OH8water56） */
    composition: string;
    /** パス末尾から1番目のディレクトリ名（例: seed_0） */
    seed: string;
    loaded: number;
    expected: number;
    /** selected / over_threshold / over_limit / excluded_tail / 未知キーも含む */
    metrics: Record<string, Metric>;
    /** 突合済みの警告（0件なら正常） */
    warnings: QbcWarning[];
}

/** "# WARNING: ..." 行。文面はパースせず原文保持 */
export interface QbcWarning {
    trajId: number | null;
    path: string | null;
    /** 判明すれば NaN 開始フレーム番号 */
    startFrame: number | null;
    /** 行全体の原文 */
    message: string;
}

/** パース結果全体 */
export interface QbcLog {
    meta: QbcMeta;
    trajs: TrajRecord[];
    /** traj に紐付かなかった警告 */
    orphanWarnings: QbcWarning[];
    /** パーサが解釈できなかった行（行番号付きで保持） */
    unparsedLines: { lineNo: number; text: string }[];
}

/* ===== 判定 ===== */

export interface JudgeConfig {
    /** 終了条件の閾値。既定 0.01 */
    overThresholdRatioLimit: number;
    /** 期待される traj 総数。既定 100（25組成 × 4 seed） */
    expectedTrajCount: number;
    /** 1組成あたりの期待 seed 数。既定 4 */
    expectedSeedsPerComposition: number;
}

export type IssueKind =
    | 'traj_count_mismatch'      // traj 本数が期待値と不一致
    | 'seed_missing'             // 組成内の seed 欠落
    | 'duplicate_traj_id'        // traj id の重複
    | 'loaded_expected_mismatch' // loaded ≠ expected
    | 'nan_detected'             // NaN 警告あり
    | 'percent_mismatch'         // 再計算値とログ値の乖離
    | 'selected_shortfall';      // selected が n_frames_per_traj 未満

export interface Issue {
    kind: IssueKind;
    severity: 'error' | 'warn';
    /** 該当 traj（全体に関わる場合は null） */
    trajId: number | null;
    detail: string;
}

export interface JudgeResult {
    /** 判定の母数 */
    sumLoaded: number;
    sumOverThreshold: number;
    ratio: number;
    /** true = 終了条件を満たす */
    converged: boolean;
    /** NaN 含有 traj を除外した場合の参考値 */
    ratioExcludingNaN: number;
    convergedExcludingNaN: boolean;
    /** 判定の信頼性に関わる検査結果 */
    issues: Issue[];
    /** error が1件でもあれば、判定値は参考値として扱うべき */
    trustworthy: boolean;
}
