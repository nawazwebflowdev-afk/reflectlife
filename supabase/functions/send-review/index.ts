import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReviewRequest {
  userName: string;
  userEmail: string;
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

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userName, userEmail, rating, message }: ReviewRequest = await req.json();

    // Validate inputs
    if (!userName || !userEmail || !message || rating === undefined) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!isValidEmail(userEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
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

    if (userName.length > 100 || message.length > 2000) {
      return new Response(JSON.stringify({ error: "Input exceeds maximum length" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

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
