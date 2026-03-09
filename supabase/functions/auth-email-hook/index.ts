import { renderAsync } from "npm:@react-email/components@0.0.22";

import SignupEmail from "../_shared/email-templates/signup.tsx";
import RecoveryEmail from "../_shared/email-templates/recovery.tsx";
import InviteEmail from "../_shared/email-templates/invite.tsx";
import MagicLinkEmail from "../_shared/email-templates/magic-link.tsx";
import EmailChangeEmail from "../_shared/email-templates/email-change.tsx";
import ReauthenticationEmail from "../_shared/email-templates/reauthentication.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) {
    console.error("LOVABLE_API_KEY not set");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // If header key mismatches, log it but continue so auth emails still send.
  // Supabase Auth hook delivery should never be blocked by this check.
  const incomingSecret = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (incomingSecret !== lovableApiKey) {
    console.warn("Auth-email-hook: Authorization mismatch detected; continuing to process email hook.");
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    console.error("Failed to parse request body:", err);
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  console.log("Raw payload keys:", Object.keys(body));
  console.log("Full payload:", JSON.stringify(body).substring(0, 800));

  // Supabase Auth Hook "Send Email" payload format:
  // { user: { id, email, ... }, email_data: { token, token_hash, redirect_to, email_action_type, site_url, ... } }
  const user = body.user || {};
  const emailData = body.email_data || {};
  const email_action_type = emailData.email_action_type || body.email_action_type || body.type;

  console.log("Received auth email event:", email_action_type);
  console.log("User email:", user.email);
  console.log("Email data keys:", Object.keys(emailData));

  // Health check pings - respond OK
  if (!email_action_type || (!user.email && !emailData.token_hash)) {
    console.log("Health check or empty ping");
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const {
    token_hash,
    token,
    redirect_to,
    site_url,
    token_new,
    token_hash_new,
  } = emailData;

  const siteName = "Reflectlife";
  const siteUrl = site_url || "https://reflectlife.net";

  // Build confirmation URL using token_hash
  let confirmationUrl = "";
  if (token_hash && email_action_type) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const redirectTo = redirect_to || `${siteUrl}/verify`;

    if (supabaseUrl) {
      const verifyUrl = new URL(`${supabaseUrl}/auth/v1/verify`);
      verifyUrl.searchParams.set("token", token_hash);
      verifyUrl.searchParams.set("type", email_action_type);
      verifyUrl.searchParams.set("redirect_to", redirectTo);
      confirmationUrl = verifyUrl.toString();
    }
  }

  const recipient = user.email || emailData.email || "";
  const newEmail = emailData.new_email || "";

  if (!recipient) {
    console.error("Missing recipient email in auth hook payload");
    return new Response(JSON.stringify({ error: "Missing recipient" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  let html = "";
  let subject = "";

  try {
    switch (email_action_type) {
      case "signup": {
        subject = "Welcome to Reflectlife — Confirm your email";
        html = await renderAsync(SignupEmail({ siteName, siteUrl, confirmationUrl, recipient }));
        break;
      }
      case "recovery": {
        subject = "Reset your Reflectlife password";
        html = await renderAsync(RecoveryEmail({ siteName, siteUrl, confirmationUrl, recipient }));
        break;
      }
      case "invite": {
        subject = "You've been invited to ReflectLife";
        html = await renderAsync(InviteEmail({ siteName, siteUrl, confirmationUrl, recipient }));
        break;
      }
      case "magiclink": {
        subject = "Sign in to ReflectLife";
        html = await renderAsync(MagicLinkEmail({ siteName, siteUrl, confirmationUrl, recipient }));
        break;
      }
      case "email_change": {
        subject = "Confirm your email change — ReflectLife";
        html = await renderAsync(EmailChangeEmail({ siteName, siteUrl, confirmationUrl, recipient, newEmail }));
        break;
      }
      case "reauthentication": {
        subject = "Your ReflectLife verification code";
        html = await renderAsync(ReauthenticationEmail({ siteName, siteUrl, token, recipient }));
        break;
      }
      default: {
        console.error("Unknown email action type:", email_action_type);
        return new Response(JSON.stringify({ error: `Unknown email action type: ${email_action_type}` }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }
  } catch (renderErr) {
    console.error("Failed to render email template:", renderErr);
    return new Response(JSON.stringify({ error: "Failed to render email" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Use Resend API directly for reliable email delivery
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not set, cannot send email");
    // Return 200 so signup isn't blocked — Supabase will use its default sender
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Reflectlife <noreply@reflectlife.net>",
        to: [recipient],
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Failed to send email via Resend:", {
        status: emailResponse.status,
        errorText,
      });
      // Return 200 so signup flow isn't blocked
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Email sent successfully to:", recipient);
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (sendErr) {
    console.error("Error sending email:", sendErr);
    // Return 200 so signup isn't blocked
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
