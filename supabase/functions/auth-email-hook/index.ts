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

  // Log the full payload structure for debugging
  console.log("Raw payload keys:", Object.keys(body));
  console.log("Full payload:", JSON.stringify(body).substring(0, 500));

  // Extract event data - handle both direct and nested payload formats
  const event = body.event || body;

  // The action type can be in email_action_type (actual auth events) or type (health checks / some formats)
  const email_action_type = event.email_action_type || event.type;

  console.log("Received auth email event:", email_action_type);

  // Health check pings only have { type: "..." } with no email data - respond OK
  if (!event.email_data && !event.token_hash && !event.token && Object.keys(event).length <= 1) {
    console.log("Health check ping for type:", email_action_type);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const {
    token_hash,
    token,
    redirect_to,
    site_url,
    email_data,
  } = event;

  const siteName = "ReflectLife";
  const siteUrl = site_url || "https://reflectlife.net";

  // Build the confirmation URL (prefer provider-generated links when available)
  let confirmationUrl =
    event?.confirmation_url ||
    event?.action_link ||
    email_data?.confirmation_url ||
    email_data?.action_link ||
    "";

  if (!confirmationUrl && token_hash && email_action_type) {
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

  const recipient = email_data?.email || "";
  const newEmail = email_data?.new_email || "";

  let html = "";
  let subject = "";

  try {
    switch (email_action_type) {
      case "signup": {
        subject = "Welcome to ReflectLife — Confirm your email";
        html = await renderAsync(SignupEmail({ siteName, siteUrl, confirmationUrl, recipient }));
        break;
      }
      case "recovery": {
        subject = "Reset your ReflectLife password";
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

  // Send via Lovable Email API callback
  const callbackUrl = Deno.env.get("CALLBACK_URL");
  if (!callbackUrl) {
    console.error("CALLBACK_URL not set");
    return new Response(JSON.stringify({ error: "Email callback not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const emailResponse = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        to: recipient,
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Failed to send email:", errorText);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Email sent successfully to:", recipient);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (sendErr) {
    console.error("Error sending email:", sendErr);
    return new Response(JSON.stringify({ error: "Failed to send email" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
