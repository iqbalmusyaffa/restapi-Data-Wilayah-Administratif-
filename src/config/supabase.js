const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function isSupabaseConfigured() {
  return Boolean(supabaseUrl && (supabaseAnonKey || supabaseServiceKey));
}

function getSupabaseClient(useServiceRole = false) {
  if (!supabaseUrl) {
    throw new Error('[Supabase] SUPABASE_URL belum dikonfigurasi di file .env');
  }

  const key = useServiceRole ? (supabaseServiceKey || supabaseAnonKey) : (supabaseAnonKey || supabaseServiceKey);
  if (!key) {
    throw new Error('[Supabase] Kunci API (SUPABASE_ANON_KEY atau SUPABASE_SERVICE_ROLE_KEY) belum ada di .env');
  }

  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      }
    }
  });
}

module.exports = {
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceKey,
  isSupabaseConfigured,
  getSupabaseClient,
};
