"use client";

// ocean continuation — extends the hero waves behind below-fold content
// same seamless tiling approach: 200% wide, -50% translate, linear

export default function WaveDivider() {
  return (
    <div className="relative w-full overflow-hidden" style={{ height: 280 }}>
      {/* deep ocean floor gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(13,59,79,0.3) 0%, rgba(10,22,40,0.2) 40%, rgba(10,10,15,0) 100%)",
        }}
      />

      {/* rolling swell — slow, broad */}
      <svg
        className="absolute top-0 left-0 w-[200%]"
        style={{ height: "70%", animation: "uc-div1 31s linear infinite" }}
        viewBox="0 0 3600 250"
        preserveAspectRatio="none"
      >
        <path
          d={[
            "M0,100 C150,30 320,170 540,90 C760,10 920,180 1200,100 C1480,20 1640,170 1800,100",
            "C1950,30 2120,170 2340,90 C2560,10 2720,180 3000,100 C3280,20 3440,170 3600,100",
            "L3600,250 L0,250 Z",
          ].join(" ")}
          fill="url(#uc-dg1)"
          opacity="0.25"
        />
        <path
          d={[
            "M0,100 C150,30 320,170 540,90 C760,10 920,180 1200,100 C1480,20 1640,170 1800,100",
            "C1950,30 2120,170 2340,90 C2560,10 2720,180 3000,100 C3280,20 3440,170 3600,100",
          ].join(" ")}
          fill="none"
          stroke="#00d4aa"
          strokeWidth="1.5"
          opacity="0.25"
        />
        <defs>
          <linearGradient id="uc-dg1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e6b7a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0a0a0f" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* surface shimmer */}
      <svg
        className="absolute top-0 left-0 w-[200%]"
        style={{ height: "50%", animation: "uc-div2 19s linear infinite" }}
        viewBox="0 0 2880 180"
        preserveAspectRatio="none"
      >
        <path
          d={[
            "M0,80 C120,25 270,135 440,70 C610,5 780,140 960,80 C1140,20 1280,135 1440,80",
            "C1560,25 1710,135 1880,70 C2050,5 2220,140 2400,80 C2580,20 2720,135 2880,80",
            "L2880,180 L0,180 Z",
          ].join(" ")}
          fill="url(#uc-dg2)"
          opacity="0.2"
        />
        <path
          d={[
            "M0,80 C120,25 270,135 440,70 C610,5 780,140 960,80 C1140,20 1280,135 1440,80",
            "C1560,25 1710,135 1880,70 C2050,5 2220,140 2400,80 C2580,20 2720,135 2880,80",
          ].join(" ")}
          fill="none"
          stroke="url(#uc-dc2)"
          strokeWidth="2"
          opacity="0.35"
        />
        <defs>
          <linearGradient id="uc-dg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0a0a0f" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="uc-dc2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.3" />
            <stop offset="25%" stopColor="#00d4aa" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#00b4d8" stopOpacity="0.3" />
            <stop offset="75%" stopColor="#00d4aa" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#00d4aa" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>

      <style>{`
        @keyframes uc-div1 { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes uc-div2 { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}
