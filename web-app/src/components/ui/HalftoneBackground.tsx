"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const vertexShader = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;

  // Hash for noise gradient lookup
  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  // 2D simplex-style noise — output roughly -1..1
  float snoise(vec2 p) {
    const float K1 = 0.366025404;
    const float K2 = 0.211324865;
    vec2 i = floor(p + (p.x + p.y) * K1);
    vec2 a = p - i + (i.x + i.y) * K2;
    float m = step(a.y, a.x);
    vec2 o = vec2(m, 1.0 - m);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0 * K2;
    vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
    vec3 n = h * h * h * h * vec3(
      dot(a, hash22(i)),
      dot(b, hash22(i + o)),
      dot(c, hash22(i + 1.0))
    );
    return dot(n, vec3(70.0));
  }

  // 4-octave fractional Brownian motion
  float fbm(vec2 p) {
    float total = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      total += snoise(p) * amp;
      p *= 2.0;
      amp *= 0.5;
    }
    return total;
  }

  void main() {
    // Aspect-corrected UV centred at origin — noise field stays the right shape on any viewport
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;

    // Slow time evolution
    float t = uTime * 0.05;

    // Domain-warped FBM — produces flowing, organic shapes (not generic noise)
    vec2 q = vec2(
      fbm(uv + t),
      fbm(uv + vec2(5.2, 1.3) + t)
    );
    vec2 r = vec2(
      fbm(uv + 1.5 * q + vec2(1.7, 9.2) + t * 1.5),
      fbm(uv + 1.5 * q + vec2(8.3, 2.8) + t * 1.2)
    );
    float n = fbm(uv + 2.0 * r);

    // Contrast pump — pushes most of the field to black, only bright peaks emerge as shapes
    float brightness = smoothstep(0.10, 0.70, n);

    // Halftone dot grid in PIXEL space — dot density stays constant regardless of viewport size
    float gridSize = 180.0;
    vec2 cell = gl_FragCoord.xy / uResolution.y * gridSize;
    vec2 cellFract = fract(cell) - 0.5;
    float dist = length(cellFract);

    // Dot radius scales with local brightness (0 = no dot, 0.45 = nearly-touching neighbors)
    float dotRadius = brightness * 0.32;
    float dotAlpha = 1.0 - smoothstep(dotRadius - 0.04, dotRadius + 0.04, dist);

    // Final colour — pure greyscale, no tint. Brightness multiplier softens fade-out at shape edges.
    vec3 col = vec3(dotAlpha * brightness * 0.42);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function HalftoneBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    uniforms: { uTime: { value: number }; uResolution: { value: THREE.Vector2 } };
    geo: THREE.PlaneGeometry;
    mat: THREE.ShaderMaterial;
    rafId: number;
    paused: boolean;
    lastTime: number;
  } | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // --- Three.js setup ---
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    } catch {
      setWebglFailed(true);
      return;
    }

    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 1);
    el.appendChild(renderer.domElement);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const scene = new THREE.Scene();
    const geo = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2() },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    scene.add(new THREE.Mesh(geo, mat));

    // --- Resize handler ---
    const onResize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      const pr = renderer.getPixelRatio();
      uniforms.uResolution.value.set(w * pr, h * pr);
    };
    onResize();
    window.addEventListener("resize", onResize);

    // --- Visibility handler (pause on hidden tab) ---
    let paused = false;
    let lastTime = performance.now();

    const onVisibility = () => {
      if (document.hidden) {
        paused = true;
      } else {
        paused = false;
        lastTime = performance.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // --- Animation loop ---
    let rafId = 0;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      if (paused) return;

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      uniforms.uTime.value += dt;
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(tick);

    ctxRef.current = { renderer, scene, camera, uniforms, geo, mat, rafId, paused, lastTime };

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (el && renderer.domElement.parentNode === el) {
        el.removeChild(renderer.domElement);
      }
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      ctxRef.current = null;
    };
  }, []);

  if (webglFailed) {
    return <div aria-hidden className="absolute inset-0 bg-black" />;
  }

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0"
    />
  );
}
