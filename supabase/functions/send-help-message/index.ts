import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HelpMessageRequest {
  name: string;
  email: string;
  country: string;
  message: string;
}

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// In-memory rate limiting (resets on cold start, acceptable for edge functions)
const rateLimitStore = new Map<string, { attempts: number; resetAt: number }>();

const checkRateLimit = (ip: string, maxAttempts = 3, windowMinutes = 60): { allowed: boolean; remaining: number } => {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { attempts: 1, resetAt: now + windowMinutes * 60 * 1000 });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (record.attempts >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  record.attempts++;
  return { allowed: true, remaining: maxAttempts - record.attempts };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 3 requests per hour per IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = checkRateLimit(ip, 3, 60);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many help requests. Please try again in 1 hour.' }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { name, email, country, message }: HelpMessageRequest = await req.json();

    // Input validation
    if (!name || !email || !country || !message) {
      return new Response(
        JSON.stringify({ error: "All fields are required." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (name.length > 200 || email.length > 320 || country.length > 100 || message.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Input exceeds maximum allowed length." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending help message:", { name, country });

    const emailResponse = await resend.emails.send({
      from: "Reflectlife Support <onboarding@resend.dev>",
      to: ["sypera.sylvia@gmail.com"],
      reply_to: email,
      subject: `Help Request from ${escapeHtml(name)} (${escapeHtml(country)})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B7355;">New Help Request</h2>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Country:</strong> ${escapeHtml(country)}</p>
          </div>

          <div style="background: white; padding: 20px; border-left: 4px solid #8B7355; margin: 20px 0;">
            <p style="margin: 0;"><strong>Message:</strong></p>
            <p style="margin-top: 10px; color: #333; white-space: pre-wrap;">${escapeHtml(message)}</p>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This message was submitted through the Reflectlife Help Centre.
          </p>
        </div>
      `,
    });

    console.log("Help message sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-help-message function:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred while sending your message. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
