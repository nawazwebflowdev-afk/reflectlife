import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

interface ShareEmailRequest {
  recipientEmail: string;
  postId: string;
  postCaption: string;
  senderName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail, postId, postCaption, senderName }: ShareEmailRequest = await req.json();

    console.log("Sending share email:", { recipientEmail, postId, senderName });

    const postUrl = `https://reflectlife.lovable.app/timeline#post-${postId}`;
    
    const emailResponse = await resend.emails.send({
      from: "Reflectlife <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `${escapeHtml(senderName)} shared a memory with you`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #8B7355; margin: 0;">💐 Reflectlife</h1>
            <p style="color: #666; margin-top: 10px;">Keeping memories alive, together</p>
          </div>

          <div style="background: linear-gradient(135deg, #f5f5f5 0%, #faf8f6 100%); padding: 30px; border-radius: 12px; margin: 20px 0;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              <strong>${escapeHtml(senderName)}</strong> has shared a special memory with you:
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #8B7355;">
              <p style="color: #555; line-height: 1.6; margin: 0;">
                ${postCaption ? escapeHtml(postCaption) : "A meaningful memory from their journey"}
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${postUrl}" 
                 style="display: inline-block; background: #8B7355; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                View Memory
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

    console.log("Share email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-share-email function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to share this memory. Please try again later." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
