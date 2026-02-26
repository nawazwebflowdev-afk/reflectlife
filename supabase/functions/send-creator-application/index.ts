import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreatorApplicationRequest {
  applicantEmail: string;
  displayName: string;
  country: string;
  description: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicantEmail, displayName, country, description }: CreatorApplicationRequest = await req.json();

    console.log("Sending creator application emails for:", applicantEmail);

    // Send confirmation email to applicant
    const applicantEmail$ = resend.emails.send({
      from: "Reflectlife <onboarding@resend.dev>",
      to: [applicantEmail],
      subject: "We received your Creator application! 🎨",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #8B7355; margin: 0;">🎨 Reflectlife</h1>
            <p style="color: #666; margin-top: 10px;">Creator Programme</p>
          </div>

          <div style="background: linear-gradient(135deg, #f5f5f5 0%, #faf8f6 100%); padding: 30px; border-radius: 12px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Hi ${displayName},</h2>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Thank you for applying to become a <strong>Reflectlife Creator</strong>! We're excited about your interest in designing memorial templates.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #8B7355; margin-top: 0;">What happens next?</h3>
              <ul style="color: #555; line-height: 1.8; padding-left: 20px;">
                <li>Our team will review your application within <strong>24–48 hours</strong></li>
                <li>You'll receive an email once your application is approved</li>
                <li>After approval, you can start uploading and selling your templates</li>
              </ul>
            </div>

            <p style="color: #555; line-height: 1.6;">
              In the meantime, feel free to explore Reflectlife and prepare your first template design!
            </p>
          </div>

          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
            <a href="https://reflectlife.lovable.app" style="color: #8B7355; text-decoration: none;">Visit Reflectlife</a>
          </p>
        </div>
      `,
    });

    // Send notification email to admin
    const adminEmail$ = resend.emails.send({
      from: "Reflectlife <onboarding@resend.dev>",
      to: ["sypera.sylvia@gmail.com"],
      subject: `New Creator Application: ${displayName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #8B7355;">New Creator Application</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; color: #333;">Name:</td><td style="padding: 8px; color: #555;">${displayName}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #333;">Email:</td><td style="padding: 8px; color: #555;">${applicantEmail}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #333;">Country:</td><td style="padding: 8px; color: #555;">${country}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #333;">Description:</td><td style="padding: 8px; color: #555;">${description}</td></tr>
          </table>
          <div style="margin-top: 20px; text-align: center;">
            <a href="https://reflectlife.lovable.app/admin/creator-requests" 
               style="display: inline-block; background: #8B7355; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Review Application
            </a>
          </div>
        </div>
      `,
    });

    const [applicantResult, adminResult] = await Promise.all([applicantEmail$, adminEmail$]);

    console.log("Emails sent:", { applicantResult, adminResult });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending creator application emails:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send notification emails." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
