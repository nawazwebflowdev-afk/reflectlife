import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userName, userEmail, rating, message }: ReviewRequest = await req.json();

    console.log("Sending review email:", { userName, userEmail, rating });

    const stars = "⭐".repeat(rating);
    
    const emailResponse = await resend.emails.send({
      from: "Reflectlife Reviews <onboarding@resend.dev>",
      to: ["sypera.sylvia@gmail.com"],
      subject: `New Review from ${userName} - ${stars}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B7355;">New Review Received</h2>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>From:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Rating:</strong> ${stars} (${rating}/5)</p>
          </div>

          <div style="background: white; padding: 20px; border-left: 4px solid #8B7355; margin: 20px 0;">
            <p style="margin: 0;"><strong>Review:</strong></p>
            <p style="margin-top: 10px; color: #333;">${message}</p>
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
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
