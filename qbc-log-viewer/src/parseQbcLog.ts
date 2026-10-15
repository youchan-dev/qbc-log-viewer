// File: src/parseQbcLog.ts

import {
    RE_META,
    RE_TRAJ_HEAD,
    RE_METRIC_FRAC,
    RE_METRIC_PLAIN,
    RE_WARNING,
    RE_WARNING_TRAJ,
    RE_WARNING_FRAME,
    RE_PATH_TAIL,
} from './patterns';

import type {
    QbcLog,
    QbcMeta,
    QbcWarning,
    TrajRecord,
    Metric,
} from './types';

/** 再計算パーセントとログ記載値の許容誤差（丸め誤差ぶん） */
const PERCENT_TOLERANCE = 0.05;

/**
 * traj 行の本体 "loaded=5001, selected=100/5001 (2.0%), ..." を
 * メトリックの辞書に変換する。
 *
 * ポイント: 先に "X/Y (p%)" 形式を全部拾い、拾った範囲を空白で潰してから
 * "name=X" 形式を拾う。順序を逆にすると selected=100/5001 の 100 を
 * 単独値として誤検出する。
 */
function parseMetrics(body: string): {
    metrics: Record<string, Metric>;
    plain: Record<string, number>;
} {
    const metrics: Record<string, Metric> = {};

    // matchAll は Python の re.finditer に相当。
    // [...] で配列に展開しておくと後で位置を使える。
    const fracMatches = [...body.matchAll(RE_METRIC_FRAC)];

    // 文字列を1文字ずつの配列にして、拾った範囲を空白に置き換える
    const chars = body.split('');

    for (const m of fracMatches) {
        if (!m.groups || m.index === undefined) continue;

        const count = Number(m.groups.count);
        const total = Number(m.groups.total);
        const reportedPercent = Number(m.groups.pct);
        const computedPercent = total === 0 ? 0 : (count / total) * 100;

        metrics[m.groups.name] = {
            count,
            total,
            reportedPercent,
            computedPercent,
            mismatch:
                Math.abs(reportedPercent - computedPercent) > PERCENT_TOLERANCE,
        };

        // 拾った範囲を潰す
        for (let i = m.index; i < m.index + m[0].length; i++) {
            chars[i] = ' ';
        }
    }

    const rest = chars.join('');

    // 残った部分から "name=数値" を拾う（loaded / expected がここに入る）
    const plain: Record<string, number> = {};
    for (const m of rest.matchAll(RE_METRIC_PLAIN)) {
        if (!m.groups) continue;
        plain[m.groups.name] = Number(m.groups.value);
    }

    return { metrics, plain };
}

/** WARNING 行を1件分解する。文面は原文のまま保持する */
function parseWarning(line: string, rest: string): QbcWarning {
    const trajMatch = rest.match(RE_WARNING_TRAJ);
    const frameMatch = rest.match(RE_WARNING_FRAME);
    const pathMatch = rest.match(/\((?<path>[^)]*)\)/);

    return {
        trajId: trajMatch?.groups ? Number(trajMatch.groups.id) : null,
        path: pathMatch?.groups ? pathMatch.groups.path : null,
        startFrame: frameMatch?.groups ? Number(frameMatch.groups.frame) : null,
        message: line,
    };
}

/** ログ全文を受け取って構造化データを返す（純粋関数） */
export function parseQbcLog(text: string): QbcLog {
    const metaRaw: Record<string, string> = {};
    const metaNumeric: Record<string, number> = {};
    const trajs: TrajRecord[] = [];
    const pendingWarnings: QbcWarning[] = [];
    const unparsedLines: { lineNo: number; text: string }[] = [];

    // \r\n（Windows改行）も考慮して分割
    const lines = text.split(/\r?\n/);

    lines.forEach((line, i) => {
        const lineNo = i + 1;
        if (line.trim() === '') return;

        // --- 判定順序が重要: WARNING → traj → meta ---
        // RE_META は条件が緩いため、先に試すと WARNING 行を
        // key="WARNING" として拾ってしまう。

        const warnMatch = line.match(RE_WARNING);
        if (warnMatch?.groups) {
            pendingWarnings.push(parseWarning(line, warnMatch.groups.rest));
            return;
        }

        const trajMatch = line.match(RE_TRAJ_HEAD);
        if (trajMatch?.groups) {
            const { id, path, body } = trajMatch.groups;
            const { metrics, plain } = parseMetrics(body);
            const tail = path.match(RE_PATH_TAIL);

            trajs.push({
                id: Number(id),
                path,
                composition: tail?.groups ? tail.groups.composition : '(unknown)',
                seed: tail?.groups ? tail.groups.seed : '(unknown)',
                loaded: plain.loaded ?? 0,
                expected: plain.expected ?? 0,
                metrics,
                warnings: [], // 後でまとめて紐付ける
            });
            return;
        }

        const metaMatch = line.match(RE_META);
        if (metaMatch?.groups) {
            const { key, value } = metaMatch.groups;
            metaRaw[key] = value;
            const n = Number(value);
            // Number("tail") は NaN になる。数値のものだけ numeric に入れる
            if (!Number.isNaN(n) && value.trim() !== '') {
                metaNumeric[key] = n;
            }
            return;
        }

        // どれにも当てはまらなかった行（1行目のタイトル等）
        unparsedLines.push({ lineNo, text: line });
    });

    // --- 警告を traj に紐付ける ---
    // WARNING 行は traj 行より前に出現するため、
    // 全行を読み終えてから突合する（先読みすると順序依存のバグになる）
    const orphanWarnings: QbcWarning[] = [];
    for (const w of pendingWarnings) {
        const target = trajs.find((t) => t.id === w.trajId);
        if (target) {
            target.warnings.push(w);
        } else {
            orphanWarnings.push(w);
        }
    }

    const meta: QbcMeta = { raw: metaRaw, numeric: metaNumeric };

    return { meta, trajs, orphanWarnings, unparsedLines };
}
