import { useMemo, useRef, useState } from 'react';
import { BIKES } from './data/bikes';
import { outerDiameterMM } from './utils/tire';
import { useImage } from './hooks/useImage';
import { Marker } from './components/Marker';
import { ClickGuide } from './components/ClickGuide';

export default function App() {
  const [opacityB, setOpacityB] = useState(0.5);
  const [showA, setShowA] = useState(true);
  const [showB, setShowB] = useState(true);
  const containerRef = useRef(null);

  // Calibration state per bike
  const [wheelChoice, setWheelChoice] = useState({ vstrom: "rear", gsx: "rear" });
  const [calibPts, setCalibPts] = useState({
    vstrom: { top: null, bot: null },
    gsx: { top: null, bot: null },
  });
  const [axle, setAxle] = useState({ vstrom: null, gsx: null });

  // Rider triangle markers per bike
  const [markers, setMarkers] = useState({
    vstrom: { seat: null, peg: null, bar: null },
    gsx: { seat: null, peg: null, bar: null },
  });

  // Image refs and sizes
  const imgA = useImage(BIKES.vstrom.img);
  const imgB = useImage(BIKES.gsx.img);

  // Helper to set points on click
  const [activeBike, setActiveBike] = useState("vstrom");
  const [activeTool, setActiveTool] = useState("calibTop");

  const od = useMemo(() => ({
    vstrom: outerDiameterMM(BIKES.vstrom.tires[wheelChoice.vstrom]) ?? 0,
    gsx: outerDiameterMM(BIKES.gsx.tires[wheelChoice.gsx]) ?? 0,
  }), [wheelChoice]);

  function distance(a, b) {
    if (!a || !b) return 0;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  const pxPerMM = useMemo(() => {
    const topA = calibPts.vstrom.top, botA = calibPts.vstrom.bot;
    const topB = calibPts.gsx.top, botB = calibPts.gsx.bot;
    const dA = distance(topA, botA);
    const dB = distance(topB, botB);
    return {
      vstrom: dA && od.vstrom ? dA / od.vstrom : 0,
      gsx: dB && od.gsx ? dB / od.gsx : 0,
    };
  }, [calibPts, od]);

  const scaleB = useMemo(() => {
    if (!pxPerMM.vstrom || !pxPerMM.gsx) return 1;
    return pxPerMM.vstrom / pxPerMM.gsx;
  }, [pxPerMM]);

  const translateB = useMemo(() => {
    if (!axle.vstrom || !axle.gsx) return { x: 0, y: 0 };
    const scaledBx = axle.gsx.x * scaleB;
    const scaledBy = axle.gsx.y * scaleB;
    return {
      x: axle.vstrom.x - scaledBx,
      y: axle.vstrom.y - scaledBy,
    };
  }, [axle, scaleB]);

  function onClickImage(e, bikeKey) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (activeTool === "calibTop") {
      setCalibPts((s) => ({ ...s, [bikeKey]: { ...s[bikeKey], top: { x, y } } }));
    } else if (activeTool === "calibBot") {
      setCalibPts((s) => ({ ...s, [bikeKey]: { ...s[bikeKey], bot: { x, y } } }));
    } else if (activeTool === "axle") {
      setAxle((s) => ({ ...s, [bikeKey]: { x, y } }));
    } else if (["seat", "peg", "bar"].includes(activeTool)) {
      setMarkers((s) => ({ ...s, [bikeKey]: { ...s[bikeKey], [activeTool]: { x, y } } }));
    }
  }

  function mmBetween(bikeKey, aKey, bKey) {
    const m = markers[bikeKey];
    const pA = m[aKey];
    const pB = m[bKey];
    const px = distance(pA, pB);
    if (!pxPerMM.vstrom) return 0;
    const mm = px / pxPerMM.vstrom;
    return mm;
  }

  const ready = pxPerMM.vstrom && pxPerMM.gsx && axle.vstrom && axle.gsx;

  return (
    <div className="min-h-screen w-full p-4 bg-gray-50">
      <h1 className="text-2xl font-semibold mb-2">Riding Position Comparison: Suzuki GSX-S1000GX vs V-Strom 1050 SE</h1>
      <p className="text-gray-700 mb-4">Follow the steps below to calibrate and overlay the two bikes. Then position the three points (Seat, Footpeg, Handlebar) on each image to compare the rider triangle. Measurements are in millimeters, estimated from the selected tire size.</p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Controls */}
        <div className="xl:col-span-1 space-y-4">
          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="font-medium mb-2">1) Select wheel for calibration</h2>
            {Object.entries(BIKES).map(([key, b]) => (
              <div key={key} className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ background: b.color }} />
                  <div className="font-medium">{b.label}</div>
                </div>
                <div className="flex gap-2 text-sm">
                  <button
                    className={`px-2 py-1 rounded border ${wheelChoice[key] === "front" ? "bg-gray-900 text-white" : "bg-white"}`}
                    onClick={() => setWheelChoice((s) => ({ ...s, [key]: "front" }))}
                  >
                    Front ({b.tires.front})
                  </button>
                  <button
                    className={`px-2 py-1 rounded border ${wheelChoice[key] === "rear" ? "bg-gray-900 text-white" : "bg-white"}`}
                    onClick={() => setWheelChoice((s) => ({ ...s, [key]: "rear" }))}
                  >
                    Rear ({b.tires.rear})
                  </button>
                </div>
                <div className="text-xs text-gray-600 mt-1">Estimated outer diameter: {od[key]?.toFixed(1)} mm</div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="font-medium mb-2">2) Select tool and click on the image</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["calibTop", "Calib. TOP wheel"],
                ["calibBot", "Calib. BOTTOM wheel"],
                ["axle", "Rear axle center"],
                ["seat", "Seat"],
                ["peg", "Footpeg"],
                ["bar", "Handlebar"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={`px-2 py-1 rounded border ${activeTool === key ? "bg-blue-600 text-white" : "bg-white"}`}
                  onClick={() => setActiveTool(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-3 text-sm">
              Active on: {activeBike === "vstrom" ? "V-Strom 1050 SE" : "GSX-S1000GX"}
            </div>
            <div className="flex gap-2 mt-2">
              <button className={`px-2 py-1 rounded border ${activeBike === "vstrom" ? "bg-gray-900 text-white" : "bg-white"}`} onClick={() => setActiveBike("vstrom")}>V-Strom</button>
              <button className={`px-2 py-1 rounded border ${activeBike === "gsx" ? "bg-gray-900 text-white" : "bg-white"}`} onClick={() => setActiveBike("gsx")}>GSX-S</button>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="font-medium mb-2">3) Overlay & visibility</h2>
            <div className="flex items-center gap-3 mb-2">
              <label className="text-sm">GSX-S Opacity</label>
              <input type="range" min={0} max={1} step={0.01} value={opacityB} onChange={(e) => setOpacityB(parseFloat(e.target.value))} />
            </div>
            <div className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={showA} onChange={(e) => setShowA(e.target.checked)} /> Show V-Strom</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={showB} onChange={(e) => setShowB(e.target.checked)} /> Show GSX-S</label>
            </div>
            <div className="mt-2 text-xs text-gray-600">Tip: calibrate TOP/BOTTOM on the outer tire profile, then mark the rear axle center on both bikes. Alignment is applied automatically.</div>
          </div>

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
                {(["vstrom", "gsx"]).map((k) => (
                  <tr key={k}>
                    <td className="py-1">
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: BIKES[k].color }} />{BIKES[k].label}</div>
                    </td>
                    <td className="py-1">{mmBetween(k, "seat", "peg") ? mmBetween(k, "seat", "peg").toFixed(0) : "–"}</td>
                    <td className="py-1">{mmBetween(k, "seat", "bar") ? mmBetween(k, "seat", "bar").toFixed(0) : "–"}</td>
                    <td className="py-1">{mmBetween(k, "peg", "bar") ? mmBetween(k, "peg", "bar").toFixed(0) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!ready && (
              <div className="mt-2 text-xs text-amber-700">Complete calibration (TOP/BOTTOM wheel + rear axle for both bikes) to enable accurate measurements.</div>
            )}
          </div>
        </div>

        {/* Overlay stage */}
        <div className="xl:col-span-2 p-3 bg-white rounded-2xl shadow relative">
          <div ref={containerRef} className="relative w-full overflow-auto" style={{ minHeight: 520 }}>
            {/* Base layer: V-Strom */}
            <div
              className="relative inline-block"
              onClick={(e) => onClickImage(e, "vstrom")}
              style={{ display: showA ? "inline-block" : "none" }}
            >
              <img
                src={BIKES.vstrom.img}
                alt="V-Strom 1050 SE"
                className="block max-w-full h-auto select-none"
                onLoad={imgA.onLoad}
                draggable={false}
              />
              {/* V-Strom overlays */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {calibPts.vstrom.top && calibPts.vstrom.bot && (
                  <line x1={calibPts.vstrom.top.x} y1={calibPts.vstrom.top.y} x2={calibPts.vstrom.bot.x} y2={calibPts.vstrom.bot.y} stroke={BIKES.vstrom.color} strokeWidth={2} strokeDasharray="4 3" />
                )}
              </svg>
              {axle.vstrom && <Marker x={axle.vstrom.x} y={axle.vstrom.y} color={BIKES.vstrom.color} label="Rear axle" onDrag={(nx, ny) => setAxle((s)=>({ ...s, vstrom: { x: nx, y: ny } }))} />}
              {markers.vstrom.seat && <Marker x={markers.vstrom.seat.x} y={markers.vstrom.seat.y} color={BIKES.vstrom.color} label="Seat" onDrag={(nx, ny)=>setMarkers((s)=>({ ...s, vstrom: { ...s.vstrom, seat: { x:nx, y:ny } }}))} />}
              {markers.vstrom.peg && <Marker x={markers.vstrom.peg.x} y={markers.vstrom.peg.y} color={BIKES.vstrom.color} label="Footpeg" onDrag={(nx, ny)=>setMarkers((s)=>({ ...s, vstrom: { ...s.vstrom, peg: { x:nx, y:ny } }}))} />}
              {markers.vstrom.bar && <Marker x={markers.vstrom.bar.x} y={markers.vstrom.bar.y} color={BIKES.vstrom.color} label="Handlebar" onDrag={(nx, ny)=>setMarkers((s)=>({ ...s, vstrom: { ...s.vstrom, bar: { x:nx, y:ny } }}))} />}

              {/* Click guide */}
              <div className="absolute left-2 top-2">
                <ClickGuide text={`V-Strom: click for ${
                  activeTool === "calibTop" ? "wheel TOP" : activeTool === "calibBot" ? "wheel BOTTOM" : activeTool === "axle" ? "rear axle" : activeTool === "seat" ? "seat" : activeTool === "peg" ? "footpeg" : "handlebar"
                }`} />
              </div>
            </div>

            {/* Overlaid GSX-S layer */}
            <div
              className="absolute top-0 left-0"
              style={{ transform: `translate(${translateB.x}px, ${translateB.y}px) scale(${scaleB})`, transformOrigin: "top left", opacity: showB ? opacityB : 0, pointerEvents: showB ? "auto" : "none" }}
              onClick={(e) => onClickImage(e, "gsx")}
            >
              <img
                src={BIKES.gsx.img}
                alt="GSX-S1000GX"
                className="block max-w-full h-auto select-none"
                onLoad={imgB.onLoad}
                draggable={false}
              />
              {/* GSX overlays */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {calibPts.gsx.top && calibPts.gsx.bot && (
                  <line x1={calibPts.gsx.top.x} y1={calibPts.gsx.top.y} x2={calibPts.gsx.bot.x} y2={calibPts.gsx.bot.y} stroke={BIKES.gsx.color} strokeWidth={2} strokeDasharray="4 3" />
                )}
              </svg>
              {axle.gsx && <Marker x={axle.gsx.x} y={axle.gsx.y} color={BIKES.gsx.color} label="Rear axle" onDrag={(nx, ny) => setAxle((s)=>({ ...s, gsx: { x: nx, y: ny } }))} />}
              {markers.gsx.seat && <Marker x={markers.gsx.seat.x} y={markers.gsx.seat.y} color={BIKES.gsx.color} label="Seat" onDrag={(nx, ny)=>setMarkers((s)=>({ ...s, gsx: { ...s.gsx, seat: { x:nx, y:ny } }}))} />}
              {markers.gsx.peg && <Marker x={markers.gsx.peg.x} y={markers.gsx.peg.y} color={BIKES.gsx.color} label="Footpeg" onDrag={(nx, ny)=>setMarkers((s)=>({ ...s, gsx: { ...s.gsx, peg: { x:nx, y:ny } }}))} />}
              {markers.gsx.bar && <Marker x={markers.gsx.bar.x} y={markers.gsx.bar.y} color={BIKES.gsx.color} label="Handlebar" onDrag={(nx, ny)=>setMarkers((s)=>({ ...s, gsx: { ...s.gsx, bar: { x:nx, y:ny } }}))} />}

              <div className="absolute left-2 top-2">
                <ClickGuide text={`GSX-S: click for ${
                  activeTool === "calibTop" ? "wheel TOP" : activeTool === "calibBot" ? "wheel BOTTOM" : activeTool === "axle" ? "rear axle" : activeTool === "seat" ? "seat" : activeTool === "peg" ? "footpeg" : "handlebar"
                }`} />
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-600">
            Note: this is a visual comparison scaled by the selected tire outer diameter. Minor inaccuracies may result from image angle, perspective distortion, and manual point placement.
          </div>
        </div>
      </div>
    </div>
  );
}
