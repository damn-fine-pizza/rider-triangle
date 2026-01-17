import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useBikeStore } from './hooks/useBikeStore';
import { useCalibration } from './hooks/useCalibration';
import { useMarkers, MARKER_TYPES } from './hooks/useMarkers';
import { useRiderProfile } from './hooks/useRiderProfile';
import { useMeasurementMode } from './hooks/useMeasurementMode';
import { useImage } from './hooks/useImage';
import { Marker } from './components/Marker';
import { CalibrationMarker } from './components/CalibrationMarker';
import { ClickGuide } from './components/ClickGuide';
import { BikeCard } from './components/BikeCard';
import { ImageUpload } from './components/ImageUpload';
import { RiderProfile } from './components/RiderProfile';
import { ManualMeasurements } from './components/ManualMeasurements';
import { AngleDisplay, RidingStyleSelector } from './components/AngleDisplay';
import { SkeletonOverlay } from './components/SkeletonOverlay';
import { ExportButton } from './components/ExportButton';
import { calculateAllAngles, calculateAllAnglesFromDistances } from './utils/ergonomics';

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
  // Bike store for dynamic bike management
  const bikeStore = useBikeStore();
  const { activeBikes, activeSlots, bikes } = bikeStore;

  // Get bike keys from active slots
  const bikeKeys = useMemo(() => {
    return activeSlots.filter((id) => id && activeBikes[id]);
  }, [activeSlots, activeBikes]);

  const [primaryBike, secondaryBike] = bikeKeys;

  // UI state
  const [opacityB, setOpacityB] = useState(0.5);
  const [showBikes, setShowBikes] = useState(
    bikeKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );
  const [activeBike, setActiveBike] = useState(primaryBike);
  const [activeTool, setActiveTool] = useState('calibTop');
  const [showBikeManager, setShowBikeManager] = useState(false);
  const [ridingStyle, setRidingStyle] = useState('commute');
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showSkeletonAngles, setShowSkeletonAngles] = useState(true);
  const containerRef = useRef(null);

  // Calibration and markers hooks - pass activeBikes
  const calibration = useCalibration(activeBikes);
  const markersHook = useMarkers(bikeKeys);

  // Rider profile hook
  const riderProfile = useRiderProfile();

  // Measurement mode hook (photo vs manual)
  const measurementMode = useMeasurementMode();

  // Image hooks - create for each active bike
  const primaryImg = useImage(activeBikes[primaryBike]?.img);
  const secondaryImg = useImage(activeBikes[secondaryBike]?.img);
  const images = {
    [primaryBike]: primaryImg,
    [secondaryBike]: secondaryImg,
  };

  // Sync activeBike when bikeKeys change
  useEffect(() => {
    if (primaryBike && (!activeBike || !bikeKeys.includes(activeBike))) {
      setActiveBike(primaryBike);
    }
  }, [bikeKeys, primaryBike]);

  // Calculate ergonomic angles for each bike
  const bikeAngles = useMemo(() => {
    const result = {};
    const riderMeasurements = riderProfile.measurements;

    bikeKeys.forEach((key) => {
      const mode = measurementMode.getMode(key);

      if (mode === 'manual' && measurementMode.isComplete(key)) {
        // Use manual measurements
        const distances = measurementMode.getDistances(key);
        const manualInputs = measurementMode.getMeasurements(key);
        result[key] = calculateAllAnglesFromDistances(distances, manualInputs, riderMeasurements);
      } else {
        // Use photo-based calibration
        const markers = markersHook.markers[key];
        const pxPerMM = calibration.pxPerMM[key];

        if (markers && pxPerMM && riderMeasurements) {
          result[key] = calculateAllAngles(markers, riderMeasurements, pxPerMM);
        } else {
          result[key] = { knee: null, hip: null, back: null, arm: null };
        }
      }
    });

    return result;
  }, [bikeKeys, markersHook.markers, calibration.pxPerMM, riderProfile.measurements, measurementMode]);

  // Auto-advance to next tool
  const advanceToNextTool = useCallback(() => {
    const currentIndex = TOOL_SEQUENCE.indexOf(activeTool);
    if (currentIndex < TOOL_SEQUENCE.length - 1) {
      setActiveTool(TOOL_SEQUENCE[currentIndex + 1]);
    }
  }, [activeTool]);

  // Keyboard shortcuts for tool selection (1-6 keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key;
      if (key >= '1' && key <= '6') {
        const index = parseInt(key) - 1;
        if (index < TOOL_SEQUENCE.length) {
          setActiveTool(TOOL_SEQUENCE[index]);
        }
      }
      // Tab to switch active bike
      if (key === 'Tab' && bikeKeys.length > 1) {
        e.preventDefault();
        const currentIndex = bikeKeys.indexOf(activeBike);
        const nextIndex = (currentIndex + 1) % bikeKeys.length;
        setActiveBike(bikeKeys[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bikeKeys, activeBike]);

  // Handle click on image to place points
  const handleImageClick = useCallback(
    (e, bikeKey) => {
      // Only respond to clicks for the active bike
      if (bikeKey !== activeBike) return;

      const rect = e.currentTarget.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      // For overlay bike, convert from visual (scaled) to local coordinates
      if (bikeKey !== primaryBike) {
        const scale = calibration.scales[bikeKey];
        if (scale && scale !== 1) {
          x = x / scale;
          y = y / scale;
        }
      }

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
    [activeBike, activeTool, calibration, markersHook, advanceToNextTool, primaryBike]
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
    const mode = measurementMode.getMode(bikeKey);

    if (mode === 'manual' && measurementMode.isComplete(bikeKey)) {
      // Use manual measurements
      return measurementMode.getDistances(bikeKey);
    }

    // Use photo-based calibration
    return markersHook.getDistances(bikeKey, calibration.pxPerMM[calibration.primaryBike]);
  };

  // Get state for sharing (excludes images due to size)
  const getShareState = useCallback(() => {
    return {
      markers: markersHook.markers,
      calibPts: calibration.calibPts,
      axle: calibration.axle,
      wheelChoice: calibration.wheelChoice,
      rider: riderProfile.profile,
      ridingStyle,
      manualMeasurements: measurementMode.manualMeasurements,
      modes: measurementMode.modes,
    };
  }, [markersHook.markers, calibration, riderProfile.profile, ridingStyle, measurementMode]);

  // Handle adding a new bike
  const handleAddBike = useCallback(
    async (file, label) => {
      const id = await bikeStore.addBike(file, label);
      // If we have an empty slot, put the new bike there
      if (!activeSlots[0]) {
        bikeStore.setActiveSlot(0, id);
      } else if (!activeSlots[1]) {
        bikeStore.setActiveSlot(1, id);
      }
    },
    [bikeStore, activeSlots]
  );

  // Render bike layer
  const renderBikeLayer = (bikeKey, isOverlay = false) => {
    if (!bikeKey || !activeBikes[bikeKey]) return null;

    const bike = activeBikes[bikeKey];
    const isVisible = showBikes[bikeKey] !== false;
    const img = images[bikeKey];
    const markers = markersHook.markers[bikeKey] || {};
    const axle = calibration.axle[bikeKey];
    const calibPts = calibration.calibPts[bikeKey] || {};
    const scale = isOverlay ? calibration.scales[bikeKey] : 1;
    const translation = calibration.translations[bikeKey] || { x: 0, y: 0 };

    const style = isOverlay
      ? {
          transform: `translate(${translation.x}px, ${translation.y}px) scale(${scale})`,
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
        {bike.img ? (
          <img
            src={bike.img}
            alt={bike.label}
            className="block max-w-full h-auto select-none"
            onLoad={img?.onLoad}
            draggable={false}
          />
        ) : (
          <div className="w-96 h-64 bg-gray-200 flex items-center justify-center text-gray-500">
            No image uploaded
          </div>
        )}

        {/* Calibration line with measurement label */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {calibPts.top && calibPts.bot && (
            <>
              <line
                x1={calibPts.top.x}
                y1={calibPts.top.y}
                x2={calibPts.bot.x}
                y2={calibPts.bot.y}
                stroke={bike.color}
                strokeWidth={2}
                strokeDasharray="4 3"
              />
              {/* Measurement label on calibration line */}
              {calibration.outerDiameters[bikeKey] > 0 && (
                <text
                  x={(calibPts.top.x + calibPts.bot.x) / 2 + 10}
                  y={(calibPts.top.y + calibPts.bot.y) / 2}
                  fill={bike.color}
                  fontSize={11}
                  fontWeight="bold"
                  style={{ textShadow: '0 0 3px white, 0 0 3px white' }}
                >
                  {Math.round(calibration.outerDiameters[bikeKey])} mm
                </text>
              )}
            </>
          )}
        </svg>

        {/* Calibration point markers (TOP/BOTTOM) */}
        {calibPts.top && (
          <CalibrationMarker
            x={calibPts.top.x}
            y={calibPts.top.y}
            color={bike.color}
            label="TOP"
            scale={scale}
            onDrag={(nx, ny) => calibration.setCalibPoint(bikeKey, 'top', { x: nx, y: ny })}
          />
        )}
        {calibPts.bot && (
          <CalibrationMarker
            x={calibPts.bot.x}
            y={calibPts.bot.y}
            color={bike.color}
            label="BOT"
            scale={scale}
            onDrag={(nx, ny) => calibration.setCalibPoint(bikeKey, 'bot', { x: nx, y: ny })}
          />
        )}

        {/* Axle marker */}
        {axle && (
          <Marker
            x={axle.x}
            y={axle.y}
            color={bike.color}
            label="Rear axle"
            scale={scale}
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
            scale={scale}
            onDrag={(nx, ny) => markersHook.setMarker(bikeKey, 'seat', { x: nx, y: ny })}
          />
        )}
        {markers.peg && (
          <Marker
            x={markers.peg.x}
            y={markers.peg.y}
            color={bike.color}
            label="Footpeg"
            scale={scale}
            onDrag={(nx, ny) => markersHook.setMarker(bikeKey, 'peg', { x: nx, y: ny })}
          />
        )}
        {markers.bar && (
          <Marker
            x={markers.bar.x}
            y={markers.bar.y}
            color={bike.color}
            label="Handlebar"
            scale={scale}
            onDrag={(nx, ny) => markersHook.setMarker(bikeKey, 'bar', { x: nx, y: ny })}
          />
        )}

        {/* Skeleton overlay */}
        {showSkeleton && markers.seat && markers.peg && markers.bar && (
          <SkeletonOverlay
            markers={markers}
            measurements={riderProfile.measurements}
            pxPerMM={calibration.pxPerMM[bikeKey]}
            angles={bikeAngles[bikeKey]}
            color={bike.color}
            ridingStyle={ridingStyle}
            showAngles={showSkeletonAngles}
            scale={scale}
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

  // Check if we have two bikes to compare
  const hasTwoBikes = bikeKeys.length === 2;

  return (
    <div className="min-h-screen w-full p-4 bg-gray-50">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold">
            Riding Position Comparison
            {hasTwoBikes && (
              <span className="text-lg font-normal text-gray-600 ml-2">
                {activeBikes[secondaryBike]?.label} vs {activeBikes[primaryBike]?.label}
              </span>
            )}
          </h1>
          <p className="text-gray-700 mt-1">
            Calibrate and overlay bikes to compare the rider triangle.
          </p>
        </div>
        <ExportButton containerRef={containerRef} getShareState={getShareState} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Controls */}
        <div className="xl:col-span-1 space-y-4">
          {/* Bike Manager Toggle */}
          <div className="p-4 bg-white rounded-2xl shadow">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-medium">Bikes</h2>
              <button
                onClick={() => setShowBikeManager(!showBikeManager)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showBikeManager ? 'Hide manager' : 'Manage bikes'}
              </button>
            </div>

            {showBikeManager ? (
              <div className="space-y-3">
                {/* Active bike cards */}
                {bikeKeys.map((key) => (
                  <BikeCard
                    key={key}
                    bike={activeBikes[key]}
                    onUpdate={bikeStore.updateBike}
                    onUpdateImage={bikeStore.updateBikeImage}
                    onUpdateTire={bikeStore.updateBikeTire}
                    onRemove={bikeStore.removeBike}
                    canRemove={Object.keys(bikes).length > 2}
                  />
                ))}

                {/* Add new bike */}
                <ImageUpload onUpload={handleAddBike} />

                {/* Bike selector for slots if more than 2 bikes exist */}
                {Object.keys(bikes).length > 2 && (
                  <div className="pt-2 border-t text-sm">
                    <p className="text-gray-600 mb-2">Select bikes to compare:</p>
                    {[0, 1].map((slot) => (
                      <div key={slot} className="flex items-center gap-2 mb-1">
                        <span className="w-16">Slot {slot + 1}:</span>
                        <select
                          value={activeSlots[slot] || ''}
                          onChange={(e) => bikeStore.setActiveSlot(slot, e.target.value)}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                        >
                          <option value="">Select...</option>
                          {Object.values(bikes).map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reset to defaults */}
                <button
                  onClick={bikeStore.resetToDefaults}
                  className="w-full text-xs text-gray-500 hover:text-gray-700 py-1"
                >
                  Reset to default bikes
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                {bikeKeys.map((key) => (
                  <div key={key} className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: activeBikes[key]?.color }}
                    />
                    <span>{activeBikes[key]?.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 1: Wheel selection */}
          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="font-medium mb-2">1) Select wheel for calibration</h2>
            {bikeKeys.map((key) => {
              const bike = activeBikes[key];
              if (!bike) return null;
              return (
                <div key={key} className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ background: bike.color }} />
                    <div className="font-medium">{bike.label}</div>
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
                      disabled={!bike.tires?.front}
                    >
                      Front {bike.tires?.front ? `(${bike.tires.front})` : ''}
                    </button>
                    <button
                      className={`px-2 py-1 rounded border ${calibration.wheelChoice[key] === 'rear' ? 'bg-gray-900 text-white' : 'bg-white'}`}
                      onClick={() => calibration.setWheel(key, 'rear')}
                      disabled={!bike.tires?.rear}
                    >
                      Rear {bike.tires?.rear ? `(${bike.tires.rear})` : ''}
                    </button>
                  </div>
                  {calibration.outerDiameters[key] > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      Estimated outer diameter: {calibration.outerDiameters[key]?.toFixed(1)} mm
                    </div>
                  )}
                  {(!bike.tires?.front || !bike.tires?.rear) && (
                    <div className="text-xs text-amber-600 mt-1">
                      Enter tire specs in bike manager
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Step 2: Tool selection */}
          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="font-medium mb-2">2) Select tool and click on the image</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {TOOL_SEQUENCE.map((tool, index) => (
                <button
                  key={tool}
                  className={`px-2 py-1 rounded border flex items-center justify-between ${activeTool === tool ? 'bg-blue-600 text-white' : 'bg-white'}`}
                  onClick={() => setActiveTool(tool)}
                >
                  <span>{TOOL_LABELS[tool]}</span>
                  <span className={`text-xs ml-1 px-1 rounded ${activeTool === tool ? 'bg-blue-500' : 'bg-gray-200 text-gray-600'}`}>
                    {index + 1}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Press 1-6 to select tool, Tab to switch bike
            </div>
            <div className="mt-3 text-sm">
              Active on:{' '}
              <span className="font-medium">{activeBikes[activeBike]?.label || 'None'}</span>
            </div>
            <div className="flex gap-2 mt-2">
              {bikeKeys.map((key) => (
                <button
                  key={key}
                  className={`px-2 py-1 rounded border ${activeBike === key ? 'bg-gray-900 text-white' : 'bg-white'}`}
                  onClick={() => setActiveBike(key)}
                >
                  {activeBikes[key]?.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Overlay controls */}
          {hasTwoBikes && (
            <div className="p-4 bg-white rounded-2xl shadow">
              <h2 className="font-medium mb-2">3) Overlay & visibility</h2>
              <div className="flex items-center gap-3 mb-2">
                <label className="text-sm">{activeBikes[secondaryBike]?.label} Opacity</label>
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
                      checked={showBikes[key] !== false}
                      onChange={() => toggleBikeVisibility(key)}
                    />
                    Show {activeBikes[key]?.label.split(' ')[0]}
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-3 text-sm mt-2 pt-2 border-t">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showSkeleton}
                    onChange={(e) => setShowSkeleton(e.target.checked)}
                  />
                  Show skeleton
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showSkeletonAngles}
                    onChange={(e) => setShowSkeletonAngles(e.target.checked)}
                    disabled={!showSkeleton}
                  />
                  Show angles
                </label>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                Tip: calibrate TOP/BOTTOM on the outer tire profile, then mark the rear axle center on
                both bikes. Alignment is applied automatically.
              </div>
            </div>
          )}

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
                  const bike = activeBikes[key];
                  if (!bike) return null;
                  const distances = getDistancesForBike(key);
                  return (
                    <tr key={key}>
                      <td className="py-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ background: bike.color }}
                          />
                          {bike.label}
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

          {/* Step 5: Measurement Mode */}
          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="font-medium mb-2">5) Measurement Mode</h2>
            <p className="text-xs text-gray-600 mb-3">
              Use Photo mode for image-based estimation, or Manual mode if you have exact measurements.
            </p>
            <div className="space-y-4">
              {bikeKeys.map((key) => (
                <ManualMeasurements
                  key={key}
                  bikeKey={key}
                  measurementHook={measurementMode}
                  bikeLabel={activeBikes[key]?.label}
                  bikeColor={activeBikes[key]?.color}
                />
              ))}
            </div>
          </div>

          {/* Step 6: Rider Profile */}
          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="font-medium mb-2">6) Rider Profile</h2>
            <RiderProfile riderHook={riderProfile} />
          </div>

          {/* Step 7: Ergonomic Angles */}
          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="font-medium mb-2">7) Ergonomic Angles</h2>
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">Riding style:</div>
              <RidingStyleSelector value={ridingStyle} onChange={setRidingStyle} />
            </div>
            {hasTwoBikes ? (
              <AngleDisplay
                angles={bikeAngles[primaryBike]}
                anglesB={bikeAngles[secondaryBike]}
                label={activeBikes[primaryBike]?.label}
                labelB={activeBikes[secondaryBike]?.label}
                color={activeBikes[primaryBike]?.color}
                colorB={activeBikes[secondaryBike]?.color}
                ridingStyle={ridingStyle}
                showComparison={true}
              />
            ) : (
              <AngleDisplay
                angles={bikeAngles[primaryBike]}
                label={activeBikes[primaryBike]?.label}
                color={activeBikes[primaryBike]?.color}
                ridingStyle={ridingStyle}
              />
            )}
            {!calibration.isCalibrated && (
              <div className="mt-2 text-xs text-amber-700">
                Complete calibration and place all markers (seat, peg, bar) to calculate angles.
              </div>
            )}
          </div>
        </div>

        {/* Overlay stage */}
        <div className="xl:col-span-2 p-3 bg-white rounded-2xl shadow relative">
          <div ref={containerRef} className="relative w-full overflow-auto" style={{ minHeight: 520 }}>
            {hasTwoBikes ? (
              <>
                {/* Base layer: primary bike */}
                {renderBikeLayer(primaryBike, false)}

                {/* Overlay layer: secondary bike */}
                {renderBikeLayer(secondaryBike, true)}
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                {bikeKeys.length === 0
                  ? 'Add at least two bikes to compare'
                  : 'Select a second bike to compare'}
              </div>
            )}
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
