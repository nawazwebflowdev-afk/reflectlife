import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HelpMessageRequest {
  name: string;
  email: string;
  country: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, country, message }: HelpMessageRequest = await req.json();

    console.log("Sending help message:", { name, email, country });

    const emailResponse = await resend.emails.send({
      from: "Reflectlife Support <onboarding@resend.dev>",
      to: ["sypera.sylvia@gmail.com"],
      replyTo: email,
      subject: `Help Request from ${name} (${country})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B7355;">New Help Request</h2>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Country:</strong> ${country}</p>
          </div>

          <div style="background: white; padding: 20px; border-left: 4px solid #8B7355; margin: 20px 0;">
            <p style="margin: 0;"><strong>Message:</strong></p>
            <p style="margin-top: 10px; color: #333; white-space: pre-wrap;">${message}</p>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This message was submitted through the Reflectlife Help Centre.
          </p>
        </div>
      `,
    });

    console.log("Help message sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-help-message function:", error);
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
