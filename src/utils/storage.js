import { db } from './firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';

const COL = 'history';

export async function getHistory() {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveToHistory(record) {
  const data = {
    ...record,
    createdAt: new Date().toISOString(),
    editedAt: null,
  };
  const ref = await addDoc(collection(db, COL), data);
  return { id: ref.id, ...data };
}

export async function updateHistory(id, record) {
  const data = {
    ...record,
    editedAt: new Date().toISOString(),
  };
  await updateDoc(doc(db, COL, id), data);
  return { id, ...data };
}

export async function deleteFromHistory(id) {
  await deleteDoc(doc(db, COL, id));
}
