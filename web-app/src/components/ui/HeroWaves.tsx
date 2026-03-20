"use client";

// dramatic ocean waves — the brand signature visual
// 5 layered waves with parallax depth, moonlight crest glow
// each SVG is 200% wide with a tiling wave pattern (first half = second half)
// translates -50% with linear easing → perfectly seamless loop

// helper: duplicate a wave segment so it tiles perfectly
// segment is drawn in viewBox coords [0, halfW], duplicated to [halfW, 2*halfW]
// both halves are identical → translateX(-50%) loops invisibly

export default function HeroWaves() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">

      {/* vertical gradient: transparent top → deep teal at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "40%",
          background: "linear-gradient(180deg, transparent 0%, rgba(13,59,79,0.15) 40%, rgba(13,59,79,0.3) 100%)",
        }}
      />

      {/* ── WAVE LAYER 1 — deepest, slowest, largest amplitude ── */}
      {/* segment width: 1800, full SVG: 3600, viewBox height: 400 */}
      <svg
        className="absolute bottom-0 left-0 w-[200%]"
        style={{ height: "32%", animation: "uc-wave1 37s linear infinite" }}
        viewBox="0 0 3600 400"
        preserveAspectRatio="none"
      >
        <path
          d={[
            "M0,180 C120,80 280,260 480,160 C680,60 840,280 1080,180 C1320,80 1500,260 1800,180",
            "C1920,80 2080,260 2280,160 C2480,60 2640,280 2880,180 C3120,80 3300,260 3600,180",
            "L3600,400 L0,400 Z",
          ].join(" ")}
          fill="url(#uc-grad1)"
          opacity="0.35"
        />
        <defs>
          <linearGradient id="uc-grad1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d3b4f" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0a1628" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── WAVE LAYER 2 — mid-depth ── */}
      {/* segment width: 1680, full SVG: 3360, viewBox height: 350 */}
      <svg
        className="absolute bottom-0 left-0 w-[200%]"
        style={{ height: "28%", animation: "uc-wave2 29s linear infinite" }}
        viewBox="0 0 3360 350"
        preserveAspectRatio="none"
      >
        <path
          d={[
            "M0,160 C140,80 300,240 500,150 C700,60 860,240 1100,160 C1340,80 1500,240 1680,160",
            "C1820,80 1980,240 2180,150 C2380,60 2540,240 2780,160 C3020,80 3180,240 3360,160",
            "L3360,350 L0,350 Z",
          ].join(" ")}
          fill="url(#uc-grad2)"
          opacity="0.3"
        />
        <defs>
          <linearGradient id="uc-grad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e6b7a" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0d3b4f" stopOpacity="0.8" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── WAVE LAYER 3 — middle, main body + crest glow ── */}
      {/* segment width: 1560, full SVG: 3120, viewBox height: 300 */}
      <svg
        className="absolute bottom-0 left-0 w-[200%]"
        style={{ height: "24%", animation: "uc-wave3 23s linear infinite" }}
        viewBox="0 0 3120 300"
        preserveAspectRatio="none"
      >
        <path
          d={[
            "M0,140 C130,60 280,210 480,130 C680,50 840,210 1040,130 C1240,50 1400,210 1560,140",
            "C1690,60 1840,210 2040,130 C2240,50 2400,210 2600,130 C2800,50 2960,210 3120,140",
            "L3120,300 L0,300 Z",
          ].join(" ")}
          fill="url(#uc-grad3)"
          opacity="0.4"
        />
        <path
          d={[
            "M0,140 C130,60 280,210 480,130 C680,50 840,210 1040,130 C1240,50 1400,210 1560,140",
            "C1690,60 1840,210 2040,130 C2240,50 2400,210 2600,130 C2800,50 2960,210 3120,140",
          ].join(" ")}
          fill="none"
          stroke="url(#uc-crest3)"
          strokeWidth="3"
          opacity="0.5"
        />
        <defs>
          <linearGradient id="uc-grad3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00b4d8" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#0d3b4f" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0a1628" />
          </linearGradient>
          <linearGradient id="uc-crest3" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.3" />
            <stop offset="25%" stopColor="#00d4aa" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#00b4d8" stopOpacity="0.3" />
            <stop offset="75%" stopColor="#00d4aa" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#00d4aa" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── WAVE LAYER 4 — foreground, more opaque + crest glow ── */}
      {/* segment width: 1440, full SVG: 2880, viewBox height: 250 */}
      <svg
        className="absolute bottom-0 left-0 w-[200%]"
        style={{ height: "18%", animation: "uc-wave4 17s linear infinite" }}
        viewBox="0 0 2880 250"
        preserveAspectRatio="none"
      >
        <path
          d={[
            "M0,120 C120,50 260,180 440,110 C620,40 780,190 960,120 C1140,50 1280,190 1440,120",
            "C1560,50 1700,180 1880,110 C2060,40 2220,190 2400,120 C2580,50 2720,190 2880,120",
            "L2880,250 L0,250 Z",
          ].join(" ")}
          fill="url(#uc-grad4)"
          opacity="0.45"
        />
        <path
          d={[
            "M0,120 C120,50 260,180 440,110 C620,40 780,190 960,120 C1140,50 1280,190 1440,120",
            "C1560,50 1700,180 1880,110 C2060,40 2220,190 2400,120 C2580,50 2720,190 2880,120",
          ].join(" ")}
          fill="none"
          stroke="url(#uc-crest4)"
          strokeWidth="2"
          opacity="0.6"
        />
        <defs>
          <linearGradient id="uc-grad4" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.25" />
            <stop offset="40%" stopColor="#0e6b7a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0d3b4f" />
          </linearGradient>
          <linearGradient id="uc-crest4" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.3" />
            <stop offset="30%" stopColor="#00d4aa" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#00b4d8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#00d4aa" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── WAVE LAYER 5 — closest, fastest, brightest crests ── */}
      {/* segment width: 1320, full SVG: 2640, viewBox height: 200 */}
      <svg
        className="absolute bottom-0 left-0 w-[200%]"
        style={{ height: "12%", animation: "uc-wave5 13s linear infinite" }}
        viewBox="0 0 2640 200"
        preserveAspectRatio="none"
      >
        <path
          d={[
            "M0,90 C110,30 240,150 400,85 C560,20 720,155 900,90 C1080,25 1200,150 1320,90",
            "C1430,30 1560,150 1720,85 C1880,20 2040,155 2220,90 C2400,25 2520,150 2640,90",
            "L2640,200 L0,200 Z",
          ].join(" ")}
          fill="url(#uc-grad5)"
          opacity="0.5"
        />
        <path
          d={[
            "M0,90 C110,30 240,150 400,85 C560,20 720,155 900,90 C1080,25 1200,150 1320,90",
            "C1430,30 1560,150 1720,85 C1880,20 2040,155 2220,90 C2400,25 2520,150 2640,90",
          ].join(" ")}
          fill="none"
          stroke="url(#uc-crest5)"
          strokeWidth="2.5"
          opacity="0.7"
        />
        <defs>
          <linearGradient id="uc-grad5" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.3" />
            <stop offset="30%" stopColor="#00b4d8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0d3b4f" />
          </linearGradient>
          <linearGradient id="uc-crest5" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.3" />
            <stop offset="15%" stopColor="#00d4aa" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#00ffcc" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#00d4aa" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00d4aa" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>

      {/* all layers: 200% wide, translate -50%, linear — seamless loop */}
      <style>{`
        @keyframes uc-wave1 { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes uc-wave2 { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes uc-wave3 { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes uc-wave4 { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes uc-wave5 { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}
