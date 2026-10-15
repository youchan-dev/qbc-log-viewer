// File: src/sample.ts

/**
 * バッククォート（`）で囲むと複数行の文字列になる。
 * Python のトリプルクォートに相当。
 */
export const SAMPLE_LOG = `# depot subsample qbc log
# committee_size: 4
# force_dev_threshold: 0.2
# force_dev_limit: 0.5
# n_frames_per_traj: 100
# over_limit_mode: tail
# traj 0 (/data/K10Cl2OH8water56/seed_0/traj.lammpstrj.gz): loaded=5001, expected=5001, selected=100/5001 (2.0%), over_threshold=0/5001 (0.0%), over_limit=0/5001 (0.0%), excluded_tail=0/5001 (0.0%)
# traj 1 (/data/K10Cl2OH8water56/seed_1/traj.lammpstrj.gz): loaded=5001, expected=5001, selected=23/5001 (0.5%), over_threshold=4979/5001 (99.6%), over_limit=4978/5001 (99.5%), excluded_tail=4978/5001 (99.5%)
# traj 2 (/data/K10Cl2OH8water56/seed_2/traj.lammpstrj.gz): loaded=5001, expected=5001, selected=100/5001 (2.0%), over_threshold=39/5001 (0.8%), over_limit=37/5001 (0.7%), excluded_tail=37/5001 (0.7%)
# traj 3 (/data/K10Cl2OH8water56/seed_3/traj.lammpstrj.gz): loaded=5001, expected=5001, selected=100/5001 (2.0%), over_threshold=2/5001 (0.0%), over_limit=0/5001 (0.0%), excluded_tail=0/5001 (0.0%)
# traj 4 (/data/K10Cl4OH6water78/seed_0/traj.lammpstrj.gz): loaded=5001, expected=5001, selected=100/5001 (2.0%), over_threshold=1/5001 (0.0%), over_limit=0/5001 (0.0%), excluded_tail=0/5001 (0.0%)
# WARNING: traj 5 (/data/K10Cl4OH6water78/seed_1/traj.lammpstrj.gz) had NaN committee forces starting at frame 2858; those frames excluded from selection via inf substitution.
# traj 5 (/data/K10Cl4OH6water78/seed_1/traj.lammpstrj.gz): loaded=5001, expected=5001, selected=100/5001 (2.0%), over_threshold=4266/5001 (85.3%), over_limit=4261/5001 (85.2%), excluded_tail=4261/5001 (85.2%)
`;
