import { useMemo } from 'react';
import { calculateSkeletonJoints, getSegmentColor } from '../utils/skeleton';
import { getAngleZone } from '../data/comfortZones';

/**
 * SVG line segment with optional color based on comfort zone.
 */
function Segment({ from, to, color = '#6b7280', strokeWidth = 3 }) {
  if (!from || !to) return null;

  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  );
}

/**
 * SVG circle for joints.
 */
function Joint({ point, radius = 4, color = '#6b7280' }) {
  if (!point) return null;

  return <circle cx={point.x} cy={point.y} r={radius} fill={color} />;
}

/**
 * Angle arc indicator.
 */
function AngleArc({ vertex, point1, point2, radius = 20, color = '#6b7280', label }) {
  if (!vertex || !point1 || !point2) return null;

  // Calculate angles
  const angle1 = Math.atan2(point1.y - vertex.y, point1.x - vertex.x);
  const angle2 = Math.atan2(point2.y - vertex.y, point2.x - vertex.x);

  // Create arc path
  const startX = vertex.x + radius * Math.cos(angle1);
  const startY = vertex.y + radius * Math.sin(angle1);
  const endX = vertex.x + radius * Math.cos(angle2);
  const endY = vertex.y + radius * Math.sin(angle2);

  // Determine if large arc
  let angleDiff = angle2 - angle1;
  if (angleDiff < 0) angleDiff += 2 * Math.PI;
  const largeArc = angleDiff > Math.PI ? 1 : 0;

  const pathD = `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;

  // Label position at midpoint of arc
  const midAngle = angle1 + angleDiff / 2;
  const labelX = vertex.x + (radius + 12) * Math.cos(midAngle);
  const labelY = vertex.y + (radius + 12) * Math.sin(midAngle);

  return (
    <g>
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeDasharray="3 2" />
      {label && (
        <text
          x={labelX}
          y={labelY}
          fill={color}
          fontSize={10}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {label}
        </text>
      )}
    </g>
  );
}

/**
 * Skeleton overlay component.
 *
 * @param {Object} markers - Bike markers {seat, peg, bar}
 * @param {Object} measurements - Rider measurements from getEffectiveMeasurements()
 * @param {number} pxPerMM - Pixels per millimeter
 * @param {Object} angles - Calculated angles {knee, hip, back, arm}
 * @param {string} color - Base color for the skeleton
 * @param {string} ridingStyle - Riding style for comfort zone colors
 * @param {boolean} showAngles - Whether to show angle arcs
 * @param {number} scale - Scale factor for overlay bikes
 */
export function SkeletonOverlay({
  markers,
  measurements,
  pxPerMM,
  angles,
  color = '#6b7280',
  ridingStyle = 'commute',
  showAngles = true,
  scale = 1,
}) {
  const joints = useMemo(() => {
    return calculateSkeletonJoints(markers, measurements, pxPerMM);
  }, [markers, measurements, pxPerMM]);

  // Get zone colors for each segment
  const zones = useMemo(() => {
    if (!angles) return {};
    return {
      knee: getAngleZone('knee', angles.knee, ridingStyle),
      hip: getAngleZone('hip', angles.hip, ridingStyle),
      back: getAngleZone('back', angles.back, ridingStyle),
      arm: getAngleZone('arm', angles.arm, ridingStyle),
    };
  }, [angles, ridingStyle]);

  if (!joints) return null;

  const { hip, knee, foot, shoulder, elbow, hand, head } = joints;

  // Segment colors based on comfort zones
  const thighColor = getSegmentColor(zones.knee?.status);
  const lowerLegColor = getSegmentColor(zones.knee?.status);
  const torsoColor = getSegmentColor(zones.hip?.status);
  const upperArmColor = getSegmentColor(zones.arm?.status);
  const forearmColor = getSegmentColor(zones.arm?.status);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      <g opacity={0.85}>
        {/* Leg segments */}
        <Segment from={hip} to={knee} color={thighColor} strokeWidth={4} />
        <Segment from={knee} to={foot} color={lowerLegColor} strokeWidth={4} />

        {/* Torso */}
        <Segment from={hip} to={shoulder} color={torsoColor} strokeWidth={5} />

        {/* Arm segments */}
        <Segment from={shoulder} to={elbow} color={upperArmColor} strokeWidth={3} />
        <Segment from={elbow} to={hand} color={forearmColor} strokeWidth={3} />

        {/* Joints */}
        <Joint point={hip} radius={6} color={color} />
        <Joint point={knee} radius={5} color={thighColor} />
        <Joint point={foot} radius={4} color={lowerLegColor} />
        <Joint point={shoulder} radius={5} color={torsoColor} />
        <Joint point={elbow} radius={4} color={upperArmColor} />
        <Joint point={hand} radius={4} color={forearmColor} />

        {/* Head */}
        {head && (
          <circle
            cx={head.x}
            cy={head.y}
            r={head.radius}
            fill="none"
            stroke={color}
            strokeWidth={2}
          />
        )}

        {/* Angle arcs */}
        {showAngles && (
          <>
            {/* Knee angle arc */}
            {knee && angles?.knee && (
              <AngleArc
                vertex={knee}
                point1={hip}
                point2={foot}
                radius={15}
                color={getSegmentColor(zones.knee?.status)}
                label={`${Math.round(angles.knee)}°`}
              />
            )}

            {/* Hip angle arc */}
            {shoulder && angles?.hip && (
              <AngleArc
                vertex={hip}
                point1={shoulder}
                point2={knee}
                radius={20}
                color={getSegmentColor(zones.hip?.status)}
                label={`${Math.round(angles.hip)}°`}
              />
            )}
          </>
        )}
      </g>
    </svg>
  );
}
