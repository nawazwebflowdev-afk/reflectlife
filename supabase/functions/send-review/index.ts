import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface ReviewRequest {
  userName: string;
  userEmail: string;
  rating: number;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { userName, userEmail, rating, message }: ReviewRequest = await req.json();

    console.log("Sending review email:", { userName, rating });

    const stars = "⭐".repeat(Math.min(Math.max(Math.round(rating), 1), 5));
    
    const emailResponse = await resend.emails.send({
      from: "Reflectlife Reviews <noreply@reflectlife.app>",
      to: ["sypera.sylvia@gmail.com"],
      subject: `New Review from ${escapeHtml(userName)} - ${stars}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B7355;">New Review Received</h2>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>From:</strong> ${escapeHtml(userName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(userEmail)}</p>
            <p><strong>Rating:</strong> ${stars} (${Math.min(Math.max(Math.round(rating), 1), 5)}/5)</p>
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

    console.log("Review email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-review function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to submit your review. Please try again later." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
