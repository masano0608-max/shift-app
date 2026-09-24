import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getHistory, saveToHistory, updateHistory, deleteFromHistory } from '../utils/storage';
import { getSchedules, getScheduleByMonth, saveSchedule, updateSchedule, deleteSchedule } from '../utils/scheduleStorage';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [history, setHistory] = useState([]);
  const [scheduleList, setScheduleList] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshHistory = useCallback(async () => {
    const data = await getHistory();
    setHistory(data);
    return data;
  }, []);

  const refreshSchedules = useCallback(async () => {
    const data = await getSchedules();
    setScheduleList(data);
    return data;
  }, []);

  useEffect(() => {
    Promise.all([refreshHistory(), refreshSchedules()]).finally(() => setLoading(false));
  }, [refreshHistory, refreshSchedules]);

  const value = {
    history,
    scheduleList,
    loading,
    refreshHistory,
    refreshSchedules,
    saveToHistory,
    updateHistory,
    deleteFromHistory,
    getScheduleByMonth,
    saveSchedule,
    updateSchedule,
    deleteSchedule,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
