import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  recipientEmail: string;
  personName: string;
  senderName: string;
  connectionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail, personName, senderName, connectionId }: InvitationRequest = await req.json();

    console.log("Sending invitation email:", { recipientEmail, personName, senderName });

    const tributeUrl = `https://reflectlife.lovable.app/tree?connection=${connectionId}`;
    
    const emailResponse = await resend.emails.send({
      from: "Reflectlife <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `${senderName} invited you to share memories of ${personName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #8B7355; margin: 0;">💐 Reflectlife</h1>
            <p style="color: #666; margin-top: 10px;">Keeping memories alive, together</p>
          </div>

          <div style="background: linear-gradient(135deg, #f5f5f5 0%, #faf8f6 100%); padding: 30px; border-radius: 12px; margin: 20px 0;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              <strong>${senderName}</strong> has invited you to contribute memories and tributes for:
            </p>
            
            <div style="text-align: center; background: white; padding: 25px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #8B7355; margin: 0 0 10px 0; font-size: 24px;">${personName}</h2>
              <p style="color: #666; margin: 0;">Share your stories, photos, and memories</p>
            </div>

            <p style="color: #555; line-height: 1.6; margin: 20px 0;">
              Your contributions will help celebrate and honor ${personName}'s life and legacy. 
              This is a space where friends and family can come together to remember and share.
            </p>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${tributeUrl}" 
                 style="display: inline-block; background: #8B7355; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Add Your Tribute 🕯️
              </a>
            </div>
          </div>

          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
            Reflectlife is a space to celebrate, honor, and remember loved ones.<br>
            <a href="https://reflectlife.lovable.app" style="color: #8B7355; text-decoration: none;">Visit Reflectlife</a>
          </p>
        </div>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
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
