import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC35rcvgYne1J3KhAd1ml3aBEyhv9Sn1NA",
  authDomain: "shift-app-9476c.firebaseapp.com",
  projectId: "shift-app-9476c",
  storageBucket: "shift-app-9476c.firebasestorage.app",
  messagingSenderId: "843024356299",
  appId: "1:843024356299:web:cefca886b4883aee451c4e",
  measurementId: "G-WELRDR25JQ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
