// Trend Alert System — additive only, never modifies existing plans
// Runs weekly, surfaces rising trends as notifications

export type AlertPriority = "urgent" | "high" | "medium" | "watch";
export type AlertStatus = "new" | "seen" | "actioned" | "dismissed";

export interface TrendAlert {
  id: string;
  detectedAt: string;          // ISO timestamp
  trendName: string;
  arabicName?: string;
  platform: string;
  category: string;
  currentScore: number;        // 0–100
  previousScore: number;       // score from last scan
  scoreChange: number;         // delta — what triggered the alert
  growthRate: number;          // % weekly growth
  priority: AlertPriority;
  status: AlertStatus;
  source: string;              // where we found it
  signals: string[];           // what data points confirm it
  arabicEvidence?: string[];    // Arabic/Egyptian Arabic proof shown first
  relevanceToDebackers: string;
  suggestedAction: string;     // specific recommendation
  relatedCampaigns?: string[]; // which existing campaigns this affects
  hook?: string;               // suggested Arabic hook
  hashtags?: string[];
  peakDaysEstimate: number;
  isNew: boolean;              // never seen before vs score jumped
}

export interface TrendScanResult {
  scanId: string;
  scannedAt: string;
  nextScanAt: string;
  alertsGenerated: number;
  newTrends: number;
  risingTrends: number;
  alerts: TrendAlert[];
  scanSummary: string;
}

// In-memory store for MVP (replace with DB in production)
let alertStore: TrendAlert[] = [];
let lastScanResult: TrendScanResult | null = null;

export function getAlerts(filter?: { status?: AlertStatus; priority?: AlertPriority }): TrendAlert[] {
  let alerts = [...alertStore];
  if (filter?.status) alerts = alerts.filter(a => a.status === filter.status);
  if (filter?.priority) alerts = alerts.filter(a => a.priority === filter.priority);
  return alerts.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
}

export function getLastScan(): TrendScanResult | null {
  return lastScanResult;
}

export function updateAlertStatus(id: string, status: AlertStatus): void {
  const alert = alertStore.find(a => a.id === id);
  if (alert) alert.status = status;
}

export function storeAlerts(result: TrendScanResult): void {
  // Merge new alerts — never overwrite existing ones
  const existingIds = new Set(alertStore.map(a => a.id));
  const newAlerts = result.alerts.filter(a => !existingIds.has(a.id));
  alertStore = [...alertStore, ...newAlerts];

  // Update scores on existing alerts that resurfaced
  result.alerts
    .filter(a => existingIds.has(a.id))
    .forEach(updated => {
      const existing = alertStore.find(a => a.id === updated.id);
      if (existing) {
        existing.currentScore = updated.currentScore;
        existing.scoreChange = updated.scoreChange;
        existing.growthRate = updated.growthRate;
      }
    });

  lastScanResult = result;
}

// Calculate priority from score change and growth rate
export function calculatePriority(scoreChange: number, growthRate: number, peakDays: number): AlertPriority {
  if (scoreChange >= 20 || growthRate >= 60 || peakDays <= 7) return "urgent";
  if (scoreChange >= 12 || growthRate >= 40 || peakDays <= 14) return "high";
  if (scoreChange >= 6 || growthRate >= 25) return "medium";
  return "watch";
}
