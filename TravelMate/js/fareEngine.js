/**
 * ═══════════════════════════════════════════════════════════════════
 *  TravelMate — Fare Estimation Engine (fareEngine.js)
 * ═══════════════════════════════════════════════════════════════════
 *
 *  A transparent, well-documented fare calculation module for
 *  local auto-rickshaw and e-rickshaw rides in Indian cities.
 *
 *  FORMULA:
 *    distanceFare  = max(0, distanceKm − baseKm) × perKmRate
 *    waitingFare   = waitingMinutes × waitingRatePerMin
 *    baseEstimate  = baseFare + distanceFare + waitingFare
 *    fareRange     = [ round(baseEstimate × 0.95),
 *                      round(baseEstimate × 1.10) ]
 *    upperRefLimit = round(baseEstimate × (1 + upperBufferPercent/100))
 *
 *  DISCLAIMER:
 *    "Indicative estimate only — not an official tariff or
 *     guaranteed price."
 *
 *  All rates are illustrative configurable presets.
 *  Verify against local RTO tariff before real-world use.
 *
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

const FareEngine = (() => {

  // ────────────────────────────────────────────────────────────────
  // Default rate presets (used when no backend / JSON is available)
  // ────────────────────────────────────────────────────────────────
  const DEFAULT_RATES = {
    agra: {
      name: 'Agra', tier: 'Tier 2', state: 'Uttar Pradesh',
      defaultCenter: [27.1767, 78.0081], defaultZoom: 13,
      vehicles: {
        auto: {
          name: 'Auto-Rickshaw', icon: '🛺',
          baseFare: 25, baseKm: 2, perKmRate: 10.50,
          waitingRatePerMin: 1.00, upperBufferPercent: 15,
          rateSource: 'Illustrative — verify against local RTO tariff',
          reviewDate: '2026-01-01'
        },
        erickshaw: {
          name: 'E-Rickshaw', icon: '🔋',
          baseFare: 10, baseKm: 1, perKmRate: 7.00,
          waitingRatePerMin: 0.50, upperBufferPercent: 15,
          rateSource: 'Illustrative — verify against local RTO tariff',
          reviewDate: '2026-01-01'
        }
      }
    },
    delhi: {
      name: 'Delhi', tier: 'Tier 1', state: 'Delhi',
      defaultCenter: [28.6139, 77.2090], defaultZoom: 12,
      vehicles: {
        auto: {
          name: 'Auto-Rickshaw', icon: '🛺',
          baseFare: 25, baseKm: 2, perKmRate: 9.50,
          waitingRatePerMin: 0.75, upperBufferPercent: 15,
          rateSource: 'Illustrative — verify against local RTO tariff',
          reviewDate: '2026-01-01'
        },
        erickshaw: {
          name: 'E-Rickshaw', icon: '🔋',
          baseFare: 10, baseKm: 1, perKmRate: 5.00,
          waitingRatePerMin: 0.50, upperBufferPercent: 15,
          rateSource: 'Illustrative — verify against local RTO tariff',
          reviewDate: '2026-01-01'
        }
      }
    },
    jaipur: {
      name: 'Jaipur', tier: 'Tier 2', state: 'Rajasthan',
      defaultCenter: [26.9124, 75.7873], defaultZoom: 13,
      vehicles: {
        auto: {
          name: 'Auto-Rickshaw', icon: '🛺',
          baseFare: 25, baseKm: 2, perKmRate: 10.00,
          waitingRatePerMin: 1.00, upperBufferPercent: 15,
          rateSource: 'Illustrative — verify against local RTO tariff',
          reviewDate: '2026-01-01'
        },
        erickshaw: {
          name: 'E-Rickshaw', icon: '🔋',
          baseFare: 10, baseKm: 1, perKmRate: 6.50,
          waitingRatePerMin: 0.50, upperBufferPercent: 15,
          rateSource: 'Illustrative — verify against local RTO tariff',
          reviewDate: '2026-01-01'
        }
      }
    },
    lucknow: {
      name: 'Lucknow', tier: 'Tier 2', state: 'Uttar Pradesh',
      defaultCenter: [26.8467, 80.9462], defaultZoom: 13,
      vehicles: {
        auto: {
          name: 'Auto-Rickshaw', icon: '🛺',
          baseFare: 25, baseKm: 2, perKmRate: 10.00,
          waitingRatePerMin: 1.00, upperBufferPercent: 15,
          rateSource: 'Illustrative — verify against local RTO tariff',
          reviewDate: '2026-01-01'
        },
        erickshaw: {
          name: 'E-Rickshaw', icon: '🔋',
          baseFare: 10, baseKm: 1, perKmRate: 6.00,
          waitingRatePerMin: 0.50, upperBufferPercent: 15,
          rateSource: 'Illustrative — verify against local RTO tariff',
          reviewDate: '2026-01-01'
        }
      }
    },
    varanasi: {
      name: 'Varanasi', tier: 'Tier 2', state: 'Uttar Pradesh',
      defaultCenter: [25.3176, 82.9739], defaultZoom: 13,
      vehicles: {
        auto: {
          name: 'Auto-Rickshaw', icon: '🛺',
          baseFare: 20, baseKm: 2, perKmRate: 10.00,
          waitingRatePerMin: 1.00, upperBufferPercent: 15,
          rateSource: 'Illustrative — verify against local RTO tariff',
          reviewDate: '2026-01-01'
        },
        erickshaw: {
          name: 'E-Rickshaw', icon: '🔋',
          baseFare: 10, baseKm: 1, perKmRate: 5.50,
          waitingRatePerMin: 0.50, upperBufferPercent: 15,
          rateSource: 'Illustrative — verify against local RTO tariff',
          reviewDate: '2026-01-01'
        }
      }
    }
  };

  let ratesData = null;

  // ────────────────────────────────────────────────────────────────
  // Load rates: try backend API → fallback JSON → hardcoded defaults
  // ────────────────────────────────────────────────────────────────
  async function loadRates() {
    // 1) Try Flask backend
    try {
      const res = await fetch('/api/rates', { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const json = await res.json();
        if (json && json.cities) {
          ratesData = json.cities;
          console.log('[FareEngine] Loaded rates from backend API.');
          return ratesData;
        }
      }
    } catch (_) { /* backend not running — that's fine */ }

    // 2) Try local JSON file
    try {
      const res = await fetch('data/rates.json', { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const json = await res.json();
        if (json && json.cities) {
          ratesData = json.cities;
          console.log('[FareEngine] Loaded rates from local JSON.');
          return ratesData;
        }
      }
    } catch (_) { /* JSON not found — use defaults */ }

    // 3) Hardcoded defaults
    ratesData = DEFAULT_RATES;
    console.log('[FareEngine] Using hardcoded default rates.');
    return ratesData;
  }

  // ────────────────────────────────────────────────────────────────
  // Getters
  // ────────────────────────────────────────────────────────────────
  function getRates() {
    return ratesData || DEFAULT_RATES;
  }

  function getCities() {
    const rates = getRates();
    return Object.keys(rates).map(key => ({
      id: key,
      name: rates[key].name,
      tier: rates[key].tier,
      state: rates[key].state
    }));
  }

  function getCityConfig(cityId) {
    const rates = getRates();
    return rates[cityId] || rates['agra'];
  }

  function getVehicleConfig(cityId, vehicleId) {
    const city = getCityConfig(cityId);
    return city.vehicles[vehicleId] || city.vehicles['auto'];
  }

  function getVehicleTypes(cityId) {
    const city = getCityConfig(cityId);
    return Object.keys(city.vehicles).map(key => ({
      id: key,
      name: city.vehicles[key].name,
      icon: city.vehicles[key].icon
    }));
  }

  // ────────────────────────────────────────────────────────────────
  // Core Fare Calculation
  // ────────────────────────────────────────────────────────────────

  /**
   * Calculate fare estimate.
   *
   * @param {Object} params
   * @param {number} params.distanceKm      - Road distance in km (must be > 0)
   * @param {number} params.waitingMinutes   - Waiting time in minutes (>= 0)
   * @param {number} params.baseFare         - Base/flag-down fare in ₹
   * @param {number} params.baseKm           - Distance included in base fare
   * @param {number} params.perKmRate        - Rate per km after base distance
   * @param {number} params.waitingRatePerMin - Waiting charge per minute
   * @param {number} params.upperBufferPercent - Upper negotiation buffer %
   *
   * @returns {Object|null} Fare breakdown or null if inputs invalid.
   */
  function calculateFare(params) {
    const {
      distanceKm,
      waitingMinutes = 0,
      baseFare,
      baseKm,
      perKmRate,
      waitingRatePerMin,
      upperBufferPercent = 15
    } = params;

    // ── Validation ──────────────────────────────────────────────
    if (typeof distanceKm !== 'number' || distanceKm <= 0) {
      return null; // Never guess a fare for invalid distance
    }
    if (typeof baseFare !== 'number' || baseFare < 0) return null;
    if (typeof baseKm !== 'number' || baseKm < 0) return null;
    if (typeof perKmRate !== 'number' || perKmRate < 0) return null;

    const safeWaiting = Math.max(0, Number(waitingMinutes) || 0);
    const safeWaitingRate = Math.max(0, Number(waitingRatePerMin) || 0);
    const safeBuffer = Math.max(0, Math.min(100, Number(upperBufferPercent) || 15));

    // ── Formula ─────────────────────────────────────────────────
    const distanceFare = Math.max(0, distanceKm - baseKm) * perKmRate;
    const waitingFare  = safeWaiting * safeWaitingRate;
    const baseEstimate = baseFare + distanceFare + waitingFare;

    const fareLow  = Math.round(baseEstimate * 0.95);
    const fareHigh = Math.round(baseEstimate * 1.10);
    const upperReferenceLimit = Math.round(baseEstimate * (1 + safeBuffer / 100));

    return {
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      waitingMinutes: safeWaiting,

      // Component breakdown
      baseFareCharge: parseFloat(baseFare.toFixed(2)),
      distanceFareCharge: parseFloat(distanceFare.toFixed(2)),
      waitingFareCharge: parseFloat(waitingFare.toFixed(2)),

      // Totals
      baseEstimate: parseFloat(baseEstimate.toFixed(2)),
      fareRange: { low: fareLow, high: fareHigh },
      upperReferenceLimit: upperReferenceLimit,

      // Inputs echoed for transparency
      params: {
        baseFare, baseKm, perKmRate,
        waitingRatePerMin: safeWaitingRate,
        upperBufferPercent: safeBuffer
      },

      // Disclaimer
      disclaimer: 'Indicative estimate only — not an official tariff or guaranteed price.'
    };
  }

  /**
   * Convenience: calculate fare from city + vehicle presets.
   */
  function estimateFare(cityId, vehicleId, distanceKm, waitingMinutes = 0, overrides = {}) {
    const vehicle = getVehicleConfig(cityId, vehicleId);

    return calculateFare({
      distanceKm,
      waitingMinutes,
      baseFare:          overrides.baseFare          ?? vehicle.baseFare,
      baseKm:            overrides.baseKm            ?? vehicle.baseKm,
      perKmRate:         overrides.perKmRate         ?? vehicle.perKmRate,
      waitingRatePerMin: overrides.waitingRatePerMin ?? vehicle.waitingRatePerMin,
      upperBufferPercent: overrides.upperBufferPercent ?? vehicle.upperBufferPercent
    });
  }

  // ────────────────────────────────────────────────────────────────
  // Distance helpers
  // ────────────────────────────────────────────────────────────────

  /** Convert meters (from OSRM) to km, rounded to 2 decimals. */
  function metersToKm(meters) {
    if (typeof meters !== 'number' || meters < 0) return 0;
    return parseFloat((meters / 1000).toFixed(2));
  }

  /** Convert seconds (from OSRM) to a human-readable duration string. */
  function formatDuration(seconds) {
    if (typeof seconds !== 'number' || seconds < 0) return '—';
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
  }

  // ────────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────────
  return {
    loadRates,
    getRates,
    getCities,
    getCityConfig,
    getVehicleConfig,
    getVehicleTypes,
    calculateFare,
    estimateFare,
    metersToKm,
    formatDuration
  };
})();
