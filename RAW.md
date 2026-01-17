This is the prototype of rider-triangle, written in js.

import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Interactive overlay to compare rider triangle (seat, peg, handlebar)
 * between Suzuki GSX-S1000GX and V-Strom 1050 SE using official side images.
 *
 * Steps:
 * 1) Calibrate each bike by clicking TOP and BOTTOM of the chosen wheel (front or rear).
 * 2) Click the REAR AXLE center for each bike.
 * 3) Use opacity slider to align overlays (axle is auto-aligned & scaled by wheel OD).
 * 4) Place/drag the three markers (Seat, Peg, Bar) for each bike.
 *
 * Distances are computed in millimeters using the calibration.
 */

// --- Utility: parse tire spec like "190/50 R17" or "120/70 ZR17M/C"
function parseTireSpec(spec) {
  // Extract width, aspect, inch from strings like "120/70 ZR17M/C"
  // width/aspect ... R(or ZR)17...
  const re = /([0-9]{2,3})\s*\/\s*([0-9]{2})[^0-9]*([0-9]{2})/i;
  const m = spec.match(re);
  if (!m) return null;
  const width = parseFloat(m[1]);
  const aspect = parseFloat(m[2]);
  const rimInch = parseFloat(m[3]);
  return { width, aspect, rimInch };
}

function outerDiameterMM(spec) {
  const p = parseTireSpec(spec);
  if (!p) return null;
  const rimMM = p.rimInch * 25.4;
  const sidewall = p.width * (p.aspect / 100);
  return rimMM + 2 * sidewall; // mm
}

const BIKES = {
  vstrom: {
    label: "V-Strom 1050 SE",
    color: "#ef6c00", // orange
    img: "https://moto.suzuki.it/modelli/360/v-strom-1050SE/img/data/grade1/color1/19.jpg",
    tires: {
      front: "110/80 R19",
      rear: "150/70 R17",
    },
  },
  gsx: {
    label: "GSX-S1000GX",
    color: "#1976d2", // blue
    img: "https://moto.suzuki.it/modelli/360/gsx-s1000gx/img/data/grade1/color1/19.jpg",
    tires: {
      front: "120/70 ZR17M/C",
      rear: "190/50 ZR17M/C",
    },
  },
};

function useImage(src) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const ref = useRef(null);
  return {
    ref,
    size,
    onLoad: (e) => {
      const el = e.currentTarget;
      setSize({ w: el.naturalWidth, h: el.naturalHeight });
    },
  };
}

function Marker({ x, y, color, label, onDrag }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let dragging = false;
    let ox = 0, oy = 0;
    const down = (e) => {
      e.preventDefault();
      dragging = true;
      ox = e.clientX - el.offsetLeft;
      oy = e.clientY - el.offsetTop;
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      window.addEventListener("touchmove", moveTouch, { passive: false });
      window.addEventListener("touchend", up);
    };
    const move = (e) => {
      if (!dragging) return;
      const nx = e.clientX - ox;
      const ny = e.clientY - oy;
      onDrag && onDrag(nx, ny);
    };
    const moveTouch = (e) => {
      if (!dragging) return;
      if (!e.touches || !e.touches[0]) return;
      const t = e.touches[0];
      const nx = t.clientX - ox;
      const ny = t.clientY - oy;
      onDrag && onDrag(nx, ny);
    };
    const up = () => {
      dragging = false;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", moveTouch);
      window.removeEventListener("touchend", up);
    };
    el.addEventListener("mousedown", down);
    el.addEventListener("touchstart", down, { passive: false });
    return () => {
      el.removeEventListener("mousedown", down);
      el.removeEventListener("touchstart", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", moveTouch);
      window.removeEventListener("touchend", up);
    };
  }, [onDrag]);
  return (
    <div
      ref={ref}
      className="absolute -translate-x-1/2 -translate-y-1/2 select-none"
      style={{ left: x, top: y }}
    >
      <div
        className="w-4 h-4 rounded-full shadow"
        title={label}
        style={{ background: color, border: "2px solid white" }}
      />
      <div className="text-xs mt-1 px-1 py-0.5 rounded bg-white/80 border">
        {label}
      </div>
    </div>
  );
}

function ClickGuide({ text }) {
  return (
    <div className="text-xs text-gray-700 bg-white/90 border px-2 py-1 rounded shadow inline-block">
      {text}
    </div>
  );
}

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
  const [activeTool, setActiveTool] = useState("calibTop"); // calibTop|calibBot|axle|seat|peg|bar

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

  // Compute scale for GSX relative to V-Strom, so both are same mm/px
  const scaleB = useMemo(() => {
    if (!pxPerMM.vstrom || !pxPerMM.gsx) return 1;
    return pxPerMM.vstrom / pxPerMM.gsx;
  }, [pxPerMM]);

  // Compute translation for image B (GSX) to align axle centers
  const translateB = useMemo(() => {
    if (!axle.vstrom || !axle.gsx) return { x: 0, y: 0 };
    // Axle position of B after scale
    const scaledBx = axle.gsx.x * scaleB;
    const scaledBy = axle.gsx.y * scaleB;
    return {
      x: axle.vstrom.x - scaledBx,
      y: axle.vstrom.y - scaledBy,
    };
  }, [axle, scaleB]);

  // Click handler to set points relative to the active image
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

  // Derived mm distances for triangles
  function mmBetween(bikeKey, aKey, bKey) {
    const m = markers[bikeKey];
    const pA = m[aKey];
    const pB = m[bKey];
    const px = distance(pA, pB);
    const rate = bikeKey === "vstrom" ? pxPerMM.vstrom : pxPerMM.gsx * scaleB; // After scaling B, mm per px equals vstrom's
    if (!rate) return 0;
    // After transform, both share same px->mm as vstrom baseline
    const mm = px / pxPerMM.vstrom; // use vstrom baseline for both
    return mm;
  }

  const ready = pxPerMM.vstrom && pxPerMM.gsx && axle.vstrom && axle.gsx;

  return (
    <div className="min-h-screen w-full p-4 bg-gray-50">
      <h1 className="text-2xl font-semibold mb-2">Confronto posizione di guida: Suzuki GSX-S1000GX vs V-Strom 1050 SE</h1>
      <p className="text-gray-700 mb-4">Segui i passaggi qui sotto per calibrare e sovrapporre le due moto. Poi posiziona i tre punti (Sella, Pedana, Manubrio) su ciascuna immagine per confrontare la triangolazione del pilota. I calcoli sono in millimetri, stimati dalla misura del pneumatico scelto.</p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Controls */}
        <div className="xl:col-span-1 space-y-4">
          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="font-medium mb-2">1) Scelta ruota per calibrazione</h2>
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
                    Anteriore ({b.tires.front})
                  </button>
                  <button
                    className={`px-2 py-1 rounded border ${wheelChoice[key] === "rear" ? "bg-gray-900 text-white" : "bg-white"}`}
                    onClick={() => setWheelChoice((s) => ({ ...s, [key]: "rear" }))}
                  >
                    Posteriore ({b.tires.rear})
                  </button>
                </div>
                <div className="text-xs text-gray-600 mt-1">Ø esterno stimato: {od[key]?.toFixed(1)} mm</div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="font-medium mb-2">2) Seleziona lo strumento e fai click sull'immagine</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["calibTop", "Calib. TOP ruota"],
                ["calibBot", "Calib. BOTTOM ruota"],
                ["axle", "Centro perno post."],
                ["seat", "Sella"],
                ["peg", "Pedana"],
                ["bar", "Manubrio"],
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
              Attivo su: {activeBike === "vstrom" ? "V-Strom 1050 SE" : "GSX-S1000GX"}
            </div>
            <div className="flex gap-2 mt-2">
              <button className={`px-2 py-1 rounded border ${activeBike === "vstrom" ? "bg-gray-900 text-white" : "bg-white"}`} onClick={() => setActiveBike("vstrom")}>V-Strom</button>
              <button className={`px-2 py-1 rounded border ${activeBike === "gsx" ? "bg-gray-900 text-white" : "bg-white"}`} onClick={() => setActiveBike("gsx")}>GSX-S</button>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="font-medium mb-2">3) Overlay & visibilità</h2>
            <div className="flex items-center gap-3 mb-2">
              <label className="text-sm">Opacità GSX-S</label>
              <input type="range" min={0} max={1} step={0.01} value={opacityB} onChange={(e) => setOpacityB(parseFloat(e.target.value))} />
            </div>
            <div className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={showA} onChange={(e) => setShowA(e.target.checked)} /> Mostra V-Strom</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={showB} onChange={(e) => setShowB(e.target.checked)} /> Mostra GSX-S</label>
            </div>
            <div className="mt-2 text-xs text-gray-600">Suggerimento: calibra TOP/BOTTOM su profilo esterno del pneumatico scelto, poi indica il centro del perno ruota posteriore su entrambe. L'allineamento viene applicato automaticamente.</div>
          </div>

          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="font-medium mb-2">4) Distanze triangolo pilota (mm)</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-1">Moto</th>
                  <th className="py-1">Sella↔Pedana</th>
                  <th className="py-1">Sella↔Manubrio</th>
                  <th className="py-1">Pedana↔Manubrio</th>
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
              <div className="mt-2 text-xs text-amber-700">Completa la calibrazione (TOP/BOTTOM ruota + perno posteriore per entrambe) per attivare misure attendibili.</div>
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
                {/* calib line */}
                {calibPts.vstrom.top && calibPts.vstrom.bot && (
                  <line x1={calibPts.vstrom.top.x} y1={calibPts.vstrom.top.y} x2={calibPts.vstrom.bot.x} y2={calibPts.vstrom.bot.y} stroke={BIKES.vstrom.color} strokeWidth={2} strokeDasharray="4 3" />
                )}
              </svg>
              {axle.vstrom && <Marker x={axle.vstrom.x} y={axle.vstrom.y} color={BIKES.vstrom.color} label="Perno post." onDrag={(nx, ny) => setAxle((s)=>({ ...s, vstrom: { x: nx, y: ny } }))} />}
              {markers.vstrom.seat && <Marker x={markers.vstrom.seat.x} y={markers.vstrom.seat.y} color={BIKES.vstrom.color} label="Sella" onDrag={(nx, ny)=>setMarkers((s)=>({ ...s, vstrom: { ...s.vstrom, seat: { x:nx, y:ny } }}))} />}
              {markers.vstrom.peg && <Marker x={markers.vstrom.peg.x} y={markers.vstrom.peg.y} color={BIKES.vstrom.color} label="Pedana" onDrag={(nx, ny)=>setMarkers((s)=>({ ...s, vstrom: { ...s.vstrom, peg: { x:nx, y:ny } }}))} />}
              {markers.vstrom.bar && <Marker x={markers.vstrom.bar.x} y={markers.vstrom.bar.y} color={BIKES.vstrom.color} label="Manubrio" onDrag={(nx, ny)=>setMarkers((s)=>({ ...s, vstrom: { ...s.vstrom, bar: { x:nx, y:ny } }}))} />}

              {/* Click guide */}
              <div className="absolute left-2 top-2">
                <ClickGuide text={`V-Strom: clic per ${
                  activeTool === "calibTop" ? "TOP ruota" : activeTool === "calibBot" ? "BOTTOM ruota" : activeTool === "axle" ? "perno post." : activeTool === "seat" ? "sella" : activeTool === "peg" ? "pedana" : "manubrio"
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
              {axle.gsx && <Marker x={axle.gsx.x} y={axle.gsx.y} color={BIKES.gsx.color} label="Perno post." onDrag={(nx, ny) => setAxle((s)=>({ ...s, gsx: { x: nx, y: ny } }))} />}
              {markers.gsx.seat && <Marker x={markers.gsx.seat.x} y={markers.gsx.seat.y} color={BIKES.gsx.color} label="Sella" onDrag={(nx, ny)=>setMarkers((s)=>({ ...s, gsx: { ...s.gsx, seat: { x:nx, y:ny } }}))} />}
              {markers.gsx.peg && <Marker x={markers.gsx.peg.x} y={markers.gsx.peg.y} color={BIKES.gsx.color} label="Pedana" onDrag={(nx, ny)=>setMarkers((s)=>({ ...s, gsx: { ...s.gsx, peg: { x:nx, y:ny } }}))} />}
              {markers.gsx.bar && <Marker x={markers.gsx.bar.x} y={markers.gsx.bar.y} color={BIKES.gsx.color} label="Manubrio" onDrag={(nx, ny)=>setMarkers((s)=>({ ...s, gsx: { ...s.gsx, bar: { x:nx, y:ny } }}))} />}

              <div className="absolute left-2 top-2">
                <ClickGuide text={`GSX-S: clic per ${
                  activeTool === "calibTop" ? "TOP ruota" : activeTool === "calibBot" ? "BOTTOM ruota" : activeTool === "axle" ? "perno post." : activeTool === "seat" ? "sella" : activeTool === "peg" ? "pedana" : "manubrio"
                }`} />
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-600">
            Nota: questa è una comparazione visuale in scala basata sul diametro esterno del pneumatico selezionato. Piccole imprecisioni possono derivare dall'angolazione dell'immagine, deformazioni prospettiche e dal posizionamento manuale dei punti.
          </div>
        </div>
      </div>
    </div>
  );
}
