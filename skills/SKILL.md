# NIFTY 50 INSTITUTIONAL SMC PLAYBOOK & SYSTEM MANUAL

This document forms the core strategic intelligence of the Nexus Alpha terminal. Every AI decision and quantitative thesis must conform strictly to the guidelines and mathematical realities detailed here.

---

## 1. CORE MARKET STRUCTURE & SMC PROTOCOLS

### A. Trend Hierarchy & Swing Points
- **Trend Definition:**
  - **BULLISH:** Continuous creation of Higher Highs (HH) and Higher Lows (HL).
  - **BEARISH:** Continuous creation of Lower Highs (LH) and Lower Lows (LL).
- **Structure Break Confirmations:**
  - **CHOCH (Change of Character):** The first structural high/low violation signalling potential trend reversal. Must be confirmed ONLY by a candle body close on the 5M/15M chart. Wick sweeps without a close are classified as *liquidity grabs*, not reversals.
  - **BOS (Break of Structure):** Trend continuation breakout confirming a new swing high/low body close in the direction of the dominant trend.

### B. Supply & Demand Imbalances
- **Order Blocks (OB):**
  - **Bullish OB:** The lowest down-close candle that preceded a strong impulsive upward move breaching a previous structural swing high.
  - **Bearish OB:** The highest up-close candle that preceded a strong impulsive downward move breaching a previous structural swing low.
  - **Mitigation Rule:** An OB remains active and magnetic ONLY if the price has not retraced to touch it yet. Once price retraces and tests the OB zone, it is marked as *mitigated* and loses its primary entry validity.
- **Fair Value Gaps (FVG):**
  - A three-candle price imbalance where Candle 1's wick and Candle 3's wick do not overlap, leaving a structural void.
  - **Filling Rule:** Unfilled voids act as primary draw-on-liquidity magnets. When price fills at least 50% of the FVG, it is considered mitigated for structural alerts.

### C. Liquidity & Execution Zones
- **Liquidity Sweeps (BSL/SSL):**
  - **Buy Side Liquidity (BSL) Sweep:** Price spikes above equal highs or previous daily highs, triggering buy stops/breakout orders, then immediately closes back inside the range.
  - **Sell Side Liquidity (SSL) Sweep:** Price spikes below equal lows or previous daily lows, triggering sell stops/panic sells, then immediately closes back inside the range.
- **Premium vs Discount Pricing:**
  - **Discount Zone (< 50% retracement):** Ideal zone for executing Bullish OB/FVG setups.
  - **Premium Zone (> 50% retracement):** Ideal zone for executing Bearish OB/FVG setups.

---

## 2. NSE INDIAN MARKET RULES (IST)

All times are tracked strictly in Indian Standard Time (IST):
*   **09:00 - 09:15:** Pre-Market. GIFT Nifty gap estimation established.
*   **09:15 - 09:30 (Opening Buffer Window):** Extremely high spread volatility. **STRICT NO-TRADE ZONE.** Allow initial order matching to clear.
*   **09:30 - 11:30 (First Trading Window):** Peak institutional volatility. High probability breakout continuation.
*   **11:30 - 13:30 (Midday Lull):** Low volume chop. Range retests and mean reversions are primary. Avoid trend continuation setups.
*   **13:30 - 15:15 (Second Trading Window):** European opening flows. Heavy institutional momentum and trend breakouts.
*   **15:15 - 15:30 (Closing Buffer Window):** Auto-squarings and margin settlements trigger erratic fills. **STRICT NO-TRADE ZONE.**

---

## 3. MASTER NO-TRADE RULES (CAPITAL PROTECTION OVERRIDES)

A trade is blocked or deactivated immediately under the following market conditions:
1.  **VIX Stress:** India VIX > 25. Spreads are wide, premiums decay rapidly, and structural continuation breaks down.
2.  **Volatile Spikes:** India VIX rises > 10% intraday.
3.  **Expiry Volatility:** Thursday Expiry post 14:00. Position size must be reduced by 50% or skipped due to gamma squeezing.
4.  **Macro Friction:** RBI Policy days, Union Budget announcement windows, or Federal Reserve decision days. Trading must be fully blocked.
5.  **Liquidity Risk:** Holiday tomorrow. Lower volumes today trigger wide spreads.
6.  **Sector Dispersion:** Mixed sector participation (>50% of NSE sectoral indices contradicting the index bias).

---

## 4. PRE-TRADE 6-STEP CHECKLIST
1.  Verify VIX < 20 (Standard) or VIX < 25 (Caution).
2.  Check current IST time is outside 09:15-09:30 and 15:15-15:30 buffers.
3.  Confirm GIFT Nifty gap direction matches dominant Nifty swing bias.
4.  Ensure target stock is showing positive Relative Strength (RS > 1.0) for long or negative (RS < -1.0) for short.
5.  Identify clean, unmitigated 5M/15M Order Block and verify entry sits inside the Discount zone (for longs).
6.  Perform dynamic Zerodha margin checks to confirm available capital supports the position size.
