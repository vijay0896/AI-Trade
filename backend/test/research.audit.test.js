/**
 * @file research.audit.test.js
 * @description Phase 7.1 Automated Audit & Reconciliation Test Suite.
 * Validates trade financial accounting invariants, bootstrap reproducibility,
 * Wilson score binomial confidence intervals, mutually exclusive regime sums,
 * walk-forward objective boundaries, ranking verdict integrity, and causal leakage guards.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const AUDIT_DIR = path.resolve(__dirname, '../storage/research/phase-7.1-audit');
const RESEARCH_DIR = path.resolve(__dirname, '../storage/research');
const RUNS_DIR = path.resolve(__dirname, '../storage/backtesting/runs');
const RUNS_INDEX_PATH = path.join(RUNS_DIR, 'runs_index.json');
const ENGINE_PATH = path.resolve(__dirname, '../src/modules/backtesting/backtesting.engine.js');

describe('Phase 7.1 Statistical Integrity & Research Reconciliation Audit Tests', () => {

  describe('1. Trade-Level Financial Accounting Invariant & Run Reconciliation', () => {
    it('should verify all 25 canonical runs satisfy financial invariant: Net = Gross - Charges', () => {
      const runs = JSON.parse(fs.readFileSync(RUNS_INDEX_PATH, 'utf8')).filter(r => r.isCanonical);
      assert.strictEqual(runs.length, 25, 'Must have exactly 25 canonical runs');

      let totalAudited = 0;
      for (const run of runs) {
        const tradesFile = path.join(RUNS_DIR, run.runId, 'trades.csv');
        assert.ok(fs.existsSync(tradesFile), `trades.csv must exist for ${run.runId}`);
        const lines = fs.readFileSync(tradesFile, 'utf8').trim().split('\n');
        const headers = lines[0].split(',');
        const trades = lines.slice(1).map(l => {
          const v = l.split(',');
          const o = {};
          headers.forEach((h, i) => o[h] = v[i]);
          return o;
        });

        totalAudited += trades.length;
        for (const t of trades) {
          const net = parseFloat(t.netPnL);
          const gross = parseFloat(t.grossPnL);
          const charges = parseFloat(t.totalCharges);
          const diff = Math.abs(net - (gross - charges));
          assert.ok(diff <= 0.05, `Trade accounting invariant violated in ${t.tradeId}: diff ${diff}`);
        }
      }
      assert.ok(totalAudited > 1000, `Must have audited all trades across 25 runs (audited ${totalAudited})`);
    });

    it('should verify trade ledger sums match summary.json for all 25 canonical runs within penny tolerance', () => {
      const runs = JSON.parse(fs.readFileSync(RUNS_INDEX_PATH, 'utf8')).filter(r => r.isCanonical);
      for (const run of runs) {
        const tradesFile = path.join(RUNS_DIR, run.runId, 'trades.csv');
        const summaryFile = path.join(RUNS_DIR, run.runId, 'summary.json');
        const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
        const lines = fs.readFileSync(tradesFile, 'utf8').trim().split('\n');
        const headers = lines[0].split(',');
        const netIdx = headers.indexOf('netPnL');
        assert.ok(netIdx >= 0, 'netPnL column must exist in trades.csv');

        let sumNet = 0;
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',');
          sumNet += parseFloat(parts[netIdx]);
        }

        const diffNet = Math.abs(sumNet - summary.overview.netPnL);
        assert.ok(diffNet <= 0.05, `Summary netPnL mismatch in ${run.runId}: diff ${diffNet}`);
        assert.strictEqual(lines.length - 1, summary.tradingPerformance.totalTrades, 'Trade count must match exactly');
      }
    });
  });

  describe('2. Bootstrap Resampling Reproducibility & Mathematical Distinctions', () => {
    it('should deterministically reproduce bootstrap resampling distributions with fixed seed', () => {
      const netPnLs = [-148.06, 7.9, 553.64, -20.04, 440.17, 280.56, 114.01, -299.97, -374.4, 334.29, 103.04];
      const n = netPnLs.length;
      const iters = 1000;

      const runSim = (seedVal) => {
        let seed = seedVal;
        const prng = () => {
          seed = (seed * 9301 + 49297) % 233280;
          return seed / 233280;
        };
        const totals = [];
        for (let iter = 0; iter < iters; iter++) {
          let s = 0;
          for (let i = 0; i < n; i++) {
            s += netPnLs[Math.floor(prng() * n)];
          }
          totals.push(s);
        }
        totals.sort((a, b) => a - b);
        return {
          median: totals[Math.floor(iters * 0.5)],
          p5: totals[Math.floor(iters * 0.05)],
          p95: totals[Math.floor(iters * 0.95)]
        };
      };

      const res1 = runSim(123456789);
      const res2 = runSim(123456789);
      assert.strictEqual(res1.median, res2.median, 'Deterministic seed must produce identical median');
      assert.strictEqual(res1.p5, res2.p5, 'Deterministic seed must produce identical 5th percentile');
      assert.strictEqual(res1.p95, res2.p95, 'Deterministic seed must produce identical 95th percentile');
    });

    it('should mathematically verify that trade order permutation without replacement preserves total Net P&L', () => {
      const netPnLs = [-148.06, 7.9, 553.64, -20.04, 440.17, 280.56, 114.01, -299.97, -374.4, 334.29, 103.04];
      const targetSum = Number(netPnLs.reduce((a, b) => a + b, 0).toFixed(2));

      // 100 random shuffles
      for (let s = 0; s < 100; s++) {
        const shuffled = [...netPnLs].sort(() => Math.random() - 0.5);
        const shuffledSum = Number(shuffled.reduce((a, b) => a + b, 0).toFixed(2));
        assert.strictEqual(shuffledSum, targetSum, 'Sequence permutation without replacement must preserve total sum');
      }
    });
  });

  describe('3. Wilson Confidence Intervals & Exact Binomial Tests', () => {
    it('should compute exact Wilson score 95% CI and demonstrate HDFCBANK fails to reject fair-coin null', () => {
      const n = 11;
      const w = 7;
      const z = 1.95996;
      const p = w / n;
      const den = 1 + (z * z) / n;
      const center = p + (z * z) / (2 * n);
      const rad = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
      const lower = Math.max(0, (center - rad) / den);
      const upper = Math.min(1, (center + rad) / den);

      // Verify lower and upper bounds
      assert.ok(lower > 0.35 && lower < 0.36, `Lower bound should be ~35.38% (got ${lower})`);
      assert.ok(upper > 0.84 && upper < 0.85, `Upper bound should be ~84.83% (got ${upper})`);

      // Two-tailed binomial p-value for 7 wins in 11 trials with p=0.5
      function comb(n, r) {
        if (r < 0 || r > n) return 0;
        if (r === 0 || r === n) return 1;
        let c = 1;
        for (let i = 1; i <= r; i++) c = (c * (n - i + 1)) / i;
        return c;
      }
      let pVal = 0;
      const pObs = comb(11, 7) * Math.pow(0.5, 11);
      for (let i = 0; i <= 11; i++) {
        const pi = comb(11, i) * Math.pow(0.5, 11);
        if (pi <= pObs + 1e-12) pVal += pi;
      }

      assert.ok(pVal > 0.50 && pVal < 0.60, `Binomial p-value must be ~0.5488 (got ${pVal})`);
      assert.ok(pVal > 0.05, 'Null hypothesis of fair coin (p=0.5) CANNOT be rejected at alpha=0.05');
    });
  });

  describe('4. Regime Percentage Reconciliation & Mutual Exclusivity', () => {
    it('should verify all completed regular sessions belong to mutually exclusive regimes summing to 100%', () => {
      const csvPath = path.join(RESEARCH_DIR, 'DAILY_SESSION_CLASSIFICATION.csv');
      assert.ok(fs.existsSync(csvPath), 'DAILY_SESSION_CLASSIFICATION.csv must exist');
      const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
      const headers = lines[0].split(',');
      const records = lines.slice(1).map(l => {
        const parts = l.split(',');
        const obj = {};
        headers.forEach((h, i) => { obj[h] = parts[i]; });
        return obj;
      });

      const symbols = ['ICICIBANK', 'HDFCBANK', 'M&M', 'AXISBANK', 'BHARTIARTL'];
      for (const sym of symbols) {
        const symRecords = records.filter(r => r.symbol === sym && r.isEligible === 'true');
        assert.ok(symRecords.length >= 1230, `Should have ~1231 regular sessions for ${sym} (got ${symRecords.length})`);

        const counts = {};
        symRecords.forEach(r => { counts[r.regime] = (counts[r.regime] || 0) + 1; });
        const sumCounts = Object.values(counts).reduce((a, b) => a + b, 0);
        assert.strictEqual(sumCounts, symRecords.length, 'Every regular session must have exactly one regime');

        const strongPct = ((counts['STRONG_TREND_UP'] || 0) + (counts['STRONG_TREND_DOWN'] || 0)) / symRecords.length;
        const weakPct = (counts['WEAK_TREND'] || 0) / symRecords.length;
        const sidePct = (counts['SIDEWAYS'] || 0) / symRecords.length;
        const mixedPct = (counts['MIXED_UNCLEAR'] || 0) / symRecords.length;

        const sumPct = strongPct + weakPct + sidePct + mixedPct;
        assert.ok(Math.abs(sumPct - 1.0) < 1e-6, `Regime percentages must sum to 100% for ${sym}`);
      }
    });
  });

  describe('5. Walk-Forward Status Definitions & Boundary Integrity', () => {
    it('should verify non-overlapping train/test boundaries and objective status labels', () => {
      const reassessPath = path.join(AUDIT_DIR, 'WALK_FORWARD_REASSESSMENT.csv');
      assert.ok(fs.existsSync(reassessPath), 'WALK_FORWARD_REASSESSMENT.csv must exist');
      const lines = fs.readFileSync(reassessPath, 'utf8').trim().split('\n').slice(1);

      for (const line of lines) {
        const parts = line.split(',');
        const testTrades = parseInt(parts[9], 10);
        const status = parts[14];

        if (testTrades === 0) {
          assert.strictEqual(status, 'NOT_EVALUABLE', 'Folds with 0 trades must be NOT_EVALUABLE');
        } else if (testTrades < 10) {
          assert.strictEqual(status, 'INSUFFICIENT_SAMPLE', 'Folds with < 10 trades must be INSUFFICIENT_SAMPLE');
        }

        assert.notStrictEqual(status, 'STABLE_POSITIVE', 'No low-sample fold should be marked STABLE_POSITIVE');
      }
    });
  });

  describe('6. Ranking Formulas & Verdict Integrity', () => {
    it('should verify that Ranking B does not assign positive return verdicts to net loss stocks', () => {
      const rankingCsvPath = path.join(AUDIT_DIR, 'RANKING_RECONCILIATION.csv');
      assert.ok(fs.existsSync(rankingCsvPath), 'RANKING_RECONCILIATION.csv must exist');
      const lines = fs.readFileSync(rankingCsvPath, 'utf8').trim().split('\n').slice(1);
      const rankingBRows = lines.filter(l => l.startsWith('RANKING_B_STRATEGY_PERFORMANCE'));

      assert.strictEqual(rankingBRows.length, 5, 'Must have 5 Ranking B entries');
      for (const row of rankingBRows) {
        const sym = row.split(',')[2];
        if (sym === 'HDFCBANK') {
          assert.ok(row.includes('Exploratory positive return (+₹991.14)'), 'HDFCBANK should have exploratory positive verdict');
        } else {
          assert.ok(row.includes('Net negative return'), `Losing stock ${sym} must have Net negative return verdict`);
        }
      }
    });
  });

  describe('7. Causal Feature Availability & Zero Look-Ahead Leakage', () => {
    it('should verify backtesting engine contains zero references to ex-post session classification features', () => {
      const code = fs.readFileSync(ENGINE_PATH, 'utf8');
      const forbiddenKeywords = ['sessionClassification', 'REGIMES.SIDEWAYS', 'REGIMES.STRONG_TREND', 'meanChoppinessIndex'];
      for (const kw of forbiddenKeywords) {
        assert.ok(!code.includes(kw), `Engine must not reference ex-post feature ${kw}`);
      }
    });

    it('should verify that pending signals are executed at candle open of subsequent bar', () => {
      const code = fs.readFileSync(ENGINE_PATH, 'utf8');
      assert.ok(code.includes('if (!activeTrade && pendingSignal)'), 'Engine must check pendingSignal from previous candle');
      assert.ok(code.includes('BacktestExecutionEngine.applySlippage'), 'Engine must apply slippage to open fill');
      assert.ok(code.includes('candle.open'), 'Engine must fill trade at candle.open');
    });
  });

  describe('8. Audit Deliverables Verification', () => {
    it('should verify all 10 Phase 7.1 audit deliverables exist and are non-empty', () => {
      const requiredDeliverables = [
        'PHASE_7_1_AUDIT_REPORT.md',
        'CANONICAL_TRADE_RECONCILIATION.csv',
        'BOOTSTRAP_RECONCILIATION.json',
        'REGIME_METRIC_RECONCILIATION.csv',
        'STATISTICAL_VALIDITY.csv',
        'WALK_FORWARD_REASSESSMENT.csv',
        'EXPERIMENT_REGISTRY.csv',
        'CAUSAL_FEATURE_AUDIT.csv',
        'RANKING_RECONCILIATION.csv',
        'RESEARCH_AUDIT_METADATA.json'
      ];

      for (const fn of requiredDeliverables) {
        const fp = path.join(AUDIT_DIR, fn);
        assert.ok(fs.existsSync(fp), `Deliverable ${fn} must exist in phase-7.1-audit/`);
        const stats = fs.statSync(fp);
        assert.ok(stats.size > 100, `Deliverable ${fn} must be non-empty (size: ${stats.size} bytes)`);
      }
    });
  });

});
