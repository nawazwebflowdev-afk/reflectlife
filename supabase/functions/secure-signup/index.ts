import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { attempts: number; resetAt: number }>();

const checkRateLimit = (ip: string): { allowed: boolean; remaining: number } => {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  
  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { attempts: 1, resetAt: now + 15 * 60 * 1000 });
    return { allowed: true, remaining: 4 };
  }
  
  if (record.attempts >= 5) {
    return { allowed: false, remaining: 0 };
  }
  
  record.attempts++;
  return { allowed: true, remaining: 5 - record.attempts };
};

const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Length check
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  
  // Complexity checks
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }
  
  return { valid: errors.length === 0, errors };
};

const checkPasswordBreach = async (password: string): Promise<boolean> => {
  try {
    // Create SHA-1 hash of password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    // Use k-anonymity model: send only first 5 chars
    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);
    
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    const text = await response.text();
    
    // Check if our suffix appears in the results
    const lines = text.split('\n');
    for (const line of lines) {
      const [hashSuffix] = line.split(':');
      if (hashSuffix === suffix) {
        return true; // Password found in breach database
      }
    }
    
    return false; // Password not found in breaches
  } catch (error) {
    console.error('Error checking password breach:', error);
    // In case of error, allow signup but log the issue
    return false;
  }
};

const verifyRecaptcha = async (token: string): Promise<boolean> => {
  try {
    const recaptchaSecret = Deno.env.get('RECAPTCHA_SECRET_KEY');
    if (!recaptchaSecret) {
      console.error('RECAPTCHA_SECRET_KEY not configured');
      return false;
    }
    
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${recaptchaSecret}&response=${token}`,
    });
    
    const data = await response.json();
    return data.success === true && data.score >= 0.5;
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return false;
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      fullName,
      phoneNumber, 
      country, 
      recaptchaToken,
      passwordScore 
    } = await req.json();

    // Get client IP for rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Check rate limit
    const rateLimitResult = checkRateLimit(ip);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many signup attempts. Please try again in 15 minutes.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Signup attempt from IP: ${ip}, remaining attempts: ${rateLimitResult.remaining}`);

    // Verify reCAPTCHA when token is provided (kept optional for robust fallback paths)
    if (recaptchaToken) {
      const recaptchaValid = await verifyRecaptcha(recaptchaToken);
      if (!recaptchaValid) {
        return new Response(
          JSON.stringify({ error: 'reCAPTCHA verification failed. Please try again.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate password strength (client should have checked with zxcvbn)
    if (!passwordScore || passwordScore < 3) {
      return new Response(
        JSON.stringify({ error: 'Password is too weak. Please choose a stronger password.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Server-side password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({ error: passwordValidation.errors.join(', ') }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if password has been breached
    const isBreached = await checkPasswordBreach(password);
    if (isBreached) {
      return new Response(
        JSON.stringify({ 
          error: 'This password has been exposed in a data breach. Please choose a different password.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const supabasePublic = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const normalizedFullName = (fullName || `${firstName || ''} ${lastName || ''}` || '').trim();
    const resolvedFirstName = firstName || normalizedFullName.split(' ')[0] || '';
    const resolvedLastName = lastName || normalizedFullName.split(' ').slice(1).join(' ') || '';

    const origin = req.headers.get('origin') || 'https://reflectlife.lovable.app';
    const emailRedirectTo = `${origin}/verify`;

    // Create user with admin client (email_confirm: false keeps verification required)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        first_name: resolvedFirstName,
        last_name: resolvedLastName,
        full_name: normalizedFullName || `${resolvedFirstName} ${resolvedLastName}`.trim(),
        phone_number: phoneNumber,
        country: country,
      }
    });

    if (createError) {
      console.error('User creation error:', createError);

      // Existing account: try to resend verification email and return non-fatal response
      if (createError.code === 'email_exists' || createError.message?.includes('already registered')) {
        const { error: resendExistingError } = await supabasePublic.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo,
          },
        });

        if (resendExistingError) {
          console.error('Resend error for existing user:', resendExistingError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            requiresVerification: true,
            message: 'Account already exists but is not verified. We sent a new verification email.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Account creation failed. Please try again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Always send verification email after signup creation
    const { error: resendError } = await supabasePublic.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo,
      },
    });

    if (resendError) {
      console.error('Verification resend error:', resendError);
      return new Response(
        JSON.stringify({
          error: 'Account created but verification email could not be sent. Please try again in a minute.',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User created successfully: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        requiresVerification: true,
        message: 'Account created successfully! Please check your email to confirm your account.',
        userId: userData.user.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Signup error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
