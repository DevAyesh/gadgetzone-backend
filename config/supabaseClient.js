const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[SUPABASE SERVICE] Supabase client initialized for storage operations');
  } catch (err) {
    console.warn('[SUPABASE WARN] Failed to initialize Supabase client:', err.message);
  }
} else {
  console.warn('[SUPABASE WARN] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured. Product image uploads to Supabase storage will be disabled.');
}

// Fallback stub that prevents server crash on startup and returns descriptive errors if storage is called
if (!supabase) {
  supabase = {
    storage: {
      from: () => ({
        upload: async () => {
          return {
            error: new Error(
              'Supabase Storage is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.'
            ),
          };
        },
        getPublicUrl: () => ({
          data: { publicUrl: '' },
        }),
        remove: async () => {
          return {
            error: new Error('Supabase Storage is not configured.'),
          };
        },
      }),
    },
  };
}

module.exports = supabase;