/**
 * @file groww.formatter.js
 * @description Presentation Formatting Layer for Groww API data.
 */

class GrowwFormatter {
  /**
   * Formats connection session state for the client.
   *
   * @param {Object} session
   * @returns {Object} Clean session state
   */
  static formatSession(session) {
    if (!session || !session.token) {
      return {
        isConnected: false,
        active: false,
        sessionName: null,
        tokenRefId: null,
        expiresAt: null,
        expiresInMinutes: 0
      };
    }

    const expiryTime = session.expiry ? new Date(session.expiry).getTime() : 0;
    const now = Date.now();
    const remainingMs = Math.max(0, expiryTime - now);
    const expiresInMinutes = Math.round(remainingMs / (1000 * 60));

    return {
      isConnected: Boolean(session.token && remainingMs > 0),
      active: session.active ?? true,
      sessionName: session.sessionName || 'AI-Trade',
      tokenRefId: session.tokenRefId || null,
      expiresAt: session.expiry || null,
      expiresInMinutes
    };
  }

  /**
   * Formats Groww raw profile response into clean DTO.
   *
   * @param {Object} rawProfile
   * @returns {Object}
   */
  static formatProfile(rawProfile) {
    const payload = rawProfile?.payload || rawProfile || {};

    return {
      vendorUserId: payload.vendor_user_id || 'N/A',
      ucc: payload.ucc || 'N/A',
      nseEnabled: Boolean(payload.nse_enabled),
      bseEnabled: Boolean(payload.bse_enabled),
      ddpiEnabled: Boolean(payload.ddpi_enabled),
      activeSegments: Array.isArray(payload.active_segments) ? payload.active_segments : [],
      status: rawProfile?.status || 'SUCCESS'
    };
  }

  /**
   * Formats Groww raw margins/funds response into clean financial metrics.
   *
   * @param {Object} rawMargins
   * @returns {Object}
   */
  static formatFunds(rawMargins) {
    const p = rawMargins?.payload || rawMargins || {};
    const eq = p.equity_margin_details || {};
    const fno = p.fno_margin_details || {};
    const comm = p.commodity_margin_details || {};

    const clearCash = Number(p.clear_cash || 0);
    const netMarginUsed = Number(p.net_margin_used || 0);
    const collateralAvailable = Number(p.collateral_available || 0);
    const collateralUsed = Number(p.collateral_used || 0);

    return {
      summary: {
        clearCash,
        netMarginUsed,
        collateralAvailable,
        collateralUsed,
        totalAvailableBalance: clearCash + collateralAvailable,
        brokerageAndCharges: Number(p.brokerage_and_charges || 0),
        adhocMargin: Number(p.adhoc_margin || 0)
      },
      equity: {
        cncBalanceAvailable: Number(eq.cnc_balance_available || 0),
        misBalanceAvailable: Number(eq.mis_balance_available || 0),
        cncMarginUsed: Number(eq.cnc_margin_used || 0),
        misMarginUsed: Number(eq.mis_margin_used || 0),
        netEquityMarginUsed: Number(eq.net_equity_margin_used || 0)
      },
      fno: {
        futureBalanceAvailable: Number(fno.future_balance_available || 0),
        optionBuyBalanceAvailable: Number(fno.option_buy_balance_available || 0),
        optionSellBalanceAvailable: Number(fno.option_sell_balance_available || 0),
        spanMarginUsed: Number(fno.span_margin_used || 0),
        exposureMarginUsed: Number(fno.exposure_margin_used || 0),
        netFnoMarginUsed: Number(fno.net_fno_margin_used || 0)
      },
      commodity: {
        spanMargin: Number(comm.commodity_span_margin || 0),
        exposureMargin: Number(comm.commodity_exposure_margin || 0),
        unrealisedM2m: Number(comm.commodity_unrealised_m2m || 0),
        realisedM2m: Number(comm.commodity_realised_m2m || 0)
      }
    };
  }

  /**
   * Formats Groww raw holdings list.
   *
   * @param {Object} rawHoldings
   * @returns {Object}
   */
  static formatHoldings(rawHoldings) {
    const list = rawHoldings?.payload?.holdings || [];

    let totalInvested = 0;

    const formattedList = list.map((item) => {
      const quantity = Number(item.quantity || 0);
      const avgPrice = Number(item.average_price || 0);
      const investedValue = quantity * avgPrice;
      totalInvested += investedValue;

      return {
        isin: item.isin,
        tradingSymbol: item.trading_symbol,
        quantity,
        dematFreeQuantity: Number(item.demat_free_quantity || 0),
        averagePrice: avgPrice,
        investedValue: Math.round(investedValue * 100) / 100,
        tradableExchanges: item.tradable_exchanges || ['NSE']
      };
    });

    return {
      totalHoldingsCount: formattedList.length,
      totalInvested: Math.round(totalInvested * 100) / 100,
      holdings: formattedList
    };
  }

  /**
   * Formats Groww raw positions list.
   *
   * @param {Object} rawPositions
   * @returns {Object}
   */
  static formatPositions(rawPositions) {
    const list = rawPositions?.payload?.positions || [];

    return {
      totalPositionsCount: list.length,
      positions: list.map((pos) => ({
        tradingSymbol: pos.trading_symbol || pos.symbol || 'N/A',
        segment: pos.segment || 'EQUITY',
        product: pos.product || 'MIS',
        netQuantity: Number(pos.net_quantity || pos.quantity || 0),
        buyQuantity: Number(pos.buy_quantity || 0),
        sellQuantity: Number(pos.sell_quantity || 0),
        realisedPnl: Number(pos.realised_pnl || 0),
        unrealisedPnl: Number(pos.unrealised_pnl || 0)
      }))
    };
  }

    /**
   * Formats Groww raw holdings list with live returns, current value & PnL.
   *
   * @param {Object} rawHoldings
   * @returns {Object}
   */
  static formatHoldings(rawHoldings) {
    const list = rawHoldings?.payload?.holdings || [];

    let totalInvested = 0;
    let totalCurrentValue = 0;

    const formattedList = list.map((item) => {
      const quantity = Number(item.quantity || 0);
      const avgPrice = Number(item.average_price || 0);
      const investedValue = quantity * avgPrice;
      totalInvested += investedValue;

      const live = item.liveQuote || {};
      const ltp = Number(live.last_price || avgPrice);
      const currentValue = quantity * ltp;
      totalCurrentValue += currentValue;

      const pnl = currentValue - investedValue;
      const pnlPercentage = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
      const dayChange = Number(live.day_change || 0);
      const dayChangePercentage = Number(live.day_change_perc || 0);

      return {
        isin: item.isin,
        tradingSymbol: item.trading_symbol,
        quantity,
        dematFreeQuantity: Number(item.demat_free_quantity || 0),
        averagePrice: avgPrice,
        investedValue: Math.round(investedValue * 100) / 100,
        ltp: Math.round(ltp * 100) / 100,
        currentValue: Math.round(currentValue * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        pnlPercentage: Math.round(pnlPercentage * 100) / 100,
        dayChange: Math.round(dayChange * 100) / 100,
        dayChangePercentage: Math.round(dayChangePercentage * 100) / 100,
        tradableExchanges: item.tradable_exchanges || ['NSE']
      };
    });

    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPercentage = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    return {
      totalHoldingsCount: formattedList.length,
      totalInvested: Math.round(totalInvested * 100) / 100,
      totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
      totalPnl: Math.round(totalPnl * 100) / 100,
      totalPnlPercentage: Math.round(totalPnlPercentage * 100) / 100,
      holdings: formattedList
    };
  }
}

module.exports = GrowwFormatter;

