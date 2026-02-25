import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReviewRequest {
  rating: number;
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

// Rate limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (key: string, max = 3, windowMin = 60): boolean => {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMin * 60 * 1000 });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    // Rate limit per user
    if (!checkRateLimit(userId, 3, 60)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { rating, message }: ReviewRequest = await req.json();

    if (!message || rating === undefined) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: "Rating must be between 1 and 5" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (message.length > 2000) {
      return new Response(JSON.stringify({ error: "Message exceeds maximum length" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user profile name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, first_name, last_name")
      .eq("id", userId)
      .single();

    const userName = profile?.full_name || 
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || 
      "Anonymous User";

    const stars = "⭐".repeat(rating);
    
    const emailResponse = await resend.emails.send({
      from: "Reflectlife Reviews <onboarding@resend.dev>",
      to: ["sypera.sylvia@gmail.com"],
      subject: `New Review from ${escapeHtml(userName)} - ${stars}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B7355;">New Review Received</h2>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>From:</strong> ${escapeHtml(userName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(userEmail)}</p>
            <p><strong>User ID:</strong> ${userId}</p>
            <p><strong>Rating:</strong> ${stars} (${rating}/5)</p>
          </div>

          <div style="background: white; padding: 20px; border-left: 4px solid #8B7355; margin: 20px 0;">
            <p style="margin: 0;"><strong>Review:</strong></p>
            <p style="margin-top: 10px; color: #333;">${escapeHtml(message)}</p>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This review was submitted through the Reflectlife Settings page.
          </p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-review function:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred while submitting the review" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
