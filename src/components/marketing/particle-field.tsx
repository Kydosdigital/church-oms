"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * GPU-animated particle field for the marketing hero.
 *
 * Design notes:
 * - All motion happens in the vertex shader, so the CPU only updates a single
 *   `uTime` uniform per frame. That keeps ~9k particles smooth on mid-range
 *   phones where a JS-side position loop would drop frames.
 * - Rendering is paused when the canvas scrolls out of view or the tab is
 *   hidden, so this never burns battery behind other content.
 * - Honours `prefers-reduced-motion`: the field still renders (it's decorative
 *   but establishes the brand), it simply stops animating.
 * - Everything is disposed on unmount — geometry, material, renderer, and the
 *   WebGL context itself — because this mounts/unmounts on client navigation.
 */

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uSpread;
  uniform vec2 uPointer;

  attribute vec3 aSeed;
  attribute float aScale;

  varying float vDepth;
  varying float vSeed;

  void main() {
    vec3 p = position;

    // Slow vertical drift, wrapped so the field never empties out.
    float span = uSpread * 2.0;
    p.y = mod(p.y + uTime * (0.6 + aSeed.y * 0.9) + aSeed.y * span, span) - uSpread;

    // Layered sine turbulence — cheap stand-in for curl noise, and at this
    // particle density it reads as organic drift rather than obvious waves.
    float t = uTime * 0.35;
    p.x += sin(t + aSeed.x * 6.2831) * 2.2 + sin(t * 1.7 + aSeed.z * 6.2831) * 0.9;
    p.z += cos(t * 0.9 + aSeed.z * 6.2831) * 2.2 + cos(t * 1.3 + aSeed.x * 6.2831) * 0.9;

    // Pointer parallax, scaled by depth so nearer particles move further.
    float depthFactor = (p.z + uSpread) / span;
    p.x += uPointer.x * 3.0 * depthFactor;
    p.y += uPointer.y * 2.0 * depthFactor;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Perspective size attenuation.
    gl_PointSize = uSize * aScale * (60.0 / -mvPosition.z);

    vDepth = clamp(-mvPosition.z / 90.0, 0.0, 1.0);
    vSeed = aSeed.x;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColorNear;
  uniform vec3 uColorFar;
  uniform vec3 uColorAccent;

  varying float vDepth;
  varying float vSeed;

  void main() {
    // Soft round sprite, no texture needed.
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.0, d);
    alpha *= alpha;

    // Depth grades brand-blue (near) into deep navy (far); a small slice of
    // particles gets the brighter accent so the field has sparkle.
    vec3 color = mix(uColorNear, uColorFar, vDepth);
    color = mix(color, uColorAccent, step(0.93, vSeed) * 0.85);

    gl_FragColor = vec4(color, alpha * (1.0 - vDepth * 0.65));
  }
`;

export function ParticleField({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
      });
    } catch {
      // No WebGL (old browser, blocked context, software-rendering refusal).
      // The container simply stays empty and the hero's gradient and photo
      // carry the section on their own — nothing to render, nothing to report.
      return;
    }

    // Cap DPR at 2 — beyond that the extra pixels cost real frames and buy
    // nothing visible on a field of soft dots.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f1419, 0.012);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      1,
      200
    );
    camera.position.set(0, 0, 46);

    // Fewer particles on small screens — phones are both slower and showing
    // the field at a fraction of the area.
    const isSmall = container.clientWidth < 768;
    const COUNT = isSmall ? 3800 : 9000;
    const SPREAD = 42;

    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT * 3);
    const scales = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * SPREAD * 2.6;
      positions[i3 + 1] = (Math.random() - 0.5) * SPREAD * 2;
      positions[i3 + 2] = (Math.random() - 0.5) * SPREAD * 1.4;

      seeds[i3] = Math.random();
      seeds[i3 + 1] = Math.random();
      seeds[i3 + 2] = Math.random();

      // Weighted toward small: a few big soft particles read as depth,
      // a uniform distribution just looks noisy.
      scales[i] = 0.35 + Math.pow(Math.random(), 3) * 2.4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

    const uniforms = {
      uTime: { value: 0 },
      uSize: { value: isSmall ? 5.5 : 7 },
      uSpread: { value: SPREAD },
      uPointer: { value: new THREE.Vector2(0, 0) },
      // Brand palette: --primary #1e9df1 near, deep navy far, pale sky accent.
      uColorNear: { value: new THREE.Color("#3fb0ff") },
      uColorFar: { value: new THREE.Color("#0b2f4d") },
      uColorAccent: { value: new THREE.Color("#dff1ff") },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // --- interaction -------------------------------------------------------
    const pointerTarget = new THREE.Vector2(0, 0);

    function onPointerMove(event: PointerEvent) {
      const rect = container!.getBoundingClientRect();
      pointerTarget.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -(((event.clientY - rect.top) / rect.height) * 2 - 1)
      );
    }
    if (!reducedMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    // --- visibility gating -------------------------------------------------
    let onScreen = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    observer.observe(container);

    // --- resize ------------------------------------------------------------
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // --- loop --------------------------------------------------------------
    const clock = new THREE.Clock();
    let frame = 0;

    function tick() {
      frame = requestAnimationFrame(tick);

      if (!onScreen || document.hidden) return;

      if (!reducedMotion) {
        uniforms.uTime.value = clock.getElapsedTime();
        // Ease toward the pointer so parallax glides rather than snaps.
        uniforms.uPointer.value.lerp(pointerTarget, 0.035);
        points.rotation.y = Math.sin(clock.getElapsedTime() * 0.05) * 0.12;
      }

      renderer.render(scene, camera);
    }
    tick();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} aria-hidden="true" className={className} />;
}
