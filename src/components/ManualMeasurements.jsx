/**
 * Manual measurements input component.
 *
 * Allows users to input exact bike measurements when they have
 * physical access to the bike, bypassing photo-based estimation.
 */

function MeasurementInput({ label, hint, value, onChange, unit = 'mm' }) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex-1 text-sm">
        <span className="block text-gray-700">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 px-2 py-1 border rounded text-sm text-right"
          placeholder="—"
          min={0}
          step={1}
        />
        <span className="text-xs text-gray-500 w-6">{unit}</span>
      </div>
    </div>
  );
}

export function ManualMeasurements({ bikeKey, measurementHook, bikeLabel, bikeColor }) {
  const mode = measurementHook.getMode(bikeKey);
  const measurements = measurementHook.getMeasurements(bikeKey);
  const isComplete = measurementHook.isComplete(bikeKey);
  const distances = measurementHook.getDistances(bikeKey);

  const handleModeChange = (newMode) => {
    measurementHook.setMode(bikeKey, newMode);
  };

  const handleChange = (field) => (value) => {
    measurementHook.setMeasurement(bikeKey, field, value);
  };

  return (
    <div className="space-y-3">
      {/* Mode selector */}
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: bikeColor }}
        />
        <span className="font-medium text-sm">{bikeLabel}</span>
        <div className="flex-1" />
        <div className="flex rounded overflow-hidden border text-xs">
          <button
            className={`px-2 py-1 ${mode === 'photo' ? 'bg-gray-900 text-white' : 'bg-white'}`}
            onClick={() => handleModeChange('photo')}
          >
            Photo
          </button>
          <button
            className={`px-2 py-1 ${mode === 'manual' ? 'bg-gray-900 text-white' : 'bg-white'}`}
            onClick={() => handleModeChange('manual')}
          >
            Manual
          </button>
        </div>
      </div>

      {/* Manual measurements form */}
      {mode === 'manual' && (
        <div className="pl-5 space-y-2 border-l-2" style={{ borderColor: bikeColor }}>
          <div className="text-xs text-gray-600 mb-2">
            Measure from seat contact point. Use positive values.
          </div>

          <MeasurementInput
            label="Seat → Peg (horizontal)"
            hint="Behind seat"
            value={measurements.seatToPegHorizontal}
            onChange={handleChange('seatToPegHorizontal')}
          />

          <MeasurementInput
            label="Seat → Peg (vertical)"
            hint="Below seat"
            value={measurements.seatToPegVertical}
            onChange={handleChange('seatToPegVertical')}
          />

          <MeasurementInput
            label="Seat → Bar (horizontal)"
            hint="Forward reach"
            value={measurements.seatToBarHorizontal}
            onChange={handleChange('seatToBarHorizontal')}
          />

          <MeasurementInput
            label="Seat → Bar (vertical)"
            hint="Bar drop (+ if bar below seat)"
            value={measurements.seatToBarVertical}
            onChange={handleChange('seatToBarVertical')}
          />

          {/* Calculated distances */}
          {isComplete && (
            <div className="pt-2 mt-2 border-t text-xs text-gray-600">
              <div className="font-medium mb-1">Calculated distances:</div>
              <div className="flex gap-4">
                <span>Seat-Peg: {distances.seatPeg?.toFixed(0)} mm</span>
                <span>Seat-Bar: {distances.seatBar?.toFixed(0)} mm</span>
                <span>Peg-Bar: {distances.pegBar?.toFixed(0)} mm</span>
              </div>
            </div>
          )}

          {!isComplete && (
            <div className="text-xs text-amber-600 mt-2">
              Fill all fields to calculate angles
            </div>
          )}
        </div>
      )}

      {mode === 'photo' && (
        <div className="pl-5 text-xs text-gray-500">
          Using photo-based calibration
        </div>
      )}
    </div>
  );
}

/**
 * Diagram showing measurement points.
 */
export function MeasurementDiagram() {
  return (
    <svg viewBox="0 0 200 120" className="w-full max-w-xs">
      {/* Simplified bike silhouette */}
      <g stroke="#9ca3af" strokeWidth={1} fill="none">
        {/* Frame triangle */}
        <path d="M 40 90 L 100 50 L 160 90 Z" />
        {/* Wheels */}
        <circle cx={40} cy={90} r={25} />
        <circle cx={160} cy={90} r={25} />
        {/* Handlebar */}
        <line x1={155} y1={40} x2={165} y2={55} />
      </g>

      {/* Measurement points */}
      <circle cx={100} cy={50} r={4} fill="#22c55e" /> {/* Seat */}
      <circle cx={60} cy={85} r={4} fill="#3b82f6" /> {/* Peg */}
      <circle cx={160} cy={45} r={4} fill="#f59e0b" /> {/* Bar */}

      {/* Labels */}
      <text x={100} y={42} textAnchor="middle" fontSize={8} fill="#22c55e">Seat</text>
      <text x={60} y={98} textAnchor="middle" fontSize={8} fill="#3b82f6">Peg</text>
      <text x={160} y={38} textAnchor="middle" fontSize={8} fill="#f59e0b">Bar</text>

      {/* Dimension arrows */}
      <g stroke="#6b7280" strokeWidth={0.5} strokeDasharray="2 1">
        {/* Seat to Peg horizontal */}
        <line x1={60} y1={50} x2={100} y2={50} />
        {/* Seat to Peg vertical */}
        <line x1={60} y1={50} x2={60} y2={85} />
        {/* Seat to Bar horizontal */}
        <line x1={100} y1={45} x2={160} y2={45} />
      </g>
    </svg>
  );
}
