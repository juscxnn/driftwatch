/**
 * /api/health — service health check for uptime monitors.
 *
 * Returns the presence (not liveness) of required env vars. We deliberately
 * avoid pinging Supabase / DeepSeek / Resend from this endpoint: that would
 * couple monitor latency to third-party uptime and cause false alerts.
 *
 * Auth: none. Safe to expose publicly — it only reports boolean env flags.
 */

import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { handle } from "@/lib/http";

// Health checks must reflect the live env on every request.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface HealthChecks {
  supabase_configured: boolean;
  deepseek_configured: boolean;
  resend_configured: boolean;
  cron_secret_configured: boolean;
}

interface HealthResponse {
  ok: boolean;
  service: string;
  version: string;
  env: string;
  checks: HealthChecks;
  timestamp: string;
}

const SERVICE = "driftwatch";

function readVersion(): string {
  try {
    const pkgPath = join(process.cwd(), "package.json");
    const raw = readFileSync(pkgPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === "string" ? parsed.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export async function GET(): Promise<NextResponse> {
  return handle(async () => {
    const supabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
    const deepseekConfigured = Boolean(process.env.DEEPSEEK_API_KEY);
    const resendConfigured = Boolean(
      process.env.RESEND_API_KEY && process.env.ALERT_FROM_EMAIL,
    );
    const cronSecretConfigured = Boolean(process.env.CRON_SECRET);

    const checks: HealthChecks = {
      supabase_configured: supabaseConfigured,
      deepseek_configured: deepseekConfigured,
      resend_configured: resendConfigured,
      cron_secret_configured: cronSecretConfigured,
    };

    const body: HealthResponse = {
      ok: supabaseConfigured,
      service: SERVICE,
      version: readVersion(),
      env: process.env.NODE_ENV ?? "development",
      checks,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(body, {
      status: supabaseConfigured ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  });
}
