// Runs weekly via pg_cron. Sends each campaign organizer an email report
// summarising donations from the past 7 days, including gross, fee and net
// amounts, plus a link to request a payout.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://reflectlife.net";

function escapeHtml(v: string): string {
  return v.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function money(v: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(v);
}

interface DonationRow {
  id: string;
  campaign_id: string;
  gross_amount: number;
  platform_fee_amount: number;
  net_payout_amount: number;
  donor_type: "private" | "company";
  donor_name: string | null;
  donor_email: string;
  is_anonymous: boolean;
  created_at: string;
  currency: string;
}

interface CampaignRow {
  id: string;
  memory_wall_id: string;
  organizer_user_id: string;
  beneficiary_name: string;
  currency: string;
  memorial_name: string;
  organizer_email: string;
  organizer_full_name: string | null;
}

async function sendReport(campaign: CampaignRow, donations: DonationRow[]) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    throw new Error("Email credentials missing");
  }

  const totalGross = donations.reduce((sum, d) => sum + Number(d.gross_amount), 0);
  const totalFee = donations.reduce((sum, d) => sum + Number(d.platform_fee_amount), 0);
  const totalNet = donations.reduce((sum, d) => sum + Number(d.net_payout_amount), 0);

  const rows = donations
    .map((d) => {
      const name = d.is_anonymous
        ? "Anonymous"
        : escapeHtml(d.donor_name || d.donor_email || "Donor");
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;">${new Date(d.created_at).toLocaleDateString("en-GB")}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;">${name}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-transform:capitalize;">${d.donor_type}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;">${money(Number(d.gross_amount), d.currency)}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;">${money(Number(d.platform_fee_amount), d.currency)}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;">${money(Number(d.net_payout_amount), d.currency)}</td>
        </tr>
      `;
    })
    .join("");

  const dashboardUrl = `${SITE_URL}/campaign-dashboard/${campaign.id}`;
  const memorialUrl = `${SITE_URL}/memorial/${campaign.memory_wall_id}`;

  const html = `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:32px;background:#faf7f2;color:#3a2a3a;">
      <h1 style="color:#4A324A;margin:0 0 12px;font-size:22px;">Weekly Donation Report</h1>
      <p style="font-size:16px;line-height:1.6;">Hello ${escapeHtml(campaign.organizer_full_name || "organizer")},</p>
      <p style="font-size:16px;line-height:1.6;">Here is this week's summary for <strong>${escapeHtml(campaign.beneficiary_name)}</strong> (${escapeHtml(campaign.memorial_name)}).</p>

      <div style="background:#fff;padding:16px;border-radius:12px;margin:24px 0;border:1px solid #e8e0d8;">
        <p style="margin:0 0 8px;font-size:15px;"><strong>Total raised this week:</strong> ${money(totalGross, campaign.currency)}</p>
        <p style="margin:0 0 8px;font-size:15px;"><strong>Platform fees:</strong> ${money(totalFee, campaign.currency)}</p>
        <p style="margin:0;font-size:15px;"><strong>Net payout:</strong> ${money(totalNet, campaign.currency)}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:24px 0;">
        <thead>
          <tr style="background:#4A324A;color:#fff;text-align:left;">
            <th style="padding:10px;">Date</th>
            <th style="padding:10px;">Donor</th>
            <th style="padding:10px;">Type</th>
            <th style="padding:10px;">Gross</th>
            <th style="padding:10px;">Fee</th>
            <th style="padding:10px;">Net</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <p style="margin:24px 0;text-align:center;">
        <a href="${dashboardUrl}" style="background:#4A324A;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;display:inline-block;">Request a Payout</a>
      </p>

      <p style="font-size:14px;color:#6b5a6b;">
        You can also visit the memorial page at any time: <a href="${memorialUrl}" style="color:#4A324A;">${memorialUrl}</a>
      </p>

      <p style="font-size:12px;color:#9a8a9a;margin-top:24px;">
        Sent with love from Reflectlife. This is an automated weekly report for memorial campaign organisers.
      </p>
    </div>`;

  const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: "Reflectlife <noreply@reflectlife.net>",
      to: [campaign.organizer_email],
      subject: `Weekly donation report for ${campaign.beneficiary_name}`,
      html,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    console.error("Resend failed", resp.status, body);
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Find donations from the last 7 days, joined with campaign and organizer info.
    const { data: rows, error } = await supabase
      .from("memorial_donations")
      .select(`
        id,
        campaign_id,
        gross_amount,
        platform_fee_amount,
        net_payout_amount,
        donor_type,
        donor_name,
        donor_email,
        is_anonymous,
        created_at,
        currency,
        campaign:memorial_campaigns!inner(
          id,
          memory_wall_id,
          organizer_user_id,
          beneficiary_name,
          currency,
          memorials!inner(name),
          profiles!organizer_user_id(email, full_name)
        )
      `)
      .eq("payment_status", "succeeded")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Group by campaign.
    const campaigns = new Map<string, CampaignRow>();
    const donationsByCampaign = new Map<string, DonationRow[]>();

    for (const row of (rows ?? []) as any[]) {
      const campaign = row.campaign;
      if (!campaign) continue;

      const memorialName = Array.isArray(campaign.memorials)
        ? campaign.memorials[0]?.name
        : campaign.memorials?.name;
      const profile = Array.isArray(campaign.profiles)
        ? campaign.profiles[0]
        : campaign.profiles;

      if (!campaigns.has(campaign.id)) {
        campaigns.set(campaign.id, {
          id: campaign.id,
          memory_wall_id: campaign.memory_wall_id,
          organizer_user_id: campaign.organizer_user_id,
          beneficiary_name: campaign.beneficiary_name,
          currency: campaign.currency,
          memorial_name: memorialName || "Memorial",
          organizer_email: profile?.email || "",
          organizer_full_name: profile?.full_name || null,
        });
      }

      if (!donationsByCampaign.has(campaign.id)) {
        donationsByCampaign.set(campaign.id, []);
      }
      donationsByCampaign.get(campaign.id)!.push({
        id: row.id,
        campaign_id: row.campaign_id,
        gross_amount: row.gross_amount,
        platform_fee_amount: row.platform_fee_amount,
        net_payout_amount: row.net_payout_amount,
        donor_type: row.donor_type,
        donor_name: row.donor_name,
        donor_email: row.donor_email,
        is_anonymous: row.is_anonymous,
        created_at: row.created_at,
        currency: row.currency,
      });
    }

    let sent = 0;
    for (const [campaignId, campaign] of campaigns) {
      if (!campaign.organizer_email) continue;
      const donations = donationsByCampaign.get(campaignId) ?? [];
      const ok = await sendReport(campaign, donations);
      if (ok) sent++;
    }

    return new Response(JSON.stringify({ ok: true, campaigns: campaigns.size, reports_sent: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
