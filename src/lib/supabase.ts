import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasPublicCredentials = Boolean(supabaseUrl && supabaseAnonKey);

const createPublicClient = () => {
  if (!hasPublicCredentials) {
    throw new Error("Supabase public credentials are missing.");
  }

  return createClient(supabaseUrl as string, supabaseAnonKey as string);
};

let browserClient: SupabaseClient | undefined;

export const getSupabaseBrowserClient = () => {
  if (!browserClient) {
    browserClient = createPublicClient();
  }

  return browserClient;
};

export const getSupabaseServerClient = () => {
  if (!hasPublicCredentials) {
    throw new Error("Supabase URL or anon key is missing.");
  }

  return createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const getSupabaseAdminClient = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase URL or service role key is missing.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
