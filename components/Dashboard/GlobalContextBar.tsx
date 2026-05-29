import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Info, Clock } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export interface GlobalContextBarProps {
  data: {
    marketContext: any;
    optionChain: any;
    vix: any;
  } | null;
}

export function GlobalContextBar({ data }: GlobalContextBarProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  if (!data || !data.marketContext || !data.optionChain || !data.vix) {
    return (
      <div className="w-full bg-[#0d1117] border-b border-[#21262d] py-3 text-center text-xs text-[#8892a4] animate-pulse">
        LOADING INSTITUTIONAL FEED...
      </div>
    );
  }

  const { globalCues, commodities, giftNifty, institutional } = data.marketContext;
  const { pcr, maxPain, daysToExpiry } = data.optionChain;
  const { current: vixVal, trend: vixTrend, interpretation: vixInterpretation } = data.vix;

  const showTooltip = (id: string) => setActiveTooltip(id);
  const hideTooltip = () => setActiveTooltip(null);

  const renderTooltip = (id: string, text: string) => {
    if (activeTooltip !== id) return null;
    return (
      <div className="absolute left-0 bottom-full mb-1 z-50 w-52 p-2 bg-[#050508] border border-[#21262d] text-[10px] text-[#e6e6e6] rounded shadow-lg leading-relaxed pointer-events-none">
        {text}
      </div>
    );
  };

  const renderIndicator = (status?: string) => {
    const isMock = status === 'MOCK';
    return (
      <span style={{
        color: status === 'LIVE' ? '#00e5a0' :
               status === 'DELAYED' ? '#f9ca24' : '#ff3a3a',
        fontSize: 8, marginLeft: 2
      }} title={isMock ? "Live fetch failed — showing fallback value" : undefined}>●</span>
    );
  };

  return (
    <div className="sticky top-0 z-40 w-full bg-[#050508] border-b border-[#21262d] select-none text-[11px] font-mono">
      {/* ROW 1: Macro Stock Cues & Commodities */}
      <div className="grid grid-cols-6 border-b border-[#21262d] divide-x divide-[#21262d]">
        {/* GIFT NIFTY GAP */}
        <div 
          className="p-1 px-2 relative cursor-help hover:bg-[#0d1117]/50"
          onMouseEnter={() => showTooltip('gift')}
          onMouseLeave={hideTooltip}
        >
          <div className="text-[9px] text-[#8892a4]">GIFT NIFTY GAP</div>
          <div className="flex items-center space-x-1 font-semibold">
            <span className="text-[#f0a500]">{formatPrice(giftNifty.price)}</span>
            <span className={giftNifty.gapPoints >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}>
              {giftNifty.gapPoints >= 0 ? '+' : ''}{giftNifty.gapPoints} pts ({giftNifty.gapPercent}%)
            </span>
          </div>
          {renderTooltip('gift', `Indicates Nifty opening gap bias at Singapore Exchange. Currently: ${giftNifty.direction.replace('_', ' ')}`)}
        </div>

        {/* DOW */}
        <div 
          className="p-1 px-2 relative cursor-help hover:bg-[#0d1117]/50"
          onMouseEnter={() => showTooltip('dow')}
          onMouseLeave={hideTooltip}
        >
          <div className="text-[9px] text-[#8892a4]">DOW JONES</div>
          <div className="flex items-center space-x-1">
            <span className="text-[#e6e6e6]" style={globalCues.dow.status === 'MOCK' ? { fontStyle: 'italic' } : undefined}>{formatPrice(globalCues.dow.price)}</span>
            <span className={`flex items-center ${globalCues.dow.changePercent >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}`} style={globalCues.dow.status === 'MOCK' ? { fontStyle: 'italic' } : undefined}>
              {globalCues.dow.changePercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {globalCues.dow.changePercent.toFixed(2)}%
            </span>
            {renderIndicator(globalCues.dow.status)}
          </div>
          {renderTooltip('dow', `US markets standard benchmark close. Indicates general overnight risk sentiment.`)}
        </div>

        {/* NASDAQ */}
        <div 
          className="p-1 px-2 relative cursor-help hover:bg-[#0d1117]/50"
          onMouseEnter={() => showTooltip('nasdaq')}
          onMouseLeave={hideTooltip}
        >
          <div className="text-[9px] text-[#8892a4]">NASDAQ</div>
          <div className="flex items-center space-x-1">
            <span className="text-[#e6e6e6]" style={globalCues.nasdaq.status === 'MOCK' ? { fontStyle: 'italic' } : undefined}>{formatPrice(globalCues.nasdaq.price)}</span>
            <span className={`flex items-center ${globalCues.nasdaq.changePercent >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}`} style={globalCues.nasdaq.status === 'MOCK' ? { fontStyle: 'italic' } : undefined}>
              {globalCues.nasdaq.changePercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {globalCues.nasdaq.changePercent.toFixed(2)}%
            </span>
            {renderIndicator(globalCues.nasdaq.status)}
          </div>
          {renderTooltip('nasdaq', `US tech index close. Drives Indian IT stock flows (TCS, Infosys, Wipro).`)}
        </div>

        {/* NIKKEI */}
        <div 
          className="p-1 px-2 relative cursor-help hover:bg-[#0d1117]/50"
          onMouseEnter={() => showTooltip('nikkei')}
          onMouseLeave={hideTooltip}
        >
          <div className="text-[9px] text-[#8892a4]">NIKKEI 225</div>
          <div className="flex items-center space-x-1">
            <span className="text-[#e6e6e6]" style={globalCues.nikkei.status === 'MOCK' ? { fontStyle: 'italic' } : undefined}>{formatPrice(globalCues.nikkei.price)}</span>
            <span className={`flex items-center ${globalCues.nikkei.changePercent >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}`} style={globalCues.nikkei.status === 'MOCK' ? { fontStyle: 'italic' } : undefined}>
              {globalCues.nikkei.changePercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {globalCues.nikkei.changePercent.toFixed(2)}%
            </span>
            {renderIndicator(globalCues.nikkei.status)}
          </div>
          {renderTooltip('nikkei', `Japan's stock index. Primary early morning Asian macro cue.`)}
        </div>

        {/* BRENT CRUDE */}
        <div 
          className="p-1 px-2 relative cursor-help hover:bg-[#0d1117]/50"
          onMouseEnter={() => showTooltip('crude')}
          onMouseLeave={hideTooltip}
        >
          <div className="text-[9px] text-[#8892a4]">BRENT CRUDE</div>
          <div className="flex items-center space-x-1">
            <span className="text-[#f0a500]" style={commodities.crude.status === 'MOCK' ? { fontStyle: 'italic' } : undefined}>${commodities.crude.price.toFixed(2)}</span>
            <span className={`flex items-center ${commodities.crude.changePercent <= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}`} style={commodities.crude.status === 'MOCK' ? { fontStyle: 'italic' } : undefined}>
              {commodities.crude.changePercent <= 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
              {commodities.crude.changePercent.toFixed(2)}%
            </span>
            {renderIndicator(commodities.crude.status)}
          </div>
          {renderTooltip('crude', `Brent crude prices. Lower is bullish for India (import-dependent economy).`)}
        </div>

        {/* USD / INR */}
        <div 
          className="p-1 px-2 relative cursor-help hover:bg-[#0d1117]/50"
          onMouseEnter={() => showTooltip('usdinr')}
          onMouseLeave={hideTooltip}
        >
          <div className="text-[9px] text-[#8892a4]">USD / INR</div>
          <div className="flex items-center space-x-1">
            <span className="text-[#e6e6e6]" style={commodities.usdinr.status === 'MOCK' ? { fontStyle: 'italic' } : undefined}>₹{commodities.usdinr.price.toFixed(2)}</span>
            <span className={commodities.usdinr.change <= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'} style={commodities.usdinr.status === 'MOCK' ? { fontStyle: 'italic' } : undefined}>
              {commodities.usdinr.change >= 0 ? '+' : ''}{commodities.usdinr.change.toFixed(2)}
            </span>
            {renderIndicator(commodities.usdinr.status)}
          </div>
          {renderTooltip('usdinr', `US Dollar to Indian Rupee. Rising rates trigger FII outflows from domestic equities.`)}
        </div>
      </div>

      {/* ROW 2: Volatility, Positionings & Expiry Countdown */}
      <div className="grid grid-cols-6 divide-x divide-[#21262d] bg-[#0d1117]/30 border-b border-[#21262d]">
        {/* INDIA VIX */}
        <div 
          className="p-1.5 px-2 relative cursor-help hover:bg-[#0d1117]/50"
          onMouseEnter={() => showTooltip('vix')}
          onMouseLeave={hideTooltip}
        >
          <div className="text-[9px] text-[#8892a4]">INDIA VIX</div>
          <div className="flex items-center space-x-2">
            <span className={`text-base font-bold font-mono ${vixVal > 18 ? 'text-[#ff3a3a]' : vixVal < 13 ? 'text-[#00e5a0]' : 'text-[#f0a500]'}`}>
              {vixVal.toFixed(2)}
            </span>
            <span className="text-[8px] px-1 bg-[#21262d] rounded text-[#8892a4]">{vixTrend}</span>
          </div>
          {renderTooltip('vix', `India Volatility Gauge. ${vixInterpretation}`)}
        </div>

        {/* FII NET CASH */}
        <div 
          className="p-1.5 px-2 relative cursor-help hover:bg-[#0d1117]/50"
          onMouseEnter={() => showTooltip('fii')}
          onMouseLeave={hideTooltip}
        >
          <div className="text-[9px] text-[#8892a4]">FII NET CASH FLOW</div>
          <div className={`text-sm font-bold font-mono ${institutional.fii.cash >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}`}>
            {institutional.fii.cash >= 0 ? '₹+' : '₹'}{institutional.fii.cash} Cr
          </div>
          {renderTooltip('fii', `Foreign Institutional Investors cash market net buy/sell flows today.`)}
        </div>

        {/* DII NET CASH */}
        <div 
          className="p-1.5 px-2 relative cursor-help hover:bg-[#0d1117]/50"
          onMouseEnter={() => showTooltip('dii')}
          onMouseLeave={hideTooltip}
        >
          <div className="text-[9px] text-[#8892a4]">DII NET CASH FLOW</div>
          <div className={`text-sm font-bold font-mono ${institutional.dii.cash >= 0 ? 'text-[#00e5a0]' : 'text-[#ff3a3a]'}`}>
            {institutional.dii.cash >= 0 ? '₹+' : '₹'}{institutional.dii.cash} Cr
          </div>
          {renderTooltip('dii', `Domestic Institutional Investors net cash market flows. Provides support buffers.`)}
        </div>

        {/* PUT CALL RATIO */}
        <div 
          className="p-1.5 px-2 relative cursor-help hover:bg-[#0d1117]/50"
          onMouseEnter={() => showTooltip('pcr')}
          onMouseLeave={hideTooltip}
        >
          <div className="text-[9px] text-[#8892a4]">PUT-CALL RATIO (PCR)</div>
          <div className="flex items-center space-x-1.5">
            <span className={`text-sm font-bold font-mono ${pcr > 1.2 ? 'text-[#00e5a0]' : pcr < 0.8 ? 'text-[#ff3a3a]' : 'text-[#f0a500]'}`}>
              {pcr.toFixed(2)}
            </span>
            <span className="text-[8px] text-[#8892a4]">{pcr > 1.0 ? 'BULLISH' : pcr < 0.8 ? 'BEARISH' : 'NEUTRAL'}</span>
          </div>
          {renderTooltip('pcr', `Total put open interest divided by total call open interest. PCR > 1.0 represents bullish support.`)}
        </div>

        {/* MAX PAIN */}
        <div 
          className="p-1.5 px-2 relative cursor-help hover:bg-[#0d1117]/50"
          onMouseEnter={() => showTooltip('maxpain')}
          onMouseLeave={hideTooltip}
        >
          <div className="text-[9px] text-[#8892a4]">MAX PAIN STRIKE</div>
          <div className="text-sm font-bold font-mono text-[#f0a500]">
            {maxPain}
          </div>
          {renderTooltip('maxpain', `The option strike price where option buyers face maximum collective losses near expiry. Exerts a gravitational pull.`)}
        </div>

        {/* EXPIRY COUNTDOWN */}
        <div 
          className="p-1.5 px-2 relative cursor-help hover:bg-[#0d1117]/50"
          onMouseEnter={() => showTooltip('expiry')}
          onMouseLeave={hideTooltip}
        >
          <div className="text-[9px] text-[#8892a4]">EXPIRY COUNTDOWN</div>
          <div className="flex items-center space-x-1.5 text-sm font-bold font-mono text-[#e6e6e6]">
            <Clock className="w-3.5 h-3.5 text-[#f0a500]" />
            <span>{daysToExpiry} days</span>
            <span className="text-[8px] text-[#8892a4]">(Thu)</span>
          </div>
          {renderTooltip('expiry', `Number of days until the nearest weekly index derivatives contract expiry.`)}
        </div>
      </div>
    </div>
  );
}
