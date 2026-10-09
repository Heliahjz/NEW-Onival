/**
 * ============================================================================
 * فایل متمرکز تنظیمات و اتصال به فایربیس (Centralized Firebase Configuration)
 * ============================================================================
 * راهنمای انتقال سریع به هر هاست یا سرور دیگر (Firebase Hosting, Vercel, Netlify, VPS):
 * کافی است مقادیر شیء `FIREBASE_CONFIG` زیر را با اطلاعات پروژه فایربیس جدید خود جایگزین کنید.
 * تمام بخش‌های سایت (محصولات، دسته‌بندی‌ها، مقالات، سفارشات، تنظیمات ربات، لوگو و حساب ادمین)
 * به صورت خودکار به دیتابیس جدید متصل شده و در اولین اجرا داده‌های پیش‌فرض (Seed Data) را می‌سازند.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import appletConfig from '../firebase-applet-config.json';

export interface CustomFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

// ۱. تنظیمات اصلی اتصال به فایربیس (در صورت انتقال سرور فقط همین چند خط را ویرایش کنید)
export const FIREBASE_CONFIG: CustomFirebaseConfig = {
  apiKey: appletConfig.apiKey || "AIzaSyA6-ii2VGbBX2rM2kST05SDlKVbKOZTdAM",
  authDomain: appletConfig.authDomain || "gen-lang-client-0142532241.firebaseapp.com",
  projectId: appletConfig.projectId || "gen-lang-client-0142532241",
  storageBucket: appletConfig.storageBucket || "gen-lang-client-0142532241.firebasestorage.app",
  messagingSenderId: appletConfig.messagingSenderId || "113288214816",
  appId: appletConfig.appId || "1:113288214816:web:233e585ef8b3c3cdc17f45",
  // توجه: در فایربیس استاندارد معمولی اگر دیتابیس پیش‌فرض ساخته‌اید می‌توانید مقدار زیر را "(default)" بگذارید
  firestoreDatabaseId: appletConfig.firestoreDatabaseId || "(default)",
};

// کلید ذخیره تنظیمات پویا در مرورگر (برای زمانی که از داخل پنل مدیریت، کانفیگ فایربیس جدید وارد می‌کنید)
const RUNTIME_CONFIG_STORAGE_KEY = 'onival_custom_firebase_config_v1';

export function getActiveFirebaseConfig(): CustomFirebaseConfig {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(RUNTIME_CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.projectId && parsed.apiKey) {
          return { ...FIREBASE_CONFIG, ...parsed };
        }
      }
    } catch {
      // ignore storage read error
    }
  }
  return FIREBASE_CONFIG;
}

export function saveRuntimeFirebaseConfig(newConfig: CustomFirebaseConfig | null) {
  if (typeof window === 'undefined') return;
  if (!newConfig) {
    window.localStorage.removeItem(RUNTIME_CONFIG_STORAGE_KEY);
  } else {
    window.localStorage.setItem(RUNTIME_CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
  }
}

const activeConfig = getActiveFirebaseConfig();

// مقداردهی اولیه اپلیکیشن فایربیس
export const app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();

// اتصال به دیتابیس Firestore (با پشتیبانی از Database ID اختصاصی یا پیش‌فرض)
export const db =
  activeConfig.firestoreDatabaseId && activeConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, activeConfig.firestoreDatabaseId)
    : getFirestore(app);

export const auth = getAuth(app);

// تست اتصال اولیه به سرور فایربیس طبق استاندارد
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration. Client is offline.');
    }
    return false;
  }
}

testFirestoreConnection();
