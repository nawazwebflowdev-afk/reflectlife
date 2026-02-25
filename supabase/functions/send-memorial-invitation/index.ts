import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MemorialInvitationRequest {
  recipientEmail: string;
  memorialId: string;
  memorialName: string;
  memorialDescription: string;
  memorialUrl: string;
  senderName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
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

    const {
      recipientEmail,
      memorialId,
      memorialName,
      memorialDescription,
      memorialUrl,
      senderName,
    }: MemorialInvitationRequest = await req.json();

    // Validate inputs
    if (!recipientEmail || !memorialName || !memorialUrl) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Sending memorial invitation to:", recipientEmail);

    const emailResponse = await resend.emails.send({
      from: "Reflectlife <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `${senderName} shared a memorial with you`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9fafb;
              }
              .container {
                background-color: #ffffff;
                border-radius: 12px;
                padding: 32px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
              }
              .header {
                text-align: center;
                margin-bottom: 32px;
              }
              .logo {
                font-size: 28px;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 8px;
              }
              .subtitle {
                color: #6b7280;
                font-size: 14px;
              }
              .memorial-name {
                font-size: 24px;
                font-weight: 600;
                color: #1a1a1a;
                margin: 24px 0 16px;
                text-align: center;
              }
              .description {
                color: #4b5563;
                font-size: 16px;
                margin-bottom: 24px;
                text-align: center;
                line-height: 1.8;
              }
              .cta-button {
                display: inline-block;
                background-color: #6366f1;
                color: #ffffff !important;
                text-decoration: none;
                padding: 14px 32px;
                border-radius: 8px;
                font-weight: 600;
                text-align: center;
                margin: 24px auto;
                display: block;
                width: fit-content;
                transition: background-color 0.2s;
              }
              .cta-button:hover {
                background-color: #4f46e5;
              }
              .footer {
                margin-top: 32px;
                padding-top: 24px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                color: #6b7280;
                font-size: 14px;
              }
              .divider {
                height: 1px;
                background-color: #e5e7eb;
                margin: 24px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🕊️ Reflectlife</div>
                <div class="subtitle">Honoring memories, celebrating lives</div>
              </div>
              
              <p style="font-size: 16px; color: #1a1a1a; margin-bottom: 24px;">
                Hello,
              </p>
              
              <p style="font-size: 16px; color: #4b5563; margin-bottom: 16px;">
                <strong>${senderName}</strong> has invited you to view and honor a memorial on Reflectlife.
              </p>
              
              <div class="memorial-name">${memorialName}</div>
              
              ${memorialDescription ? `
                <div class="description">
                  ${memorialDescription}
                </div>
              ` : ''}
              
              <a href="${memorialUrl}" class="cta-button">
                View Memorial & Add Tribute
              </a>
              
              <div class="divider"></div>
              
              <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 24px;">
                On this memorial page, you can:
              </p>
              <ul style="color: #4b5563; font-size: 14px; text-align: left; margin: 16px auto; max-width: 400px;">
                <li>View cherished memories and photos</li>
                <li>Leave a heartfelt tribute message</li>
                <li>Honor and celebrate a life well-lived</li>
              </ul>
              
              <div class="footer">
                <p style="margin: 8px 0;">
                  With compassion,<br>
                  <strong>The Reflectlife Team</strong>
                </p>
                <p style="margin: 16px 0 0; font-size: 12px;">
                  If you have questions, please reach out to us at 
                  <a href="mailto:sypera.sylvia@gmail.com" style="color: #6366f1; text-decoration: none;">
                    sypera.sylvia@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Memorial invitation sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending memorial invitation:", error);
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
