const STORAGE_KEY = 'shift_history';

export function getHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load history:', e);
    return [];
  }
}

export function saveToHistory(record) {
  const history = getHistory();
  const newRecord = {
    ...record,
    id: record.id || crypto.randomUUID(),
    createdAt: record.createdAt || new Date().toISOString(),
    editedAt: null,
  };
  history.unshift(newRecord);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return newRecord;
}

export function updateHistory(id, record) {
  const history = getHistory();
  const index = history.findIndex((r) => r.id === id);
  if (index === -1) return null;
  const updated = {
    ...record,
    id,
    createdAt: history[index].createdAt,
    editedAt: new Date().toISOString(),
  };
  history[index] = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return updated;
}

export function deleteFromHistory(id) {
  const history = getHistory().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
