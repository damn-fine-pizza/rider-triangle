import { useState, useCallback, useRef } from 'react';

/**
 * Bike configuration card with image preview, label, tire specs, and actions.
 *
 * @param {Object} bike - Bike data
 * @param {function} onUpdate - Callback to update bike properties
 * @param {function} onUpdateImage - Callback to update bike image
 * @param {function} onUpdateTire - Callback to update tire spec
 * @param {function} onRemove - Callback to remove bike
 * @param {boolean} canRemove - Whether bike can be removed (need at least 2)
 */
export function BikeCard({
  bike,
  onUpdate,
  onUpdateImage,
  onUpdateTire,
  onRemove,
  canRemove = true,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(bike.label);
  const inputRef = useRef(null);

  const handleLabelClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(bike.label);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [bike.label]);

  const handleLabelSave = useCallback(() => {
    const trimmed = editLabel.trim();
    if (trimmed && trimmed !== bike.label) {
      onUpdate(bike.id, { label: trimmed });
    }
    setIsEditing(false);
  }, [editLabel, bike.id, bike.label, onUpdate]);

  const handleLabelKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        handleLabelSave();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setEditLabel(bike.label);
      }
    },
    [handleLabelSave, bike.label]
  );

  const handleImageChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        onUpdateImage(bike.id, file);
      }
      e.target.value = '';
    },
    [bike.id, onUpdateImage]
  );

  const handleTireChange = useCallback(
    (wheel, value) => {
      onUpdateTire(bike.id, wheel, value);
    },
    [bike.id, onUpdateTire]
  );

  return (
    <div className="border border-[--border-color] rounded-xl p-3 bg-[--bg-card] shadow-sm">
      {/* Header: Color dot + Label + Remove */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-4 h-4 rounded-full shrink-0"
          style={{ background: bike.color }}
        />

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleLabelSave}
            onKeyDown={handleLabelKeyDown}
            className="flex-1 px-1 py-0.5 text-sm font-medium border border-[--border-color] bg-[--bg-card] rounded"
            autoFocus
          />
        ) : (
          <span
            onClick={handleLabelClick}
            className="flex-1 text-sm font-medium cursor-pointer hover:text-blue-600"
            title="Click to edit"
          >
            {bike.label}
          </span>
        )}

        {canRemove && !bike.isDefault && (
          <button
            onClick={() => onRemove(bike.id)}
            className="text-xs text-red-600 hover:text-red-800"
            title="Remove bike"
          >
            Remove
          </button>
        )}
      </div>

      {/* Image preview */}
      <div className="relative mb-2 bg-[--bg-card-hover] rounded-lg overflow-hidden aspect-video">
        {bike.img ? (
          <img
            src={bike.img}
            alt={bike.label}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            No image
          </div>
        )}

        {/* Change image button overlay */}
        <label className="absolute bottom-1 right-1 px-2 py-1 bg-[--bg-card]/90 rounded text-xs cursor-pointer hover:bg-[--bg-card]">
          Change
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Tire specs */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <label className="w-12 text-secondary">Front:</label>
          <input
            type="text"
            value={bike.tires.front}
            onChange={(e) => handleTireChange('front', e.target.value)}
            placeholder="e.g. 120/70 ZR17"
            className="flex-1 px-2 py-1 border border-[--border-color] bg-[--bg-card] rounded text-xs"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="w-12 text-secondary">Rear:</label>
          <input
            type="text"
            value={bike.tires.rear}
            onChange={(e) => handleTireChange('rear', e.target.value)}
            placeholder="e.g. 190/50 ZR17"
            className="flex-1 px-2 py-1 border border-[--border-color] bg-[--bg-card] rounded text-xs"
          />
        </div>
      </div>

      {/* Warning if tires not set */}
      {(!bike.tires.front || !bike.tires.rear) && (
        <p className="mt-2 text-xs text-amber-600">
          Enter tire specs for calibration
        </p>
      )}
    </div>
  );
}
