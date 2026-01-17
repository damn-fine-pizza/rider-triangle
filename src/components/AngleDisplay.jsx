import { useMemo } from 'react';
import { COMFORT_ZONES, RIDING_STYLES, getAngleZone, getAnglesSummary } from '../data/comfortZones';
import { formatAngle } from '../utils/ergonomics';

/**
 * Single angle row with value and zone indicator.
 */
function AngleRow({ angleType, value, ridingStyle }) {
  const zone = getAngleZone(angleType, value, ridingStyle);
  const config = COMFORT_ZONES[angleType];

  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="w-16 text-sm font-medium">{config.label}</div>
      <div
        className={`w-16 text-right font-mono text-sm px-2 py-0.5 rounded ${zone.colorClass || 'bg-gray-100'}`}
      >
        {formatAngle(value)}
      </div>
      <div className="flex-1 text-xs text-gray-500 truncate" title={zone.message}>
        {zone.message}
      </div>
    </div>
  );
}

/**
 * Zone legend component.
 */
function ZoneLegend() {
  return (
    <div className="flex gap-3 text-xs">
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        Comfort
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        Warning
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Extreme
      </span>
    </div>
  );
}

/**
 * Angle comparison table for two bikes.
 */
function AngleComparisonTable({ anglesA, anglesB, labelA, labelB, colorA, colorB, ridingStyle }) {
  const angleTypes = ['knee', 'hip', 'back', 'arm'];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b">
          <th className="py-1.5 w-16">Angle</th>
          <th className="py-1.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorA }} />
              {labelA}
            </span>
          </th>
          <th className="py-1.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorB }} />
              {labelB}
            </span>
          </th>
          <th className="py-1.5 w-16 text-right">Delta</th>
        </tr>
      </thead>
      <tbody>
        {angleTypes.map((type) => {
          const valA = anglesA?.[type];
          const valB = anglesB?.[type];
          const zoneA = getAngleZone(type, valA, ridingStyle);
          const zoneB = getAngleZone(type, valB, ridingStyle);

          const delta =
            valA !== null && valB !== null && !isNaN(valA) && !isNaN(valB)
              ? valB - valA
              : null;

          return (
            <tr key={type} className="border-b border-gray-100">
              <td className="py-1.5 font-medium">{COMFORT_ZONES[type].label}</td>
              <td className="py-1.5">
                <span className={`px-1.5 py-0.5 rounded text-xs ${zoneA.colorClass || ''}`}>
                  {formatAngle(valA)}
                </span>
              </td>
              <td className="py-1.5">
                <span className={`px-1.5 py-0.5 rounded text-xs ${zoneB.colorClass || ''}`}>
                  {formatAngle(valB)}
                </span>
              </td>
              <td className="py-1.5 text-right font-mono text-xs">
                {delta !== null ? (
                  <span className={delta > 0 ? 'text-blue-600' : delta < 0 ? 'text-orange-600' : ''}>
                    {delta > 0 ? '+' : ''}
                    {delta.toFixed(0)}°
                  </span>
                ) : (
                  '–'
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Main angle display component.
 *
 * @param {Object} angles - Single bike angles {knee, hip, back, arm}
 * @param {Object} anglesB - Optional second bike angles for comparison
 * @param {string} label - Bike label
 * @param {string} labelB - Second bike label (for comparison)
 * @param {string} color - Bike color
 * @param {string} colorB - Second bike color
 * @param {string} ridingStyle - Riding style for zone calculation
 * @param {boolean} showComparison - Whether to show comparison view
 */
export function AngleDisplay({
  angles,
  anglesB,
  label = 'Bike',
  labelB = 'Bike B',
  color = '#666',
  colorB = '#999',
  ridingStyle = 'commute',
  showComparison = false,
}) {
  const summary = useMemo(() => getAnglesSummary(angles || {}, ridingStyle), [angles, ridingStyle]);

  const hasAngles = angles && (angles.knee || angles.hip || angles.back || angles.arm);

  if (!hasAngles && !showComparison) {
    return (
      <div className="text-sm text-gray-500 py-2">
        Place all markers (seat, peg, bar) and complete calibration to see angles.
      </div>
    );
  }

  // Comparison mode
  if (showComparison && anglesB) {
    return (
      <div className="space-y-3">
        <AngleComparisonTable
          anglesA={angles}
          anglesB={anglesB}
          labelA={label}
          labelB={labelB}
          colorA={color}
          colorB={colorB}
          ridingStyle={ridingStyle}
        />
        <ZoneLegend />
      </div>
    );
  }

  // Single bike mode
  return (
    <div className="space-y-1">
      <AngleRow angleType="knee" value={angles?.knee} ridingStyle={ridingStyle} />
      <AngleRow angleType="hip" value={angles?.hip} ridingStyle={ridingStyle} />
      <AngleRow angleType="back" value={angles?.back} ridingStyle={ridingStyle} />
      <AngleRow angleType="arm" value={angles?.arm} ridingStyle={ridingStyle} />
      <div className="pt-2 border-t mt-2">
        <ZoneLegend />
      </div>
    </div>
  );
}

/**
 * Riding style selector component.
 */
export function RidingStyleSelector({ value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {Object.entries(RIDING_STYLES).map(([key, style]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-2 py-1 text-xs rounded border transition-colors ${
            value === key
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white hover:bg-gray-50 border-gray-300'
          }`}
          title={style.description}
        >
          {style.label}
        </button>
      ))}
    </div>
  );
}
