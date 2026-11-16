
import { auth } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// 新規会員登録
export async function registerUser(email, password) {
  try {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    return {
      success: true,
      user: result.user
    };

  } catch (error) {
    return {
      success: false,
      message: getAuthError(error.code)
    };
  }
}

// ログイン
export async function loginUser(email, password) {
  try {
    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    return {
      success: true,
      user: result.user
    };

  } catch (error) {
    return {
      success: false,
      message: getAuthError(error.code)
    };
  }
}

// ログアウト
export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };

  } catch (error) {
    return {
      success: false,
      message: "ログアウトに失敗しました"
    };
  }
}

// エラーメッセージ
function getAuthError(code) {
  const messages = {
    "auth/email-already-in-use":
      "このメールアドレスは既に登録されています。",
    "auth/invalid-email":
      "メールアドレスの形式が正しくありません。",
    "auth/weak-password":
      "パスワードは6文字以上にしてください。",
    "auth/invalid-credential":
      "メールアドレスまたはパスワードが違います。",
    "auth/too-many-requests":
      "時間をおいて再度お試しください。"
  };

  return messages[code] || "エラーが発生しました。";
}
