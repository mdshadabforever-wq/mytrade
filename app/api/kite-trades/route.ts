import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

function getSavedSettings() {
  const filePath = path.join(process.cwd(), 'settings.json');
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filterDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // Alert matching parameters (optional)
    const direction = searchParams.get('direction'); // "BUY" | "SELL"
    const entryZone = searchParams.get('entry_zone') || searchParams.get('entryZone');
    const alertTime = searchParams.get('alert_time') || searchParams.get('alertTime'); // Timestamp in ms

    const settings = getSavedSettings();
    const apiKey = settings.kiteApiKey || '';
    const accessToken = settings.kiteAccessToken || '';

    if (!apiKey || !accessToken) {
      return NextResponse.json({ success: true, kite_available: false, orders: [] });
    }

    // Call Zerodha Kite API
    // GET https://api.kite.trade/orders
    // Header: Authorization: token apiKey:accessToken
    let orders: any[] = [];
    try {
      const response = await axios.get('https://api.kite.trade/orders', {
        headers: {
          'Authorization': `token ${apiKey}:${accessToken}`,
          'X-Kite-Version': '3'
        },
        timeout: 5000
      });

      if (response.data && response.data.status === 'success') {
        orders = response.data.data ?? [];
      }
    } catch (apiErr: any) {
      console.error('[KITE API ERROR] Failed to fetch orders:', apiErr.response?.data || apiErr.message);
      // Fallback: if API fails, treat as not available rather than crashing
      return NextResponse.json({ 
        success: false, 
        kite_available: true, 
        error: 'Kite API connection timeout or invalid credentials',
        orders: [] 
      });
    }

    // Filter and format completed orders for the specified date
    // Date comparison: order_timestamp usually looks like "2026-05-29 11:15:30"
    const formattedOrders = orders
      .filter((o: any) => {
        if (!o.order_timestamp) return false;
        const oDate = o.order_timestamp.split(' ')[0];
        return oDate === filterDate && o.status === 'COMPLETE';
      })
      .map((o: any) => ({
        order_id: o.order_id,
        tradingsymbol: o.tradingsymbol,
        transaction_type: o.transaction_type, // "BUY" or "SELL"
        price: Number(o.average_price || o.price || 0),
        quantity: Number(o.quantity || 0),
        status: o.status,
        order_timestamp: o.order_timestamp
      }));

    // If matching parameters are provided, let's run the match on server as well for convenience
    let matchedOrder = null;
    if (direction && entryZone && alertTime) {
      const alertTimeMs = Number(alertTime);
      
      // Parse entry zone mid-point
      let entryZoneMid = 0;
      const cleanZone = entryZone.replace(/\s/g, '');
      const parts = cleanZone.split('-');
      if (parts.length === 2) {
        entryZoneMid = (Number(parts[0]) + Number(parts[1])) / 2;
      } else {
        entryZoneMid = Number(cleanZone) || 0;
      }

      for (const order of formattedOrders) {
        // Match direction (BUY alert matches BUY order, SELL alert matches SELL order)
        if (order.transaction_type !== direction) continue;

        // Match timing (within 30 minutes of alert time)
        const orderTimeMs = new Date(order.order_timestamp.replace(/-/g, '/')).getTime();
        const timeDiff = Math.abs(orderTimeMs - alertTimeMs);
        if (timeDiff > 30 * 60 * 1000) continue;

        // Match price (within ±50 points of entry zone mid-point)
        // Extract strike price from option tradingsymbol if it represents a Nifty Option
        // Format example: NIFTY2652924000CE, extract 24000
        let orderMatchPrice = order.price;
        const strikeMatch = order.tradingsymbol.match(/NIFTY\d*[A-Z]+(\d+)(?:CE|PE)/i);
        if (strikeMatch) {
          orderMatchPrice = parseFloat(strikeMatch[1]);
        }

        const priceDiff = Math.abs(orderMatchPrice - entryZoneMid);
        if (priceDiff <= 50) {
          matchedOrder = order;
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      kite_available: true,
      orders: formattedOrders,
      matched: matchedOrder ? {
        auto_match: true,
        entry_price: matchedOrder.price,
        order_id: matchedOrder.order_id,
        tradingsymbol: matchedOrder.tradingsymbol
      } : { auto_match: false }
    });
  } catch (error: any) {
    console.error('[KITE TRADES GET] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
