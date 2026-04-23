import { db } from './firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';

const COL = 'schedules';

export async function getSchedules() {
  const snap = await getDocs(collection(db, COL));
  const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return records.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.month - a.month;
  });
}

export async function getScheduleByMonth(year, month) {
  const all = await getSchedules();
  return all.find((s) => s.year === year && s.month === month) || null;
}

export async function saveSchedule(record) {
  const data = { ...record, createdAt: new Date().toISOString(), editedAt: null };
  const ref = await addDoc(collection(db, COL), data);
  return { id: ref.id, ...data };
}

export async function updateSchedule(id, record) {
  const data = { ...record, editedAt: new Date().toISOString() };
  await updateDoc(doc(db, COL, id), data);
  return { id, ...data };
}

export async function deleteSchedule(id) {
  await deleteDoc(doc(db, COL, id));
}
