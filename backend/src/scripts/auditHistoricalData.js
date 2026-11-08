#!/usr/bin/env node
/**
 * @file auditHistoricalData.js
 * @description Comprehensive, independent data quality audit across all 305 monthly CSV files
 * for ICICIBANK, HDFCBANK, M&M, AXISBANK, and BHARTIARTL.
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../../storage/historical-data');
const STOCKS = ['ICICIBANK', 'HDFCBANK', 'M&M', 'AXISBANK', 'BHARTIARTL'];

// Normal continuous session intervals (09:15 to 15:25)
const EXPECTED_NORMAL_INTERVALS = [];
for (let h = 9; h <= 15; h++) {
  const mStart = (h === 9) ? 15 : 0;
  const mEnd = (h === 15) ? 25 : 55;
  for (let m = mStart; m <= mEnd; m += 5) {
    EXPECTED_NORMAL_INTERVALS.push(
      String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00'
    );
  }
}

function runAudit() {
  console.log('===============================================================');
  console.log('  AI TRADING SYSTEM — 5-YEAR HISTORICAL DATA QUALITY AUDIT');
  console.log('  Auditing 305 monthly CSV files across 5 NSE universe stocks');
  console.log('===============================================================\n');

  const stockReports = {};
  let grandTotalCandles = 0;

  for (const sym of STOCKS) {
    const symDir = path.join(BASE_DIR, sym);
    if (!fs.existsSync(symDir)) {
      console.error(`Directory missing for ${sym}: ${symDir}`);
      continue;
    }

    const years = fs.readdirSync(symDir).filter((y) => !y.startsWith('.')).sort();
    let totalRows = 0;
    let malformedRows = 0;
    let ohlcViolations = 0;
    let volumeViolations = 0;
    let duplicateTimestamps = 0;
    let maxOvernightGap = { pct: 0, from: null, to: null };
    let prevClose = null;
    let prevDate = null;

    const seenTimestamps = new Set();
    const dayTimesMap = new Map();

    for (const y of years) {
      const yDir = path.join(symDir, y);
      const files = fs.readdirSync(yDir).filter((f) => f.endsWith('.csv')).sort();

      for (const f of files) {
        const content = fs.readFileSync(path.join(yDir, f), 'utf8').trim().split('\n');

        for (let i = 1; i < content.length; i++) {
          const line = content[i].trim();
          if (!line) continue;
          totalRows++;

          const cols = line.split(',');
          if (cols.length !== 7) {
            malformedRows++;
            continue;
          }

          const [ts, s, oStr, hStr, lStr, cStr, vStr] = cols;
          const o = Number(oStr), h = Number(hStr), l = Number(lStr), c = Number(cStr), v = Number(vStr);

          if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c) || isNaN(v)) {
            malformedRows++;
            continue;
          }

          if (o <= 0 || h <= 0 || l <= 0 || c <= 0) ohlcViolations++;
          if (h < Math.max(o, c) - 0.01 || l > Math.min(o, c) + 0.01 || h < l) ohlcViolations++;
          if (v < 0) volumeViolations++;

          if (seenTimestamps.has(ts)) {
            duplicateTimestamps++;
          } else {
            seenTimestamps.add(ts);
          }

          const [date, time] = ts.split('T');
          if (!dayTimesMap.has(date)) dayTimesMap.set(date, new Set());
          dayTimesMap.get(date).add(time);

          // Overnight gap analysis
          if (prevDate && prevDate !== date) {
            const gap = Math.abs(((o - prevClose) / prevClose) * 100);
            if (gap > maxOvernightGap.pct) {
              maxOvernightGap = { pct: gap, from: prevDate, to: date, prevClose, open: o };
            }
          }
          prevClose = c;
          prevDate = date;
        }
      }
    }

    // Trading session analysis
    let full75Days = 0;
    let specialSessions = 0;
    let missingContinuousBars = 0;

    for (const [date, timeSet] of dayTimesMap.entries()) {
      const dayOfWeek = new Date(date).getDay();
      const isSaturday = (dayOfWeek === 6);
      const isEveningOnly = Array.from(timeSet).every((t) => t >= '18:00:00');

      if (isSaturday || isEveningOnly) {
        specialSessions++;
        continue;
      }

      let missingInDay = 0;
      for (const exp of EXPECTED_NORMAL_INTERVALS) {
        if (!timeSet.has(exp)) missingInDay++;
      }

      if (missingInDay === 0) {
        full75Days++;
      } else {
        missingContinuousBars += missingInDay;
      }
    }

    grandTotalCandles += totalRows;
    const isPass = malformedRows === 0 && ohlcViolations === 0 && volumeViolations === 0 && duplicateTimestamps === 0;

    stockReports[sym] = {
      totalCandles: totalRows,
      tradingDays: dayTimesMap.size,
      full75Days,
      specialSessions,
      missingContinuousBars,
      completenessPct: ((1 - (missingContinuousBars / (full75Days * 75))) * 100).toFixed(2),
      malformedRows,
      ohlcViolations,
      volumeViolations,
      duplicateTimestamps,
      maxOvernightGap: `${maxOvernightGap.pct.toFixed(2)}% (${maxOvernightGap.from} -> ${maxOvernightGap.to})`,
      status: isPass ? 'PASS' : 'FAIL'
    };

    console.log(`Stock: ${sym}`);
    console.log(`  Quality Classification:      ${stockReports[sym].status}`);
    console.log(`  Total Candles Audited:       ${totalRows.toLocaleString()}`);
    console.log(`  Total Trading Sessions:      ${dayTimesMap.size}`);
    console.log(`  100% Complete 75-Bar Days:   ${full75Days}`);
    console.log(`  Special Sessions (DR/Diwali):${specialSessions}`);
    console.log(`  Missing Continuous Bars:     ${missingContinuousBars} (${stockReports[sym].completenessPct}% complete)`);
    console.log(`  OHLC / Volume Violations:    ${ohlcViolations} / ${volumeViolations}`);
    console.log(`  Duplicate Timestamps:        ${duplicateTimestamps}`);
    console.log(`  Max Overnight Price Gap:     ${stockReports[sym].maxOvernightGap}`);
    console.log('---------------------------------------------------------------');
  }

  console.log(`\nGrand Total Candles Audited: ${grandTotalCandles.toLocaleString()}`);
  console.log('Detailed Audit Report: backend/storage/historical-data/DATA_QUALITY_AUDIT.md\n');
}

runAudit();

