import { useRef, useState, useCallback } from 'react';
import { BIKES } from './data/bikes';
import { useCalibration } from './hooks/useCalibration';
import { useMarkers, MARKER_TYPES } from './hooks/useMarkers';
import { useImage } from './hooks/useImage';
import { Marker } from './components/Marker';
import { ClickGuide } from './components/ClickGuide';

// Tool sequence for auto-advance
const TOOL_SEQUENCE = ['calibTop', 'calibBot', 'axle', 'seat', 'peg', 'bar'];

// Tool labels
const TOOL_LABELS = {
  calibTop: 'Calib. TOP wheel',
  calibBot: 'Calib. BOTTOM wheel',
  axle: 'Rear axle center',
  seat: 'Seat',
  peg: 'Footpeg',
  bar: 'Handlebar',
};

export default function App() {
  const bikeKeys = Object.keys(BIKES);
  const [primaryBike, secondaryBike] = bikeKeys;

  // UI state
  const [opacityB, setOpacityB] = useState(0.5);
  const [showBikes, setShowBikes] = useState(
    bikeKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );
  const [activeBike, setActiveBike] = useState(primaryBike);
  const [activeTool, setActiveTool] = useState('calibTop');
  const containerRef = useRef(null);

  // Calibration and markers hooks
  const calibration = useCalibration(BIKES);
  const markersHook = useMarkers(bikeKeys);

  // Image hooks
  const images = {
    [primaryBike]: useImage(BIKES[primaryBike].img),
    [secondaryBike]: useImage(BIKES[secondaryBike].img),
  };

  // Auto-advance to next tool
  const advanceToNextTool = useCallback(() => {
    const currentIndex = TOOL_SEQUENCE.indexOf(activeTool);
    if (currentIndex < TOOL_SEQUENCE.length - 1) {
      setActiveTool(TOOL_SEQUENCE[currentIndex + 1]);
    }
  }, [activeTool]);

  // Handle click on image to place points
  const handleImageClick = useCallback(
    (e, bikeKey) => {
      // Only respond to clicks for the active bike
      if (bikeKey !== activeBike) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (activeTool === 'calibTop') {
        calibration.setCalibPoint(bikeKey, 'top', { x, y });
        advanceToNextTool();
      } else if (activeTool === 'calibBot') {
        calibration.setCalibPoint(bikeKey, 'bot', { x, y });
        advanceToNextTool();
      } else if (activeTool === 'axle') {
        calibration.setAxlePosition(bikeKey, { x, y });
        advanceToNextTool();
      } else if (MARKER_TYPES.includes(activeTool)) {
        markersHook.setMarker(bikeKey, activeTool, { x, y });
        advanceToNextTool();
      }
    },
    [activeBike, activeTool, calibration, markersHook, advanceToNextTool]
  );

  // Reset all for a bike
  const handleResetBike = useCallback(
    (bikeKey) => {
      calibration.resetBike(bikeKey);
      markersHook.resetBike(bikeKey);
      setActiveTool('calibTop');
    },
    [calibration, markersHook]
  );

  // Toggle bike visibility
  const toggleBikeVisibility = useCallback((bikeKey) => {
    setShowBikes((s) => ({ ...s, [bikeKey]: !s[bikeKey] }));
  }, []);

  // Get distances for results table
  const getDistancesForBike = (bikeKey) => {
    // Use primary bike's pxPerMM for consistent measurement
    return markersHook.getDistances(bikeKey, calibration.pxPerMM[calibration.primaryBike]);
  };

  // Render bike layer
  const renderBikeLayer = (bikeKey, isOverlay = false) => {
    const bike = BIKES[bikeKey];
    const isVisible = showBikes[bikeKey];
    const img = images[bikeKey];
    const markers = markersHook.markers[bikeKey];
    const axle = calibration.axle[bikeKey];
    const calibPts = calibration.calibPts[bikeKey];

    const style = isOverlay
      ? {
          transform: `translate(${calibration.translations[bikeKey].x}px, ${calibration.translations[bikeKey].y}px) scale(${calibration.scales[bikeKey]})`,
          transformOrigin: 'top left',
          opacity: isVisible ? opacityB : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
        }
      : {
          display: isVisible ? 'inline-block' : 'none',
        };

    const toolLabel =
      activeTool === 'calibTop'
        ? 'wheel TOP'
        : activeTool === 'calibBot'
          ? 'wheel BOTTOM'
          : activeTool === 'axle'
            ? 'rear axle'
            : activeTool;

    return (
      <div
        key={bikeKey}
        className={isOverlay ? 'absolute top-0 left-0' : 'relative inline-block'}
        style={style}
        onClick={(e) => handleImageClick(e, bikeKey)}
      >
        <img
          src={bike.img}
          alt={bike.label}
          className="block max-w-full h-auto select-none"
          onLoad={img.onLoad}
          draggable={false}
        />

        {/* Calibration line */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {calibPts.top && calibPts.bot && (
            <line
              x1={calibPts.top.x}
              y1={calibPts.top.y}
              x2={calibPts.bot.x}
              y2={calibPts.bot.y}
              stroke={bike.color}
              strokeWidth={2}
              strokeDasharray="4 3"
            />
          )}
        </svg>

        {/* Axle marker */}
        {axle && (
          <Marker
            x={axle.x}
            y={axle.y}
            color={bike.color}
            label="Rear axle"
            onDrag={(nx, ny) => calibration.setAxlePosition(bikeKey, { x: nx, y: ny })}
          />
        )}

        {/* Rider triangle markers */}
        {markers.seat && (
          <Marker
            x={markers.seat.x}
            y={markers.seat.y}
            color={bike.color}
            label="Seat"
            onDrag={(nx, ny) => markersHook.setMarker(bikeKey, 'seat', { x: nx, y: ny })}
          />
        )}
        {markers.peg && (
          <Marker
            x={markers.peg.x}
            y={markers.peg.y}
            color={bike.color}
            label="Footpeg"
            onDrag={(nx, ny) => markersHook.setMarker(bikeKey, 'peg', { x: nx, y: ny })}
          />
        )}
        {markers.bar && (
          <Marker
            x={markers.bar.x}
            y={markers.bar.y}
            color={bike.color}
            label="Handlebar"
            onDrag={(nx, ny) => markersHook.setMarker(bikeKey, 'bar', { x: nx, y: ny })}
          />
        )}

        {/* Click guide */}
        {activeBike === bikeKey && (
          <div className="absolute left-2 top-2">
            <ClickGuide text={`${bike.label}: click for ${toolLabel}`} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full p-4 bg-gray-50">
      <h1 className="text-2xl font-semibold mb-2">
        Riding Position Comparison: {BIKES[secondaryBike].label} vs {BIKES[primaryBike].label}
      </h1>
      <p className="text-gray-700 mb-4">
        Follow the steps below to calibrate and overlay the two bikes. Then position the three
        points (Seat, Footpeg, Handlebar) on each image to compare the rider triangle. Measurements
        are in millimeters, estimated from the selected tire size.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Controls */}
        <div className="xl:col-span-1 space-y-4">
          {/* Step 1: Wheel selection */}
          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="font-medium mb-2">1) Select wheel for calibration</h2>
            {bikeKeys.map((key) => (
              <div key={key} className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ background: BIKES[key].color }} />
                  <div className="font-medium">{BIKES[key].label}</div>
                  <button
                    className="ml-auto text-xs text-red-600 hover:text-red-800"
                    onClick={() => handleResetBike(key)}
                  >
                    Reset
                  </button>
                </div>
                <div className="flex gap-2 text-sm">
                  <button
                    className={`px-2 py-1 rounded border ${calibration.wheelChoice[key] === 'front' ? 'bg-gray-900 text-white' : 'bg-white'}`}
                    onClick={() => calibration.setWheel(key, 'front')}
                  >
                    Front ({BIKES[key].tires.front})
                  </button>
                  <button
                    className={`px-2 py-1 rounded border ${calibration.wheelChoice[key] === 'rear' ? 'bg-gray-900 text-white' : 'bg-white'}`}
                    onClick={() => calibration.setWheel(key, 'rear')}
                  >
                    Rear ({BIKES[key].tires.rear})
                  </button>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Estimated outer diameter: {calibration.outerDiameters[key]?.toFixed(1)} mm
                </div>
              </div>
            ))}
          </div>

          {/* Step 2: Tool selection */}
          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="font-medium mb-2">2) Select tool and click on the image</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {TOOL_SEQUENCE.map((tool) => (
                <button
                  key={tool}
                  className={`px-2 py-1 rounded border ${activeTool === tool ? 'bg-blue-600 text-white' : 'bg-white'}`}
                  onClick={() => setActiveTool(tool)}
                >
                  {TOOL_LABELS[tool]}
                </button>
              ))}
            </div>
            <div className="mt-3 text-sm">
              Active on:{' '}
              <span className="font-medium">{BIKES[activeBike].label}</span>
            </div>
            <div className="flex gap-2 mt-2">
              {bikeKeys.map((key) => (
                <button
                  key={key}
                  className={`px-2 py-1 rounded border ${activeBike === key ? 'bg-gray-900 text-white' : 'bg-white'}`}
                  onClick={() => setActiveBike(key)}
                >
                  {BIKES[key].label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Overlay controls */}
          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="font-medium mb-2">3) Overlay & visibility</h2>
            <div className="flex items-center gap-3 mb-2">
              <label className="text-sm">{BIKES[secondaryBike].label} Opacity</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={opacityB}
                onChange={(e) => setOpacityB(parseFloat(e.target.value))}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-3 text-sm">
              {bikeKeys.map((key) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showBikes[key]}
                    onChange={() => toggleBikeVisibility(key)}
                  />
                  Show {BIKES[key].label.split(' ')[0]}
                </label>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Tip: calibrate TOP/BOTTOM on the outer tire profile, then mark the rear axle center on
              both bikes. Alignment is applied automatically.
            </div>
          </div>

          {/* Step 4: Results */}
          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="font-medium mb-2">4) Rider triangle distances (mm)</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-1">Bike</th>
                  <th className="py-1">Seat-Peg</th>
                  <th className="py-1">Seat-Bar</th>
                  <th className="py-1">Peg-Bar</th>
                </tr>
              </thead>
              <tbody>
                {bikeKeys.map((key) => {
                  const distances = getDistancesForBike(key);
                  return (
                    <tr key={key}>
                      <td className="py-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ background: BIKES[key].color }}
                          />
                          {BIKES[key].label}
                        </div>
                      </td>
                      <td className="py-1">{distances.seatPeg ? distances.seatPeg.toFixed(0) : '–'}</td>
                      <td className="py-1">{distances.seatBar ? distances.seatBar.toFixed(0) : '–'}</td>
                      <td className="py-1">{distances.pegBar ? distances.pegBar.toFixed(0) : '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!calibration.isCalibrated && (
              <div className="mt-2 text-xs text-amber-700">
                Complete calibration (TOP/BOTTOM wheel + rear axle for both bikes) to enable accurate
                measurements.
              </div>
            )}
          </div>
        </div>

        {/* Overlay stage */}
        <div className="xl:col-span-2 p-3 bg-white rounded-2xl shadow relative">
          <div ref={containerRef} className="relative w-full overflow-auto" style={{ minHeight: 520 }}>
            {/* Base layer: primary bike */}
            {renderBikeLayer(primaryBike, false)}

            {/* Overlay layer: secondary bike */}
            {renderBikeLayer(secondaryBike, true)}
          </div>

          <div className="mt-3 text-xs text-gray-600">
            Note: this is a visual comparison scaled by the selected tire outer diameter. Minor
            inaccuracies may result from image angle, perspective distortion, and manual point
            placement.
          </div>
        </div>
      </div>
    </div>
  );
}
