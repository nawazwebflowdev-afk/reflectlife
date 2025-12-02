/**
 * Centralized environment configuration
 * This project uses Supabase with hardcoded credentials (standard for Lovable projects)
 * Environment variables are managed through Supabase Edge Function secrets
 */

export const ENV = {
  // Supabase Configuration (public, safe to expose)
  SUPABASE_URL: "https://jysvczctvaubgyphcllo.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5c3ZjemN0dmF1Ymd5cGhjbGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwODE2MTMsImV4cCI6MjA3NjY1NzYxM30.eWM7gr-wgOR0coC62XoJKjNvUhr1YWCFR2zlf2iL5Es",
  SUPABASE_PROJECT_ID: "jysvczctvaubgyphcllo",
  
  // API Timeouts
  QUERY_TIMEOUT_MS: 10000, // 10 seconds
  AUTH_TIMEOUT_MS: 5000,   // 5 seconds
  
  // Feature Flags
  ENABLE_DEBUG_LOGGING: import.meta.env.DEV,
} as const;

// Validation function to ensure critical config exists
export const validateEnv = (): boolean => {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missing = required.filter(key => !ENV[key as keyof typeof ENV]);
  
  if (missing.length > 0) {
    console.error(`Missing required configuration: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
};

// Log config status in development
if (ENV.ENABLE_DEBUG_LOGGING) {
  console.log('Environment configuration loaded:', {
    supabaseUrl: ENV.SUPABASE_URL,
    projectId: ENV.SUPABASE_PROJECT_ID,
  });
}
