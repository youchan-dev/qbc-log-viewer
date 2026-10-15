// File: src/patterns.ts

/**
 * メタ行: "# committee_size: 4"
 * traj 行・WARNING 行を誤って拾わないよう、キーに空白を許さない
 */
export const RE_META =
    /^#\s*(?<key>[A-Za-z_][A-Za-z0-9_]*)\s*:\s*(?<value>.+?)\s*$/;

/**
 * traj 行の前半部分。
 * "# traj 0 (/data/xxx/seed_0/traj.lammpstrj.gz): loaded=..., ..."
 * パスに ')' が含まれる可能性を考慮し、"): " を区切りとして最長一致で切り出す
 */
export const RE_TRAJ_HEAD =
    /^#\s*traj\s+(?<id>\d+)\s+\((?<path>.*)\):\s*(?<body>.+)$/;

/**
 * body 内の "name=X/Y (p%)" 形式メトリック。
 * キー名を決め打ちしない（未知キーも拾う）
 */
export const RE_METRIC_FRAC =
    /(?<name>[A-Za-z_][A-Za-z0-9_]*)=(?<count>\d+)\/(?<total>\d+)\s*\((?<pct>[\d.]+)%\)/g;

/**
 * body 内の "name=X" 形式（loaded / expected など分数でないもの）。
 * RE_METRIC_FRAC で先に消費した箇所を除外してから適用すること
 */
export const RE_METRIC_PLAIN =
    /(?<name>[A-Za-z_][A-Za-z0-9_]*)=(?<value>\d+)(?!\s*\/)/g;

/**
 * WARNING 行。文面の構造には依存せず、traj id とパスだけ抽出
 */
export const RE_WARNING =
    /^#\s*WARNING:\s*(?<rest>.+)$/;

/** WARNING 行内から traj id を抽出（見つからなければ null 扱い） */
export const RE_WARNING_TRAJ =
    /\btraj\s+(?<id>\d+)\b/;

/** WARNING 行内から NaN 開始フレームを抽出 */
export const RE_WARNING_FRAME =
    /starting\s+at\s+frame\s+(?<frame>\d+)/;

/** パス末尾2階層の抽出（composition / seed） */
export const RE_PATH_TAIL =
    /(?<composition>[^/]+)\/(?<seed>[^/]+)\/[^/]+$/;
