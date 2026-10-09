/// <reference types="vite/client" />

/**
 * ============================================================================
 * فایل متمرکز تنظیمات و اتصال به سوپابیس (Centralized Supabase Configuration)
 * ============================================================================
 * راهنمای انتقال سریع به هر هاست یا سرور دیگر (Netlify, Vercel, VPS):
 * کافی است متغیرهای محیطی `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` را تنظیم کنید
 * یا مقادیر پیش‌فرض زیر را ویرایش نمایید.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface CustomSupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const envUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_URL
    : undefined;

const envAnonKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : undefined;

export const SUPABASE_CONFIG: CustomSupabaseConfig = {
  supabaseUrl: envUrl || 'https://sppuyexofedtbbiexjem.supabase.co',
  supabaseAnonKey: envAnonKey || 'sb_publishable_UlrsnfAZb6dXUda0e3B0Gg_WFgZftJ-',
};

const RUNTIME_SUPABASE_CONFIG_KEY = 'onival_custom_supabase_config_v1';

export function getActiveSupabaseConfig(): CustomSupabaseConfig {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(RUNTIME_SUPABASE_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.supabaseUrl && parsed.supabaseAnonKey) {
          return {
            supabaseUrl: String(parsed.supabaseUrl).trim(),
            supabaseAnonKey: String(parsed.supabaseAnonKey).trim(),
          };
        }
      }
    } catch {
      // ignore localStorage read errors
    }
  }
  return SUPABASE_CONFIG;
}

export function saveRuntimeSupabaseConfig(newConfig: CustomSupabaseConfig | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!newConfig) {
      window.localStorage.removeItem(RUNTIME_SUPABASE_CONFIG_KEY);
    } else {
      window.localStorage.setItem(RUNTIME_SUPABASE_CONFIG_KEY, JSON.stringify(newConfig));
    }
  } catch {
    // ignore storage errors
  }
}

const activeConfig = getActiveSupabaseConfig();

export const supabase: SupabaseClient = createClient(
  activeConfig.supabaseUrl,
  activeConfig.supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  tablesReady: boolean;
  message?: string;
}> {
  try {
    const { error } = await supabase.from('products').select('id').limit(1);
    if (!error) {
      return { connected: true, tablesReady: true };
    }
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      return {
        connected: true,
        tablesReady: false,
        message: 'اتصال به سرور Supabase برقرار است (جداول آماده ایجاد در SQL Editor هستند).',
      };
    }
    return { connected: true, tablesReady: false, message: error.message };
  } catch (err: any) {
    return {
      connected: false,
      tablesReady: false,
      message: err?.message || 'خطا در برقراری ارتباط با Supabase',
    };
  }
}
