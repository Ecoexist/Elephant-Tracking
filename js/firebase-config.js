// Firebase configuration for Ecoexist Monitoring Portal (same project as PWA)
const firebaseConfig = {
  apiKey: "AIzaSyCpkEUmXGcuyl9jPIP3RE4QboBThO4FlRc",
  authDomain: "ecoexist-app.firebaseapp.com",
  projectId: "ecoexist-app",
  storageBucket: "ecoexist-app.firebasestorage.app",
  messagingSenderId: "542441051199",
  appId: "1:542441051199:web:013e2144976fad6827148a",
  measurementId: "G-H66S20LYVS",
  };

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithCustomToken, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  getDocs,
  query,
  limit,
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.firebasePortal = {
  auth,
  db,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  getDocs,
  query,
  limit,
  orderBy
};
