
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Firebase Consoleに表示された設定情報を入力
const firebaseConfig = {
  apiKey: "AIzaSyAXAx_0TMdeAigDdBlXfFMEt1CgvYub6hk",
  authDomain: "store-base-3dd6d.firebaseapp.com",
  projectId: "store-base-3dd6d",
  storageBucket: "store-base-3dd6d.firebasestorage.app",
  messagingSenderId: "123845394028",
  appId: "1:123845394028:web:ee76bf1e30f9f3e84121fb"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);

// Authentication
export const auth = getAuth(app);

// Firestore
export const db = getFirestore(app);

export default app;
