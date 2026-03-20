"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// fragment shader — "UnderCurrent": ocean depths + data network
// layer 1: domain-warped fbm ocean currents (navy → teal)
// layer 2: caustic light ripples (faint pool-light shimmer)
// layer 3: bioluminescent network nodes + pulsing edges
const FRAG = `
  precision highp float;
  uniform vec2 resolution;
  uniform float time;

  // ── utilities ──────────────────────────────────────────────────

  float h1(float n) { return fract(sin(n) * 43758.5453); }
  vec2  h2(float n) { return vec2(h1(n), h1(n + 57.0)); }

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(
      mix(h1(i.x +       i.y*57.0), h1(i.x+1.0 +       i.y*57.0), f.x),
      mix(h1(i.x + (i.y+1.0)*57.0), h1(i.x+1.0 + (i.y+1.0)*57.0), f.x),
      f.y);
  }

  // 4-octave fbm — organic, non-repeating turbulence
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p  = p * 2.1 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  // capsule sdf — for drawing connection lines
  float capsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 ab = b - a;
    float t = clamp(dot(p-a, ab) / dot(ab, ab), 0.0, 1.0);
    return length(p - (a + t*ab)) - r;
  }

  // ── main ───────────────────────────────────────────────────────

  void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
    float t  = time * 0.010; // slow — premium, hypnotic

    // ── LAYER 1: OCEAN CURRENTS ───────────────────────────────────
    // two-level domain warping → fluid, never-repeating motion
    vec2 q = vec2(
      fbm(uv*0.85 + vec2(0.00, 0.00) + t*0.28),
      fbm(uv*0.85 + vec2(5.20, 1.30) + t*0.30)
    );
    vec2 r = vec2(
      fbm(uv*0.85 + 3.2*q + vec2(1.70, 9.20) + t*0.18),
      fbm(uv*0.85 + 3.2*q + vec2(8.30, 2.80) + t*0.16)
    );
    float flow = fbm(uv*0.85 + 3.2*r + t*0.10);

    // deep navy (#0a1628) → dark teal (#0d3b4f) driven by flow
    vec3 col = mix(
      vec3(0.039, 0.086, 0.157),    // #0a1628 deep navy
      vec3(0.051, 0.231, 0.310),    // #0d3b4f dark teal
      smoothstep(0.20, 0.80, flow)
    );
    // subtle brighter teal at flow peaks (the "ridges" of the current)
    col = mix(col, vec3(0.038, 0.268, 0.282), smoothstep(0.65, 0.92, flow) * 0.65);

    // ── LAYER 2: CAUSTIC RIPPLES ──────────────────────────────────
    // overlapping sines distorted by the flow field — pool-light shimmer
    float tc  = time * 0.006;
    vec2 cuv  = uv * 2.8 + r * 1.1; // r ties caustics to the same currents
    float cau = abs(sin(cuv.x*1.30 + tc      + sin(cuv.y*1.10 + tc*0.85)*1.4));
    cau      *= abs(sin(cuv.y*1.20 + tc*0.90 + sin(cuv.x*1.40 + tc     )*1.2));
    cau       = pow(cau, 4.0); // sharp peaks, mostly dark — like real caustics
    col      += vec3(0.55, 0.88, 0.96) * cau * 0.052; // cool white shimmer

    // ── LAYER 3: BIOLUMINESCENT NETWORK ──────────────────────────
    const int N = 22;
    vec2  pos[22];
    float cent[22]; // centrality flag: 0=regular, 1=high

    for (int i = 0; i < N; i++) {
      float fi = float(i);

      // anchor spread across visible area (~16:9)
      vec2 anch = (h2(fi*13.7 + 1.0)*2.0 - 1.0) * vec2(1.55, 0.88);

      // drift: sine oscillation — each node has unique phase and speed
      // feels like being gently carried by the current
      float px = h1(fi*3.10)*6.28,  py = h1(fi*7.30)*6.28;
      float sx = 0.20+h1(fi*11.0)*0.25, sy = 0.18+h1(fi*13.0)*0.22;
      pos[i]  = anch + vec2(sin(t*sx*5.0+px)*0.09, cos(t*sy*5.0+py)*0.07);
      cent[i] = step(0.80, h1(fi*19.3)); // top ~20% high-centrality
    }

    // edges — bioluminescent connections that pulse like signals
    for (int i = 0; i < N; i++) {
      for (int j = 0; j < N; j++) {
        if (j <= i) continue;

        float fi = float(i), fj = float(j);
        float seed = h1(fi*7.0 + fj*3.0 + 100.0);
        if (seed > 0.33) continue;      // ~33% connection density

        float d = length(pos[i] - pos[j]);
        if (d > 1.08) continue;         // no very long edges

        // traveling pulse — signal moving through the network
        float phase = h1(fi*5.0 + fj*11.0)*6.28;
        float spd   = 1.5 + h1(seed*5.0)*2.5;
        float pulse = 0.28 + 0.72*(0.5 + 0.5*sin(t*spd*5.0 + phase));
        float dfade = 1.0 - smoothstep(0.25, 1.08, d); // shorter = brighter

        // thin line + glow halo = bioluminescent look
        float sdf  = capsule(uv, pos[i], pos[j], 0.0008);
        float edge = smoothstep(0.0030, 0.0, sdf) * pulse * dfade;
        float halo = smoothstep(0.0160, 0.0, sdf) * pulse * dfade * 0.28;

        float isHot = max(cent[i], cent[j]);
        vec3 ec = mix(
          vec3(0.000, 0.831, 0.667),   // #00d4aa teal/cyan
          vec3(0.961, 0.620, 0.043),   // #f59e0b amber
          isHot * 0.42
        );

        col += ec * edge * 0.28;
        col += ec * halo * 0.10;
      }
    }

    // nodes — layered glow: outer halo → inner glow → bright core
    for (int i = 0; i < N; i++) {
      float fi = float(i);
      float bp     = h1(fi*23.1)*6.28;
      float bspeed = 0.50 + h1(fi*5.7)*0.65;
      float breath = 0.58 + 0.42*sin(t*bspeed*5.0 + bp);

      float d   = length(uv - pos[i]);
      bool hot  = cent[i] > 0.5;

      // sizes scale with centrality — high nodes visually dominant
      float dotR  = hot ? 0.009 : 0.005;
      float glowR = hot ? 0.032 : 0.019;
      float haloR = hot ? 0.065 : 0.040;

      float dot_  = smoothstep(dotR,  0.001, d);
      float glow_ = smoothstep(glowR, 0.000, d) * breath;
      float halo_ = smoothstep(haloR, 0.000, d) * breath * 0.50;

      if (hot) {
        // amber: important nodes — "critical people" visualization
        col += vec3(0.961, 0.502, 0.020) * halo_ * 0.12;
        col += vec3(0.961, 0.620, 0.043) * glow_ * 0.28;
        col += vec3(1.000, 0.900, 0.680) * dot_  * 0.82 * breath;
      } else {
        // teal/cyan: regular nodes — bioluminescent organisms in the deep
        col += vec3(0.000, 0.580, 0.530) * halo_ * 0.08;
        col += vec3(0.000, 0.831, 0.667) * glow_ * 0.20;
        col += vec3(0.400, 0.940, 0.860) * dot_  * 0.62 * breath;
      }
    }

    // ── FINISH ─────────────────────────────────────────────────────
    // soft radial vignette — pulls focus to center where the title lives
    col *= 1.0 - smoothstep(0.28, 1.35, length(uv * 0.58));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

const VERT = `void main() { gl_Position = vec4( position, 1.0 ); }`;

export default function Background() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const ctx = useRef<{
    camera: THREE.Camera;
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    uniforms: any;
    animationId: number;
  } | null>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const camera = new THREE.Camera();
    camera.position.z = 1;

    const scene = new THREE.Scene();
    const geo = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      time: { type: "f", value: 1.0 },
      resolution: { type: "v2", value: new THREE.Vector2() },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
    });

    scene.add(new THREE.Mesh(geo, mat));

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);

    const onResize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      uniforms.resolution.value.x = renderer.domElement.width;
      uniforms.resolution.value.y = renderer.domElement.height;
    };
    onResize();
    window.addEventListener("resize", onResize, false);

    ctx.current = { camera, scene, renderer, uniforms, animationId: 0 };

    const tick = () => {
      const id = requestAnimationFrame(tick);
      uniforms.time.value += 0.05;
      renderer.render(scene, camera);
      if (ctx.current) ctx.current.animationId = id;
    };
    tick();

    return () => {
      window.removeEventListener("resize", onResize);
      if (ctx.current) {
        cancelAnimationFrame(ctx.current.animationId);
        if (el && ctx.current.renderer.domElement) {
          el.removeChild(ctx.current.renderer.domElement);
        }
        ctx.current.renderer.dispose();
      }
      geo.dispose();
      mat.dispose();
    };
  }, []);

  return (
    <div
      ref={canvasRef}
      className="absolute inset-0"
      style={{ background: "#000", overflow: "hidden", zIndex: 0 }}
    />
  );
}
