import { addDays, differenceInDays, format, getDay, isAfter, isBefore, parse, startOfDay } from 'date-fns';

export interface MarketSessionInfo {
  sessionName: string;
  isMarketOpen: boolean;
  canScan: boolean;
  countdownMinutes: number;
  istTimeString: string;
}

// Get time in IST (UTC+5:30)
export function getISTDate(): Date {
  const utc = new Date();
  // Since running in node environment, let's construct UTC and add 5h 30m offset
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(utc.getTime() + istOffset);
}

// Format Date as IST string
export function formatIST(date: Date, formatStr: string = "yyyy-MM-dd HH:mm:ss"): string {
  // We can convert the date to UTC and represent it correctly
  return format(date, formatStr);
}

// Find nearest Thursday expiry
export function getNearestExpiryDate(baseDate: Date): Date {
  const day = getDay(baseDate); // 0 = Sun, 1 = Mon, ..., 4 = Thu
  let daysToThursday = (4 - day + 7) % 7;
  
  // If today is Thursday and it is after 3:30 PM (market close), nearest expiry moves to next Thursday
  if (day === 4) {
    const marketCloseTime = new Date(baseDate);
    marketCloseTime.setHours(15, 30, 0, 0);
    if (baseDate.getTime() > marketCloseTime.getTime()) {
      daysToThursday = 7;
    }
  }

  const expiry = addDays(baseDate, daysToThursday);
  return startOfDay(expiry);
}

export function getDaysToExpiry(baseDate: Date): number {
  const expiry = getNearestExpiryDate(baseDate);
  const startOfToday = startOfDay(baseDate);
  return differenceInDays(expiry, startOfToday);
}

export function getCurrentSession(baseDate: Date): {
  sessionName: string;
  isMarketOpen: boolean;
  canScan: boolean;
  istTimeString: string;
  isAvoidWindow: boolean;
  isExpiryAfternoon: boolean;
} {
  const currentHour = baseDate.getHours();
  const currentMinute = baseDate.getMinutes();
  const dayOfWeek = getDay(baseDate); // 0=Sun, 6=Sat

  const totalMinutes = currentHour * 60 + currentMinute;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const istTimeString = format(baseDate, "HH:mm:ss");

  // NSE timings:
  // Pre-market: 9:00 to 9:15 (540 to 555 mins)
  // Market opens: 9:15 (555 mins)
  // Market closes: 15:30 (930 mins)

  if (isWeekend) {
    return {
      sessionName: "WEEKEND (CLOSED)",
      isMarketOpen: false,
      canScan: false,
      istTimeString,
      isAvoidWindow: false,
      isExpiryAfternoon: false,
    };
  }

  let sessionName = "CLOSED";
  let isMarketOpen = false;
  let canScan = false;
  let isAvoidWindow = false;

  if (totalMinutes >= 540 && totalMinutes < 555) {
    sessionName = "PRE-MARKET";
    isMarketOpen = false;
    canScan = false;
  } else if (totalMinutes >= 555 && totalMinutes < 720) {
    // 9:15 AM to 12:00 PM
    sessionName = "FIRST WINDOW";
    isMarketOpen = true;
    canScan = true;
  } else if (totalMinutes >= 720 && totalMinutes < 780) {
    // 12:00 PM to 1:00 PM
    sessionName = "LUNCH";
    isMarketOpen = true;
    canScan = true;
  } else if (totalMinutes >= 780 && totalMinutes < 930) {
    // 1:00 PM to 3:30 PM
    sessionName = "SECOND WINDOW";
    isMarketOpen = true;
    canScan = true;
  } else if (totalMinutes >= 930 && totalMinutes < 960) {
    // 3:30 PM to 4:00 PM
    sessionName = "POST-MARKET";
    isMarketOpen = false;
    canScan = false;
  } else {
    sessionName = "CLOSED";
    isMarketOpen = false;
    canScan = false;
  }

  // Avoid opening 15 min (9:15 - 9:30)
  const isOpeningAvoid = totalMinutes >= 555 && totalMinutes < 570;
  // Avoid closing 15 min (15:15 - 15:30, i.e., 915 to 930 mins)
  const isClosingAvoid = totalMinutes >= 915 && totalMinutes < 930;

  if (isOpeningAvoid || isClosingAvoid) {
    isAvoidWindow = true;
  }

  // Thursday expiry afternoon: Thursday AND daysToExpiry == 0 AND time > 2 PM (840 minutes)
  const daysToExpiry = getDaysToExpiry(baseDate);
  const isExpiryAfternoon = dayOfWeek === 4 && daysToExpiry === 0 && totalMinutes >= 840;

  return {
    sessionName,
    isMarketOpen,
    canScan,
    istTimeString,
    isAvoidWindow,
    isExpiryAfternoon,
  };
}

// Economic Calendar (hardcoded RBI policy, Union budget, etc. for next 6 months)
export interface CalendarEvent {
  name: string;
  date: string; // YYYY-MM-DD
  impact: "HIGH" | "MEDIUM" | "LOW";
  description: string;
}

export const CALENDAR_EVENTS: CalendarEvent[] = [
  { name: "RBI MPC Policy Decision", date: "2026-06-08", impact: "HIGH", description: "Interest rate decision & monetary stance announcement by RBI Governor" },
  { name: "India CPI Inflation Data", date: "2026-06-12", impact: "HIGH", description: "Consumer price inflation release for May 2026" },
  { name: "India WPI Inflation Data", date: "2026-06-14", impact: "MEDIUM", description: "Wholesale price inflation details" },
  { name: "Federal Reserve FOMC Meeting", date: "2026-06-17", impact: "HIGH", description: "US Fed interest rate decision & economic projections" },
  { name: "India IIP Output Data", date: "2026-07-10", impact: "MEDIUM", description: "Index of Industrial Production release" },
  { name: "RBI MPC Policy Decision", date: "2026-08-06", impact: "HIGH", description: "Bi-monthly credit policy announcement" },
  { name: "India CPI Inflation Data", date: "2026-07-12", impact: "HIGH", description: "Consumer price inflation release for June 2026" },
  { name: "Union Budget Mid-term Review", date: "2026-08-25", impact: "MEDIUM", description: "Government fiscal performance review" },
  { name: "Reliance Industries AGM", date: "2026-08-28", impact: "HIGH", description: "Annual General Meeting with key announcements on retail/telecom/new-energy IPOs" }
];

export function getNextCalendarEvent(baseDate: Date): {
  name: string;
  date: string;
  daysAway: number;
  impact: "HIGH" | "MEDIUM" | "LOW";
} | null {
  const startOfToday = startOfDay(baseDate);
  const futureEvents = CALENDAR_EVENTS.map(e => {
    const eventDate = parse(e.date, "yyyy-MM-dd", new Date());
    const daysAway = differenceInDays(startOfDay(eventDate), startOfToday);
    return { ...e, daysAway };
  }).filter(e => e.daysAway >= 0);

  if (futureEvents.length === 0) return null;

  // Sort by daysAway ascending
  futureEvents.sort((a, b) => a.daysAway - b.daysAway);
  return futureEvents[0];
}

export function isHighImpactEventToday(baseDate: Date): boolean {
  const todayStr = format(baseDate, "yyyy-MM-dd");
  return CALENDAR_EVENTS.some(e => e.date === todayStr && e.impact === "HIGH");
}
