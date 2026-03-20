"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// fragment shader — animated line pattern
const FRAG = `
  #define TWO_PI 6.2831853072
  #define PI 3.14159265359

  precision highp float;
  uniform vec2 resolution;
  uniform float time;

  void main(void) {
    vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
    float t = time*0.05;
    float lineWidth = 0.002;

    vec3 color = vec3(0.0);
    for(int j = 0; j < 3; j++){
      for(int i=0; i < 5; i++){
        color[j] += lineWidth*float(i*i) / abs(fract(t - 0.01*float(j)+float(i)*0.01)*5.0 - length(uv) + mod(uv.x+uv.y, 0.2));
      }
    }

    gl_FragColor = vec4(color[0],color[1],color[2],1.0);
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
