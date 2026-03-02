import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
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

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  const webhookSecret = Deno.env.get("LOVABLE_API_KEY");
  if (!webhookSecret) {
    console.error("LOVABLE_API_KEY not set");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Strip prefix if present for webhook verification
  const secret = webhookSecret.replace(/^v1,whsec_/, "");

  const wh = new Webhook(secret);
  let event: any;
  try {
    event = wh.verify(payload, headers);
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const {
    email_action_type,
    token_hash,
    token,
    redirect_to,
    site_url,
    email_data,
  } = event;

  const siteName = "ReflectLife";
  const siteUrl = site_url || "https://reflectlife.net";

  // Build the confirmation URL
  let confirmationUrl = "";
  if (token_hash) {
    const baseUrl = redirect_to || siteUrl;
    const separator = baseUrl.includes("?") ? "&" : "?";
    confirmationUrl = `${baseUrl}${separator}token_hash=${token_hash}&type=${email_action_type}`;
  }

  const recipient = email_data?.email || "";
  const newEmail = email_data?.new_email || "";

  let html = "";
  let subject = "";

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

  // Send via Lovable Email API callback
  const callbackUrl = Deno.env.get("CALLBACK_URL");
  if (!callbackUrl) {
    console.error("CALLBACK_URL not set");
    return new Response(JSON.stringify({ error: "Email callback not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const emailResponse = await fetch(callbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${webhookSecret}`,
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

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
