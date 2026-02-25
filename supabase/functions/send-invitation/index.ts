import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

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
  senderId: string;
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
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authenticatedUserId = claimsData.claims.sub;

    const { recipientEmail, personName, senderName, connectionId, senderId }: InvitationRequest = await req.json();

    // Verify senderId matches authenticated user
    if (senderId !== authenticatedUserId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate inputs
    if (!recipientEmail || !personName || !senderName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!isValidEmail(recipientEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (personName.length > 200 || senderName.length > 100) {
      return new Response(JSON.stringify({ error: "Input exceeds maximum length" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Sending invitation email to:", recipientEmail);

    // Use service role for DB operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if recipient is already a registered user
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", recipientEmail)
      .single();

    const isRegistered = !!existingUser;

    // Log invitation in database
    const { error: inviteError } = await supabase
      .from("memorial_invitations")
      .insert({
        inviter_id: senderId,
        invitee_email: recipientEmail,
        connection_id: connectionId,
        status: "pending",
      });

    if (inviteError) {
      console.error("Error logging invitation:", inviteError);
    }

    const safePersonName = escapeHtml(personName);
    const safeSenderName = escapeHtml(senderName);

    // Prepare URLs based on registration status
    let ctaUrl: string;
    let ctaText: string;
    let emailSubject: string;
    let emailIntro: string;

    if (isRegistered) {
      ctaUrl = `https://reflectlife.lovable.app/tree?connection=${encodeURIComponent(connectionId)}`;
      ctaText = "View &amp; Contribute 🌿";
      emailSubject = `${safeSenderName} invited you to contribute to ${safePersonName}'s tree`;
      emailIntro = `<strong>${safeSenderName}</strong> has invited you to contribute memories and tributes for:`;
    } else {
      const redirectUrl = encodeURIComponent(`/tree?connection=${connectionId}`);
      ctaUrl = `https://reflectlife.lovable.app/signup?redirect=${redirectUrl}`;
      ctaText = "Sign Up &amp; Contribute 🌿";
      emailSubject = `${safeSenderName} invited you to join Reflectlife and contribute to ${safePersonName}'s tree`;
      emailIntro = `<strong>${safeSenderName}</strong> has invited you to join Reflectlife and contribute memories for:`;
    }
    
    const emailResponse = await resend.emails.send({
      from: "Reflectlife <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: emailSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #8B7355; margin: 0;">💐 Reflectlife</h1>
            <p style="color: #666; margin-top: 10px;">Keeping memories alive, together</p>
          </div>

          <div style="background: linear-gradient(135deg, #f5f5f5 0%, #faf8f6 100%); padding: 30px; border-radius: 12px; margin: 20px 0;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              ${emailIntro}
            </p>
            
            <div style="text-align: center; background: white; padding: 25px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #8B7355; margin: 0 0 10px 0; font-size: 24px;">${safePersonName}</h2>
              <p style="color: #666; margin: 0;">Share your stories, photos, and memories</p>
            </div>

            <p style="color: #555; line-height: 1.6; margin: 20px 0;">
              Your contributions will help celebrate and honor ${safePersonName}'s life and legacy. 
              This is a space where friends and family can come together to remember and share.
            </p>

            ${!isRegistered ? `
              <p style="color: #555; line-height: 1.6; margin: 20px 0; padding: 15px; background: #fff3cd; border-radius: 6px; border-left: 4px solid #8B7355;">
                <strong>New to Reflectlife?</strong><br>
                Create a free account to start contributing and preserving precious memories.
              </p>
            ` : ''}

            <div style="text-align: center; margin-top: 30px;">
              <a href="${ctaUrl}" 
                 style="display: inline-block; background: #8B7355; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                ${ctaText}
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

    console.log("Invitation email sent successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      isRegistered,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred while sending the invitation" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
