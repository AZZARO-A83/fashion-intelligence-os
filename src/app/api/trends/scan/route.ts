import { NextResponse } from "next/server";
import { runTrendScan } from "@/lib/trend-scanner";
import { getAlerts, getLastScan, updateAlertStatus } from "@/lib/trend-alerts";

// GET — return current alerts + last scan info
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "dismiss") {
    const id = searchParams.get("id");
    if (id) updateAlertStatus(id, "dismissed");
    return NextResponse.json({ ok: true });
  }

  if (action === "action") {
    const id = searchParams.get("id");
    if (id) updateAlertStatus(id, "actioned");
    return NextResponse.json({ ok: true });
  }

  const alerts = getAlerts();
  const lastScan = getLastScan();
  const newAlerts = alerts.filter(a => a.status === "new").length;
  const urgentAlerts = alerts.filter(a => a.priority === "urgent" && a.status === "new").length;

  return NextResponse.json({
    alerts,
    lastScan,
    newAlerts,
    urgentAlerts,
    totalAlerts: alerts.length,
  });
}

// POST — trigger a new scan
export async function POST() {
  try {
    const result = await runTrendScan();
    return NextResponse.json({ result, success: true });
  } catch (err: any) {
    console.error("[Scan API] Error:", err);
    return NextResponse.json(
      { error: err.message ?? "Scan failed" },
      { status: 500 }
    );
  }
}
