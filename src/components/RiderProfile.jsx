import { useState, useCallback } from 'react';
import { SEAT_POSITIONS, estimateFromHeight } from '../data/bodyProportions';

/**
 * Measurement input row with override capability.
 */
function MeasurementRow({ label, estimatedMM, overrideMM, onOverride, onClear }) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const effectiveValue = overrideMM ?? estimatedMM;
  const isOverridden = overrideMM !== null && overrideMM !== undefined;

  const handleEditStart = () => {
    setInputValue(String(effectiveValue));
    setIsEditing(true);
  };

  const handleEditSave = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onOverride(parsed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleEditSave();
    if (e.key === 'Escape') setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-2 text-sm py-1">
      <span className="w-24 text-secondary">{label}</span>
      {isEditing ? (
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleEditSave}
          onKeyDown={handleKeyDown}
          className="w-20 px-2 py-0.5 border border-[--border-color] bg-[--bg-card] rounded text-right"
          autoFocus
        />
      ) : (
        <span
          onClick={handleEditStart}
          className={`w-20 text-right cursor-pointer hover:text-blue-600 ${isOverridden ? 'font-medium' : ''}`}
          title="Click to override"
        >
          {effectiveValue} mm
        </span>
      )}
      {isOverridden && (
        <button
          onClick={onClear}
          className="text-xs text-muted hover:text-red-600"
          title="Reset to estimated"
        >
          reset
        </button>
      )}
      {!isOverridden && <span className="text-xs text-muted">(est.)</span>}
    </div>
  );
}

/**
 * Rider profile form component.
 *
 * @param {Object} riderHook - Result from useRiderProfile hook
 */
export function RiderProfile({ riderHook }) {
  const {
    profiles,
    activeId,
    activeProfile,
    measurements,
    profileIds,
    createProfile,
    updateProfile,
    setOverride,
    clearOverride,
    setSeatPosition,
    setHeight,
    setActiveProfile,
    deleteProfile,
  } = riderHook;

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const handleNameClick = useCallback(() => {
    setNameInput(activeProfile?.name || '');
    setIsEditingName(true);
  }, [activeProfile]);

  const handleNameSave = useCallback(() => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      updateProfile({ name: trimmed });
    }
    setIsEditingName(false);
  }, [nameInput, updateProfile]);

  const estimated = activeProfile ? estimateFromHeight(activeProfile.heightCm) : null;

  if (!activeProfile) return null;

  return (
    <div className="space-y-3">
      {/* Profile selector */}
      <div className="flex items-center gap-2">
        <select
          value={activeId}
          onChange={(e) => setActiveProfile(e.target.value)}
          className="flex-1 px-2 py-1 border border-[--border-color] bg-[--bg-card] rounded text-sm"
        >
          {profileIds.map((id) => (
            <option key={id} value={id}>
              {profiles[id].name}
            </option>
          ))}
        </select>
        <button
          onClick={() => createProfile()}
          className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800"
          title="Add new profile"
        >
          + New
        </button>
        {profileIds.length > 1 && (
          <button
            onClick={() => deleteProfile(activeId)}
            className="px-2 py-1 text-sm text-red-600 hover:text-red-800"
            title="Delete profile"
          >
            Delete
          </button>
        )}
      </div>

      {/* Profile name */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-secondary">Name:</span>
        {isEditingName ? (
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSave();
              if (e.key === 'Escape') setIsEditingName(false);
            }}
            className="flex-1 px-2 py-0.5 border border-[--border-color] bg-[--bg-card] rounded text-sm"
            autoFocus
          />
        ) : (
          <span
            onClick={handleNameClick}
            className="flex-1 text-sm font-medium cursor-pointer hover:text-blue-600"
          >
            {activeProfile.name}
          </span>
        )}
      </div>

      {/* Height input */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-secondary">Height:</label>
        <input
          type="number"
          value={activeProfile.heightCm}
          onChange={(e) => setHeight(parseInt(e.target.value, 10) || 170)}
          className="w-20 px-2 py-1 border border-[--border-color] bg-[--bg-card] rounded text-sm text-right"
          min={100}
          max={250}
        />
        <span className="text-sm text-muted">cm</span>
      </div>

      {/* Body measurements */}
      <div className="border-t border-[--border-color] pt-2">
        <div className="text-xs text-muted mb-1">Click values to override, or use estimates:</div>
        <MeasurementRow
          label="Inseam"
          estimatedMM={estimated?.inseam}
          overrideMM={activeProfile.overrides?.inseam}
          onOverride={(v) => setOverride('inseam', v)}
          onClear={() => clearOverride('inseam')}
        />
        <MeasurementRow
          label="Torso"
          estimatedMM={estimated?.torso}
          overrideMM={activeProfile.overrides?.torso}
          onOverride={(v) => setOverride('torso', v)}
          onClear={() => clearOverride('torso')}
        />
        <MeasurementRow
          label="Arm length"
          estimatedMM={estimated?.armLength}
          overrideMM={activeProfile.overrides?.armLength}
          onOverride={(v) => setOverride('armLength', v)}
          onClear={() => clearOverride('armLength')}
        />
      </div>

      {/* Seat position */}
      <div className="border-t border-[--border-color] pt-2">
        <div className="text-sm text-secondary mb-1">Seat position:</div>
        <div className="flex gap-2">
          {Object.entries(SEAT_POSITIONS).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setSeatPosition(key)}
              className={
                activeProfile.seatPosition === key
                  ? 'btn-toggle-neutral-active'
                  : 'btn-toggle-inactive'
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted mt-1">
          Affects hip angle calculation based on seat rail position
        </div>
      </div>

      {/* Summary */}
      {measurements && (
        <div className="border-t border-[--border-color] pt-2 text-xs text-secondary">
          <div className="font-medium mb-1">Effective measurements:</div>
          <div className="grid grid-cols-2 gap-x-4">
            <span>Inseam: {measurements.inseam} mm</span>
            <span>Torso: {measurements.torso} mm</span>
            <span>Arm: {measurements.armLength} mm</span>
            <span>Seat: {measurements.seatPosition}</span>
          </div>
        </div>
      )}
    </div>
  );
}
