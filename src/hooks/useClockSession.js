import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'shift-clock-session';

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(STORAGE_KEY);
}

export default function useClockSession() {
  const [session, setSession] = useState(loadSession);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  const isWorking = !!session && !session.endTime;
  const isOnBreak = !!session?.breakStart;

  // Update elapsed time
  useEffect(() => {
    if (!isWorking) {
      setElapsed(0);
      return;
    }
    const tick = () => {
      const now = Date.now();
      let totalBreak = (session.totalBreakMs || 0);
      if (session.breakStart) totalBreak += now - session.breakStart;
      setElapsed(now - session.startTime - totalBreak);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [isWorking, session?.breakStart, session?.startTime, session?.totalBreakMs]);

  const startWork = useCallback(() => {
    const s = {
      startTime: Date.now(),
      endTime: null,
      breakStart: null,
      totalBreakMs: 0,
    };
    setSession(s);
    saveSession(s);
  }, []);

  const endWork = useCallback(() => {
    if (!session) return null;
    const now = Date.now();
    let totalBreak = session.totalBreakMs || 0;
    if (session.breakStart) totalBreak += now - session.breakStart;

    const startDate = new Date(session.startTime);
    const endDate = new Date(now);
    const startTimeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
    const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

    const breakMin = Math.round(totalBreak / 60000);
    const breakH = Math.floor(breakMin / 60);
    const breakM = breakMin % 60;
    const breakTimeStr = breakMin > 0 ? `${breakH}:${String(breakM).padStart(2, '0')}` : '';

    const year = startDate.getFullYear();
    const month = startDate.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

    setSession(null);
    saveSession(null);

    return {
      year,
      month,
      dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      breakTime: breakTimeStr,
    };
  }, [session]);

  const toggleBreak = useCallback(() => {
    if (!session || !isWorking) return;
    const now = Date.now();
    let updated;
    if (session.breakStart) {
      updated = {
        ...session,
        breakStart: null,
        totalBreakMs: (session.totalBreakMs || 0) + (now - session.breakStart),
      };
    } else {
      updated = { ...session, breakStart: now };
    }
    setSession(updated);
    saveSession(updated);
  }, [session, isWorking]);

  return { isWorking, isOnBreak, elapsed, startWork, endWork, toggleBreak };
}
