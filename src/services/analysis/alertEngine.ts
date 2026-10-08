import { AlertNotification, ForexPair, SRZone, TimeframeAnalysis, ConfluenceState, EconomicEvent } from '../../types/forex';

export class AlertEngine {
  private firedAlerts: Map<string, number> = new Map(); // key -> last fired timestamp
  private cooldownMs = 60 * 1000; // 1 minute cooldown per alert signature
  private previousState: ConfluenceState | null = null;

  public evaluateAlerts(
    pair: ForexPair,
    currentPrice: number,
    supportZones: SRZone[],
    resistanceZones: SRZone[],
    patterns: Array<{ name: string; bias: string }>,
    m15Analysis?: TimeframeAnalysis,
    confluenceState?: ConfluenceState,
    events?: EconomicEvent[]
  ): AlertNotification[] {
    const alerts: AlertNotification[] = [];
    const now = Date.now();

    // 1. Price Entering Support Zone
    supportZones.forEach(zone => {
      if (currentPrice >= zone.minPrice && currentPrice <= zone.maxPrice) {
        const key = `${pair}-entered-support-${zone.id}`;
        if (this.canFire(key, now)) {
          alerts.push({
            id: `alert-${now}-${Math.random()}`,
            timestamp: now,
            pair,
            type: 'ZONE_ENTRY',
            title: `${pair}: Entered Support Zone`,
            message: `Price has entered ${zone.timeframe} support zone: ${zone.minPrice.toFixed(4)}–${zone.maxPrice.toFixed(4)}. Monitor for responsive buy rejection wicks.`,
            severity: 'bullish'
          });
          this.recordFired(key, now);
        }
      }
    });

    // 2. Price Entering Resistance Zone
    resistanceZones.forEach(zone => {
      if (currentPrice >= zone.minPrice && currentPrice <= zone.maxPrice) {
        const key = `${pair}-entered-resistance-${zone.id}`;
        if (this.canFire(key, now)) {
          alerts.push({
            id: `alert-${now}-${Math.random()}`,
            timestamp: now,
            pair,
            type: 'ZONE_ENTRY',
            title: `${pair}: Entered Resistance Zone`,
            message: `Price has entered ${zone.timeframe} resistance zone: ${zone.minPrice.toFixed(4)}–${zone.maxPrice.toFixed(4)}. Watch for overhead supply defense.`,
            severity: 'bearish'
          });
          this.recordFired(key, now);
        }
      }
    });

    // 3. Candlestick Rejection Patterns
    patterns.forEach(pat => {
      if (pat.name.includes('Rejection Wick') || pat.name.includes('Engulfing')) {
        const key = `${pair}-pattern-${pat.name}`;
        if (this.canFire(key, now, 120 * 1000)) {
          alerts.push({
            id: `alert-${now}-${Math.random()}`,
            timestamp: now,
            pair,
            type: 'REJECTION',
            title: `${pair}: ${pat.name}`,
            message: `Price action alert: ${pat.name} detected on active chart. Check confluence before considering bias.`,
            severity: pat.bias === 'bullish' ? 'bullish' : 'bearish'
          });
          this.recordFired(key, now);
        }
      }
    });

    // 4. Unusual Tick Volume
    if (m15Analysis && m15Analysis.volumeRatio >= 1.45) {
      const key = `${pair}-volume-spike`;
      if (this.canFire(key, now, 180 * 1000)) {
        alerts.push({
          id: `alert-${now}-${Math.random()}`,
          timestamp: now,
          pair,
          type: 'VOLUME_SPIKE',
          title: `${pair}: Unusual Tick Volume Detected`,
          message: `Current M15 tick volume is ${(m15Analysis.volumeRatio * 100).toFixed(0)}% of recent 20-period moving average. Elevated institutional market participation.`,
          severity: 'warning'
        });
        this.recordFired(key, now);
      }
    }

    // 5. Confluence State Change
    if (confluenceState && this.previousState && confluenceState !== this.previousState) {
      const key = `${pair}-confluence-${confluenceState}`;
      if (this.canFire(key, now, 180 * 1000)) {
        alerts.push({
          id: `alert-${now}-${Math.random()}`,
          timestamp: now,
          pair,
          type: 'CONFLUENCE_CHANGE',
          title: `${pair}: Confluence Shift -> ${confluenceState}`,
          message: `Technical setup state transitioned from ${this.previousState} to ${confluenceState}. Re-evaluate confluence checklist.`,
          severity: confluenceState === 'CONFIRMED' ? 'bullish' : confluenceState === 'INVALIDATED' ? 'warning' : 'info'
        });
        this.recordFired(key, now);
      }
    }
    this.previousState = confluenceState || null;

    // 6. High-impact news event warning
    if (events) {
      const imminent = events.find(e => e.importance === 'HIGH' && e.timestamp > now && e.timestamp - now <= 25 * 60 * 1000);
      if (imminent) {
        const minsLeft = Math.max(1, Math.round((imminent.timestamp - now) / 60000));
        const key = `news-${imminent.id}-${minsLeft < 10 ? 'urgent' : 'warning'}`;
        if (this.canFire(key, now, 15 * 60 * 1000)) {
          alerts.push({
            id: `alert-${now}-${Math.random()}`,
            timestamp: now,
            pair,
            type: 'HIGH_IMPACT_NEWS',
            title: `⚠ High-Impact Event in ${minsLeft}m: ${imminent.title}`,
            message: `Scheduled ${imminent.currency} tier-1 release. Expect widened spreads and rapid price action. Technical setups downgraded.`,
            severity: 'warning'
          });
          this.recordFired(key, now);
        }
      }
    }

    return alerts;
  }

  private canFire(key: string, now: number, customCooldownMs?: number): boolean {
    const last = this.firedAlerts.get(key);
    if (!last) return true;
    return now - last > (customCooldownMs || this.cooldownMs);
  }

  private recordFired(key: string, now: number): void {
    this.firedAlerts.set(key, now);
  }
}

export const alertEngine = new AlertEngine();
