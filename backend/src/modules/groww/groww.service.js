/**
 * @file groww.service.js
 * @description Business Logic Layer coordinating Groww API connection, token lifecycle, and account data retrieval.
 */

const env = require('../../config/env');
const logger = require('../../config/logger');
const { generateTOTP } = require('../../core/utils/totp.utils');
const GrowwClient = require('./groww.client');
const GrowwFormatter = require('./groww.formatter');
const GrowwBacktestEngine = require('./groww.backtest.engine');

const HIGH_BETA_CORE = ['BAJFINANCE', 'TATAMOTORS', 'SBIN', 'ADANIPORTS', 'MCX', 'ICICIBANK'];
const BREAKOUT_WATCHLIST = ['TECHM', 'JSWSTEEL', 'DIVISLAB', 'BPCL'];
const DEFAULT_BACKTEST_UNIVERSE = [...HIGH_BETA_CORE, ...BREAKOUT_WATCHLIST];

class GrowwService {
  /**
   * Default stock universe constants
   */
  static HIGH_BETA_CORE = HIGH_BETA_CORE;
  static BREAKOUT_WATCHLIST = BREAKOUT_WATCHLIST;
  static DEFAULT_BACKTEST_UNIVERSE = DEFAULT_BACKTEST_UNIVERSE;

  /**
   * In-memory cache for active broker session
   * @private
   */
  static #session = {
    token: null,
    expiry: null,
    tokenRefId: null,
    sessionName: null,
    active: false,
    lastConnectedAt: null
  };

  /**
   * In-memory cache for historical candles to prevent rate-limit 429 errors
   * @private
   */
  static #candleCache = new Map();
  static #CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

  /**
   * Connects to Groww using TOTP sign-in method.
   * Generates a 6-digit TOTP code and exchanges it for a daily access token.
   *
   * @returns {Promise<Object>} Formatted session details
   */
  static async connect() {
    logger.info('Initiating Groww TOTP connection...');

    // 1. Generate current 6-digit TOTP using TOTPQR base32 secret
    const totpCode = generateTOTP(env.TOTPQR);

    // 2. Request access token from Groww API
    const response = await GrowwClient.requestAccessToken(env.TOTP, totpCode);

    // 3. Cache session data
    this.#session = {
      token: response.token,
      expiry: response.expiry,
      tokenRefId: response.tokenRefId,
      sessionName: response.sessionName,
      active: response.active ?? true,
      lastConnectedAt: new Date().toISOString()
    };

    logger.info('Groww session established successfully', {
      sessionName: this.#session.sessionName,
      expiry: this.#session.expiry
    });

    return GrowwFormatter.formatSession(this.#session);
  }

  /**
   * Ensures a valid, unexpired token exists; auto-connects if necessary.
   *
   * @returns {Promise<string>} Valid access token
   */
  static async ensureValidToken() {
    const isExpired =
      !this.#session.token ||
      !this.#session.expiry ||
      new Date(this.#session.expiry).getTime() <= Date.now() + 60000;

    if (isExpired) {
      logger.info('Access token missing or expiring soon. Refreshing connection...');
      await this.connect();
    }

    return this.#session.token;
  }

  /**
   * Gets current connection and session status.
   *
   * @returns {Object} Session status info
   */
  static getStatus() {
    return GrowwFormatter.formatSession(this.#session);
  }

  /**
   * Fetches user profile details.
   *
   * @returns {Promise<Object>} Formatted profile details
   */
  static async getProfile() {
    const token = await this.ensureValidToken();
    const rawProfile = await GrowwClient.getUserProfile(token);
    return GrowwFormatter.formatProfile(rawProfile);
  }

  /**
   * Fetches account funds and margin balances.
   *
   * @returns {Promise<Object>} Formatted funds details
   */
  static async getFunds() {
    const token = await this.ensureValidToken();
    const rawMargins = await GrowwClient.getMargins(token);
    return GrowwFormatter.formatFunds(rawMargins);
  }

  /**
   * Fetches open positions.
   *
   * @returns {Promise<Object>} Formatted positions data
   */
  static async getPositions() {
    const token = await this.ensureValidToken();
    const rawPositions = await GrowwClient.getPositions(token);
    return GrowwFormatter.formatPositions(rawPositions);
  }

  /**
   * Fetches user Demat holdings merged with real-time live market quotes.
   *
   * @returns {Promise<Object>} Formatted holdings data with live returns
   */
  static async getHoldings() {
    const token = await this.ensureValidToken();
    const rawHoldings = await GrowwClient.getHoldings(token);
    const holdingsList = rawHoldings?.payload?.holdings || [];

    // Fetch live market LTP for each holding in parallel
    const holdingsWithLiveQuotes = await Promise.all(
      holdingsList.map(async (holding) => {
        const quote = await GrowwClient.getLiveQuote(token, 'NSE', holding.trading_symbol);
        return {
          ...holding,
          liveQuote: quote?.payload || null
        };
      })
    );

    return GrowwFormatter.formatHoldings({
      status: 'SUCCESS',
      payload: { holdings: holdingsWithLiveQuotes }
    });
  }

  /**
   * Generates safe date range chunks (up to 75-90 days each) for candle fetching.
   *
   * @param {string} startDateStr - 'YYYY-MM-DD'
   * @param {string} endDateStr - 'YYYY-MM-DD'
   * @param {number} [maxDaysPerChunk=75]
   * @returns {Array<{ startTime: string, endTime: string }>}
   */
  static generateDateChunks(startDateStr, endDateStr, maxDaysPerChunk = 75) {
    const chunks = [];
    let currentStart = new Date(startDateStr);
    const finalEnd = new Date(endDateStr);

    if (isNaN(currentStart.getTime()) || isNaN(finalEnd.getTime()) || currentStart > finalEnd) {
      return [{
        startTime: `${startDateStr} 09:15:00`,
        endTime: `${endDateStr} 15:30:00`
      }];
    }

    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d, time) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`;

    while (currentStart <= finalEnd) {
      let currentEnd = new Date(currentStart.getTime() + maxDaysPerChunk * 24 * 60 * 60 * 1000);
      if (currentEnd > finalEnd) {
        currentEnd = new Date(finalEnd.getTime());
      }

      chunks.push({
        startTime: fmt(currentStart, '09:15:00'),
        endTime: fmt(currentEnd, '15:30:00')
      });

      currentStart = new Date(currentEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    return chunks;
  }

  /**
   * Fetches historical candles from Groww API with automatic caching, chunking, and normalization.
   *
   * @param {Object} params
   * @param {string} params.symbol - e.g. 'TATAMOTORS'
   * @param {string} [params.exchange='NSE']
   * @param {string} [params.segment='CASH']
   * @param {string} [params.startDate] - 'YYYY-MM-DD'
   * @param {string} [params.endDate] - 'YYYY-MM-DD'
   * @param {string} [params.candleInterval='15minute'] - '15minute' or '1day'
   * @returns {Promise<Array<Object>>} Normalized candles
   */
  static async getHistoricalCandles({
    symbol,
    exchange = 'NSE',
    segment = 'CASH',
    startDate,
    endDate,
    candleInterval = '15minute'
  }) {
    // Default dates if omitted: last 60 days
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const cacheKey = `${exchange}_${symbol}_${candleInterval}_${start}_${end}`;
    const cached = this.#candleCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < this.#CACHE_TTL_MS)) {
      return cached.data;
    }

    const token = await this.ensureValidToken();
    const growwSymbol = `${exchange}-${symbol}`;

    // Use 30 days chunk limit for 15m candles to avoid duration limit & 429 errors
    const chunks = this.generateDateChunks(start, end, candleInterval === '1day' ? 365 : 30);
    const allRawCandles = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        if (i > 0) {
          // Pacing delay between chunks to prevent bursting rate limits
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        const raw = await GrowwClient.getHistoricalCandles({
          growwSymbol,
          tradingSymbol: symbol,
          exchange,
          segment,
          startTime: chunk.startTime,
          endTime: chunk.endTime,
          candleInterval
        }, token);

        const chunkCandles = raw?.payload?.candles || [];
        if (Array.isArray(chunkCandles)) {
          allRawCandles.push(...chunkCandles);
        }
      } catch (err) {
        logger.warn(`Failed to fetch candle chunk for ${symbol} [${chunk.startTime} to ${chunk.endTime}]: ${err.message}`);
      }
    }

    // Normalize and deduplicate by timestamp
    const normalized = GrowwFormatter.formatCandles(allRawCandles, symbol);
    const seen = new Set();
    const deduplicated = [];

    for (const c of normalized) {
      if (!seen.has(c.timestamp)) {
        seen.add(c.timestamp);
        deduplicated.push(c);
      }
    }

    deduplicated.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));

    if (deduplicated.length > 0) {
      this.#candleCache.set(cacheKey, {
        timestamp: Date.now(),
        data: deduplicated
      });
    }

    return deduplicated;
  }

  /**
   * Executes the 15-Minute Intraday 9/21 EMA Crossover Backtest across selected stock universe.
   *
   * @param {Object} options
   * @param {string[]} [options.symbols] - Array of stock symbols
   * @param {string} [options.startDate] - 'YYYY-MM-DD'
   * @param {string} [options.endDate] - 'YYYY-MM-DD'
   * @param {number} [options.capitalPerTrade=100000] - Capital allocated per trade
   * @param {boolean} [options.enableMultiTimeframe=true] - Daily 20 EMA trend filter
   * @param {boolean} [options.enableNR4Filter=false] - NR4 / Inside Bar filter
   * @returns {Promise<Object>} { summary, stockBreakdown, tradeLog }
   */
  static async runIntradayBacktest({
    symbols,
    startDate,
    endDate,
    capitalPerTrade = 100000,
    enableMultiTimeframe = true,
    enableNR4Filter = false
  } = {}) {
    const targetSymbols = Array.isArray(symbols) && symbols.length > 0
      ? symbols
      : DEFAULT_BACKTEST_UNIVERSE;

    // Default dates if omitted: last 60 days
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Compute Daily warmup start (45 days prior to start date for Daily EMA20 warmup)
    const dailyStartDateObj = new Date(new Date(start).getTime() - 45 * 24 * 60 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    const dailyStartDate = `${dailyStartDateObj.getFullYear()}-${pad(dailyStartDateObj.getMonth() + 1)}-${pad(dailyStartDateObj.getDate())}`;

    logger.info(`Starting 15m 9/21 EMA Intraday Backtest across ${targetSymbols.length} stocks (${start} to ${end})...`);

    const stockBreakdown = [];
    const allTrades = [];

    for (let sIdx = 0; sIdx < targetSymbols.length; sIdx++) {
      const sym = targetSymbols[sIdx];
      try {
        if (sIdx > 0) {
          // Pacing delay between stock fetches
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        // 1. Fetch 15m candles
        const candles15m = await this.getHistoricalCandles({
          symbol: sym,
          startDate: start,
          endDate: end,
          candleInterval: '15minute'
        });

        // 2. Fetch Daily candles for multi-timeframe filter if enabled
        let dailyCandles = [];
        if (enableMultiTimeframe) {
          dailyCandles = await this.getHistoricalCandles({
            symbol: sym,
            startDate: dailyStartDate,
            endDate: end,
            candleInterval: '1day'
          });
        }

        // 3. Run backtest simulation on stock
        const { trades, metrics } = GrowwBacktestEngine.runSingleStockBacktest({
          symbol: sym,
          candles15m,
          dailyCandles,
          capitalPerTrade,
          enableMultiTimeframe,
          enableNR4Filter
        });

        stockBreakdown.push(metrics);
        allTrades.push(...trades);
      } catch (err) {
        logger.error(`Backtest failed for symbol ${sym}: ${err.message}`);
        stockBreakdown.push(GrowwBacktestEngine.computeEmptyMetrics(sym));
      }
    }

    // Sort all trades chronologically descending for display
    allTrades.sort((a, b) => (a.entryTimestamp < b.entryTimestamp ? 1 : -1));

    // Aggregate portfolio summary metrics
    const summary = GrowwBacktestEngine.calculateMetrics('PORTFOLIO', allTrades, capitalPerTrade * targetSymbols.length);

    return {
      summary,
      stockBreakdown,
      tradeLog: allTrades
    };
  }
}

module.exports = GrowwService;

