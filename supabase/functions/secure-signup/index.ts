import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import SignupEmail from "../_shared/email-templates/signup.tsx";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (password.length < 8) errors.push("Password must be at least 8 characters long");
  if (!/[A-Z]/.test(password)) errors.push("Password must contain at least one uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Password must contain at least one lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("Password must contain at least one number");
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("Password must contain at least one special character");
  return { valid: errors.length === 0, errors };
};

const checkPasswordBreach = async (password: string): Promise<boolean> => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    const text = await response.text();
    for (const line of text.split('\n')) {
      const [hashSuffix] = line.split(':');
      if (hashSuffix === suffix) return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking password breach:', error);
    return false;
  }
};

const verifyRecaptcha = async (token: string): Promise<boolean> => {
  try {
    const recaptchaSecret = Deno.env.get('RECAPTCHA_SECRET_KEY');
    if (!recaptchaSecret) return false;
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${recaptchaSecret}&response=${token}`,
    });
    const data = await response.json();
    return data.success === true && data.score >= 0.5;
  } catch {
    return false;
  }
};

/**
 * Send branded verification email directly via Resend API.
 * This completely bypasses Supabase's built-in email sending and its rate limits.
 */
async function sendVerificationEmail(
  recipientEmail: string,
  userId: string,
  supabaseUrl: string,
): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not set');
    return { success: false, error: 'Email service not configured' };
  }

  // Generate a verification link using the admin API
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Generate a magic link that will confirm the user's email
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email: recipientEmail,
    options: {
      redirectTo: 'https://reflectlife.net/verify',
    },
  });

  if (linkError || !linkData) {
    console.error('Generate link error:', linkError);
    return { success: false, error: 'Could not generate verification link' };
  }

  // Build the confirmation URL using the hashed token
  const properties = linkData.properties;
  const tokenHash = properties?.hashed_token;
  const verifyUrl = new URL(`${supabaseUrl}/auth/v1/verify`);
  verifyUrl.searchParams.set('token', tokenHash);
  verifyUrl.searchParams.set('type', 'signup');
  verifyUrl.searchParams.set('redirect_to', 'https://reflectlife.net/dashboard');
  const confirmationUrl = verifyUrl.toString();

  // Render the branded email template
  const html = await renderAsync(
    SignupEmail({
      siteName: 'Reflectlife',
      siteUrl: 'https://reflectlife.net',
      confirmationUrl,
      recipient: recipientEmail,
    })
  );

  // Send via Resend
  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'ReflectLife <noreply@reflectlife.net>',
      to: [recipientEmail],
      subject: 'Welcome to ReflectLife — Confirm your email',
      html,
    }),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    console.error('Resend API error:', emailResponse.status, errorText);
    return { success: false, error: 'Failed to send verification email' };
  }

  console.log('Verification email sent successfully to:', recipientEmail);
  return { success: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      email, password, firstName, lastName, fullName,
      phoneNumber, country, recaptchaToken, passwordScore,
    } = await req.json();

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = checkRateLimit(ip);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many signup attempts. Please try again in 15 minutes.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Signup attempt from IP: ${ip}, remaining attempts: ${rateLimitResult.remaining}`);

    if (recaptchaToken) {
      const recaptchaValid = await verifyRecaptcha(recaptchaToken);
      if (!recaptchaValid) {
        return new Response(
          JSON.stringify({ error: 'reCAPTCHA verification failed. Please try again.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!passwordScore || passwordScore < 3) {
      return new Response(
        JSON.stringify({ error: 'Password is too weak. Please choose a stronger password.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({ error: passwordValidation.errors.join(', ') }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isBreached = await checkPasswordBreach(password);
    if (isBreached) {
      return new Response(
        JSON.stringify({ error: 'This password has been exposed in a data breach. Please choose a different password.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const normalizedFullName = (fullName || `${firstName || ''} ${lastName || ''}` || '').trim();
    const resolvedFirstName = firstName || normalizedFullName.split(' ')[0] || '';
    const resolvedLastName = lastName || normalizedFullName.split(' ').slice(1).join(' ') || '';

    // Create user WITHOUT confirming email — verification required
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
      },
    });

    if (createError) {
      console.error('User creation error:', createError);

      const isExisting =
        createError.code === 'email_exists' ||
        createError.message?.includes('already registered') ||
        createError.code === 'unexpected_failure';

      if (isExisting) {
        // For existing unverified users, send a new verification email directly via Resend
        const emailResult = await sendVerificationEmail(email, '', supabaseUrl);

        return new Response(
          JSON.stringify({
            success: true,
            requiresVerification: true,
            message: emailResult.success
              ? 'We sent a new verification email. Please check your inbox.'
              : 'Account already exists. Please sign in or check your inbox for an earlier verification email.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Account creation failed. Please try again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User created successfully: ${email}`);

    // Send branded verification email directly via Resend (bypasses Supabase email rate limits)
    const emailResult = await sendVerificationEmail(email, userData.user.id, supabaseUrl);

    if (!emailResult.success) {
      console.error('Failed to send verification email after signup:', emailResult.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        requiresVerification: true,
        message: 'Account created! Please check your email to verify your account.',
        userId: userData.user.id,
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
