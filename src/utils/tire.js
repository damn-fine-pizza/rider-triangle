/**
 * Parse tire spec like "190/50 R17" or "120/70 ZR17M/C"
 * @param {string} spec - Tire specification string
 * @returns {{ width: number, aspect: number, rimInch: number } | null}
 */
export function parseTireSpec(spec) {
  const re = /([0-9]{2,3})\s*\/\s*([0-9]{2})[^0-9]*([0-9]{2})/i;
  const m = spec.match(re);
  if (!m) return null;
  const width = parseFloat(m[1]);
  const aspect = parseFloat(m[2]);
  const rimInch = parseFloat(m[3]);
  return { width, aspect, rimInch };
}

/**
 * Calculate outer diameter in mm from tire spec
 * @param {string} spec - Tire specification string
 * @returns {number | null}
 */
export function outerDiameterMM(spec) {
  const p = parseTireSpec(spec);
  if (!p) return null;
  const rimMM = p.rimInch * 25.4;
  const sidewall = p.width * (p.aspect / 100);
  return rimMM + 2 * sidewall;
}
