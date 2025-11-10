import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    console.error('❌ SUPABASE_URL is not defined in environment variables');
}
if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables');
}
if (!supabaseAnonKey) {
    console.error('❌ SUPABASE_ANON_KEY is not defined in environment variables');
}

/**
 * Supabase client with service role (for backend operations)
 * This client bypasses Row Level Security and should only be used server-side
 */
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

/**
 * Supabase client with anon key (for user operations)
 * This respects Row Level Security policies
 */
export const supabaseClient = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Get Supabase client with user token
 * @param {string} userToken - JWT token from frontend
 * @returns {object} Supabase client configured with user session
 */
export function getSupabaseClientWithAuth(userToken) {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration is missing');
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${userToken}`
            }
        }
    });
}

// Log configuration status
if (supabaseAdmin) {
    console.log('✅ Supabase Admin client initialized');
} else {
    console.warn('⚠️  Supabase Admin client not initialized - check environment variables');
}

export default {
    admin: supabaseAdmin,
    client: supabaseClient,
    getClientWithAuth: getSupabaseClientWithAuth
};
