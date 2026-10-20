'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { CameraViewMode, ChallengeType, GameSettings, StuntResult, TelemetryData } from '../lib/types';
import { PhysicsSimulation, RampPath } from '../lib/physics';
import { SoundEngine } from '../lib/sound';
import { ParticleSystem } from '../lib/particles';
import { createObstacleCars, createRampMesh, createRunway } from '../lib/environment';
import { createProceduralTeslaRoadster, loadGlbRoadster, RoadsterCar } from '../lib/roadsterModel';
import { HUD } from './HUD';
import { ControlsDrawer } from './ControlsDrawer';

const DEFAULT_SETTINGS: GameSettings = {
  gravity: 9.81,
  drive: 6.0,
  cruise: 22.0,
  thrust: 2.4,
  boost: 2.2,
  gas: 600,
  burn: 180,
  spin: 5.0,
  steady: 1.6,
  landAngle: 28,
  landSpeed: 7.0,
  zoneX: -24,
  zoneHalf: 5.0,
  jumpZoneX: -76,
  jumpZoneHalf: 6.0,
  runIn: 190,
  r1: 7.0,
  wall: 9.0,
  r2: 5.0,
  sweep: 90,
  lip: 3.0,
  width: 4.6,
  bodyColor: '#c00f1c', // Signature Tesla Ultra Red
  ledColor: '#ff3326',
  gasColor: '#d6efff',
  bloom: 0.85,
  exposure: 1.0,
  shake: true,
  sound: true,
  volume: 0.5
};

export const RoadsterGame: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // React State for HUD & UI
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [challenge, setChallenge] = useState<ChallengeType>('ramp');
  const [viewMode, setViewMode] = useState<CameraViewMode>('Side');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [testCount, setTestCount] = useState(1);
  const [bestScore, setBestScore] = useState(0);
  const [stuntResult, setStuntResult] = useState<StuntResult | null>(null);

  const [telemetry, setTelemetry] = useState<TelemetryData>({
    height: 0,
    speed: 0,
    gForce: 1,
    tilt: 0,
    gas: 600,
    gasMax: 600,
    mode: 'ready',
    suction: false,
    lifting: false,
    boosting: false,
    pitching: 0
  });

  // Game Engine References
  const simRef = useRef<PhysicsSimulation | null>(null);
  const soundRef = useRef<SoundEngine | null>(null);
  const particlesRef = useRef<ParticleSystem | null>(null);
  const carRef = useRef<RoadsterCar | null>(null);
  const rampMeshRef = useRef<ReturnType<typeof createRampMesh> | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const pointLightRef = useRef<THREE.PointLight | null>(null);
  const viewModeRef = useRef<CameraViewMode>(viewMode);
  viewModeRef.current = viewMode;

  // Key & Touch input tracking
  const inputsRef = useRef({
    forward: false,
    back: false,
    lift: false,
    boost: false,
    ccw: false,
    cw: false
  });

  // Camera manual orbit drag state
  const orbitRef = useRef({
    dragging: false,
    prevX: 0,
    prevY: 0,
    yaw: 0,
    pitch: 0
  });

  // Restart Simulation
  const restart = useCallback(() => {
    if (simRef.current) {
      simRef.current.reset();
      setStuntResult(null);
      setTestCount(c => c + 1);
    }
  }, []);

  // Update Challenge
  const handleSelectChallenge = useCallback((c: ChallengeType) => {
    setChallenge(c);
    if (simRef.current) {
      simRef.current.challenge = c;
      simRef.current.reset();
      setStuntResult(null);
    }
  }, []);

  // Toggle Camera View
  const handleToggleView = useCallback(() => {
    const modes: CameraViewMode[] = ['Side', 'Chase', 'Drone', 'Ground'];
    const nextIdx = (modes.indexOf(viewModeRef.current) + 1) % modes.length;
    setViewMode(modes[nextIdx]);
  }, []);

  // Handle Touchpad Action Press
  const handleTouchPress = useCallback((action: 'forward' | 'back' | 'lift' | 'boost' | 'ccw' | 'cw', pressed: boolean) => {
    inputsRef.current[action] = pressed;
    soundRef.current?.ensure();
  }, []);

  // Initialize WebGL Scene, Physics & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // 1. High-Performance Anti-Aliased WebGL2 Renderer Setup
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor('#000000', 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = settings.exposure;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Scene & Fog Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#000000', 0.011);

    const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.5, 600);
    cameraRef.current = camera;

    // 3. Post-Processing Pipeline with WebGL2 Hardware Multisampling (MSAA) for crisp anti-aliasing
    const renderTarget = new THREE.WebGLRenderTarget(
      container.clientWidth * pixelRatio,
      container.clientHeight * pixelRatio,
      {
        type: THREE.HalfFloatType,
        samples: 4
      }
    );
    const composer = new EffectComposer(renderer, renderTarget);
    composer.setPixelRatio(pixelRatio);
    composerRef.current = composer;
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(256, 256),
      0.85,
      0.3,
      1.4
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    // 4. Exact flowing.to Environment & Lighting Setup
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new THREE.Scene(), 0.04).texture;
    pmrem.dispose();
    scene.environment = envTex;
    scene.environmentIntensity = 0.22;

    const ambientLight = new THREE.HemisphereLight('#9aa3ad', '#050505', 0.25);
    scene.add(ambientLight);

    const rampSpot = new THREE.SpotLight('#e8eef5', 420, 0, 0.62, 1, 1.4);
    rampSpot.position.set(-26, 36, 26);
    rampSpot.target.position.set(3, 9, 0);
    rampSpot.castShadow = true;
    rampSpot.shadow.mapSize.set(2048, 2048);
    rampSpot.shadow.camera.near = 10;
    rampSpot.shadow.camera.far = 120;
    rampSpot.shadow.bias = -0.0004;
    rampSpot.shadow.normalBias = 0.04;
    scene.add(rampSpot, rampSpot.target);

    const runwaySpot = new THREE.SpotLight('#e8eef5', 420, 0, 0.6, 1, 1.4);
    runwaySpot.position.set(-118, 30, 24);
    runwaySpot.target.position.set(-106, 0, 0);
    scene.add(runwaySpot, runwaySpot.target);

    const apexFill = new THREE.SpotLight('#ffffff', 90, 0, 0.32, 1, 1.4);
    apexFill.position.set(-10, 5, 14);
    apexFill.target.position.set(7, 12, 0);
    scene.add(apexFill, apexFill.target);

    const pointLight = new THREE.PointLight('#ffffff', 14, 14, 1.6);
    scene.add(pointLight);

    // 5. Environment & Track
    const path = new RampPath({
      runIn: settings.runIn,
      r1: settings.r1,
      wall: settings.wall,
      r2: settings.r2,
      sweep: settings.sweep,
      lip: settings.lip,
      width: settings.width
    });

    const rampMeshObj = createRampMesh(path);
    rampMeshRef.current = rampMeshObj;
    scene.add(rampMeshObj.group);

    const runwayObj = createRunway(settings);
    scene.add(runwayObj.group);

    const obstaclesObj = createObstacleCars();
    scene.add(obstaclesObj.group);

    // 6. Physics Simulation
    const simulation = new PhysicsSimulation(path, settings);
    simulation.obstacles = obstaclesObj.obstacles;
    simRef.current = simulation;

    // 7. Audio & Particles
    const sound = new SoundEngine();
    soundRef.current = sound;

    const particles = new ParticleSystem();
    particlesRef.current = particles;
    scene.add(particles.points);

    // 8. Authentic 3D Roadster Model from flowing.to
    const initialCar = createProceduralTeslaRoadster(settings.bodyColor);
    carRef.current = initialCar;
    scene.add(initialCar.group);

    loadGlbRoadster(
      '/models/roadster_flowing.glb',
      '/draco/',
      glbCar => {
        scene.remove(initialCar.group);
        initialCar.dispose();
        carRef.current = glbCar;
        scene.add(glbCar.group);
      },
      () => {
        // Keeps procedural fallback
      }
    );

    // 9. Responsive Resize Handler (Ensures Crisp Rendering on Mobile & Desktop)
    const handleResize = () => {
      if (!container || !camera || !renderer || !composer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const pr = Math.min(window.devicePixelRatio || 1, 2);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(pr);
      renderer.setSize(width, height);
      composer.setPixelRatio(pr);
      composer.setSize(width, height);
      particles.setScale(height, camera.fov);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    // 10. Pointer Drag for Orbital Camera
    const handlePointerDown = (e: PointerEvent) => {
      orbitRef.current.dragging = true;
      orbitRef.current.prevX = e.clientX;
      orbitRef.current.prevY = e.clientY;
      sound.ensure();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!orbitRef.current.dragging) return;
      const dx = e.clientX - orbitRef.current.prevX;
      const dy = e.clientY - orbitRef.current.prevY;
      orbitRef.current.prevX = e.clientX;
      orbitRef.current.prevY = e.clientY;
      orbitRef.current.yaw += dx * 0.005;
      orbitRef.current.pitch = Math.max(-0.6, Math.min(0.6, orbitRef.current.pitch + dy * 0.005));
    };

    const handlePointerUp = () => {
      orbitRef.current.dragging = false;
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // 11. Keyboard Input Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      sound.ensure();
      if (['ArrowUp', 'KeyW'].includes(e.code)) inputsRef.current.forward = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) inputsRef.current.back = true;
      if (e.code === 'Space') { e.preventDefault(); inputsRef.current.lift = true; }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') inputsRef.current.boost = true;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) inputsRef.current.ccw = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) inputsRef.current.cw = true;
      if (e.code === 'KeyV') handleToggleView();
      if (e.code === 'KeyR') restart();
      if (e.code === 'Escape') setStuntResult(null);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) inputsRef.current.forward = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) inputsRef.current.back = false;
      if (e.code === 'Space') inputsRef.current.lift = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') inputsRef.current.boost = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) inputsRef.current.ccw = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) inputsRef.current.cw = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 12. Main 60-120FPS Animation & Physics Loop
    let lastTime = performance.now();
    let animId = 0;

    const animate = (currentTime: number) => {
      animId = requestAnimationFrame(animate);

      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Gamepad API Polling
      if (navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        const gp = gamepads[0];
        if (gp) {
          const rightTrigger = gp.buttons[7]?.value || 0;
          const leftTrigger = gp.buttons[6]?.value || 0;
          const leftStickX = gp.axes[0] || 0;
          if (rightTrigger > 0.1) inputsRef.current.forward = true;
          if (leftTrigger > 0.1) inputsRef.current.back = true;
          if (gp.buttons[0]?.pressed) inputsRef.current.lift = true; // A button
          if (gp.buttons[5]?.pressed) inputsRef.current.boost = true; // RB
          if (leftStickX < -0.3) inputsRef.current.ccw = true;
          if (leftStickX > 0.3) inputsRef.current.cw = true;
        }
      }

      // Map Inputs to Physics Simulation
      let driveInput = 0;
      if (inputsRef.current.forward) driveInput += 1;
      if (inputsRef.current.back) driveInput -= 1;
      simulation.drive = driveInput;
      simulation.lift = inputsRef.current.lift;
      simulation.boost = inputsRef.current.boost;

      let turnInput = 0;
      if (inputsRef.current.ccw) turnInput += 1; // Counter-clockwise flip
      if (inputsRef.current.cw) turnInput -= 1;  // Clockwise flip
      simulation.turn = turnInput;

      // Tick Fixed 120Hz Physics
      simulation.advance(dt);

      // Handle Events (Landings, Detach, Crashes)
      while (simulation.events.length > 0) {
        const ev = simulation.events.shift();
        if (ev === 'land' || ev === 'crash') {
          sound.hit(1.0, ev === 'crash');
          if (simulation.result) {
            setStuntResult(simulation.result);
            if (simulation.result.landed && simulation.result.score > bestScore) {
              setBestScore(simulation.result.score);
            }
          }
        }
      }

      // Update Car Mesh Position & Orientation
      const car = carRef.current;
      if (car) {
        car.group.position.set(simulation.x, simulation.y, 0);
        car.group.rotation.z = simulation.angle;
        car.updateWheelRotation(simulation.wheelTurn);
        car.updateThrusters(simulation.lifting, simulation.boosting, dt, currentTime * 0.001);
        if (car.setBraking) {
          car.setBraking(simulation.drive < 0);
        }

        // Emit SpaceX Cold Gas Particles
        if (simulation.lifting) {
          const downDir = new THREE.Vector3(0, -1, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), simulation.angle);
          const carVel = new THREE.Vector3(simulation.vx, simulation.vy, 0);
          particles.emitGas(car.group.position, downDir, carVel, 6, 1.2);
        }
        if (simulation.boosting) {
          const tailDir = new THREE.Vector3(-1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), simulation.angle);
          const carVel = new THREE.Vector3(simulation.vx, simulation.vy, 0);
          particles.emitGas(car.group.position, tailDir, carVel, 10, 1.6);
        }
      }

      // Update Particles
      particles.update(dt);

      // Update Animated Ramp LED Ribbon Uniforms
      if (rampMeshRef.current) {
        rampMeshRef.current.led.uniforms.uProgress.value = simulation.progress;
      }

      // Update Procedural Sound Engine
      const thrusterIntensity = (simulation.lifting ? 0.7 : 0) + (simulation.boosting ? 0.9 : 0);
      sound.update(simulation.v, simulation.drive !== 0, simulation.suction, thrusterIntensity);

      // 13. Dynamic Camera Positioning
      const mode = viewModeRef.current;
      const targetX = simulation.x;
      const targetY = Math.max(1.0, simulation.y);

      if (mode === 'Side') {
        // 2D Lateral Cinematic View with lead-ahead
        const lookAhead = simulation.vx * 0.35;
        const targetCamX = targetX + lookAhead;
        const targetCamY = targetY + 3.5;
        camera.position.x += (targetCamX - camera.position.x) * 0.08;
        camera.position.y += (targetCamY - camera.position.y) * 0.08;
        camera.position.z = 24 + Math.abs(simulation.vy) * 0.25;
        camera.lookAt(targetX + lookAhead * 0.5, targetY, 0);
      } else if (mode === 'Chase') {
        // Third-Person Dynamic Rear-Isometric View
        const angle = simulation.angle;
        const dist = 14;
        const camX = targetX - Math.cos(angle) * dist + 2.0;
        const camY = targetY - Math.sin(angle) * 4.0 + 4.0;
        const camZ = 10;
        camera.position.set(camX, Math.max(1.5, camY), camZ);
        camera.lookAt(targetX, targetY + 0.5, 0);
      } else if (mode === 'Drone') {
        // High Overhead Tracking Drone
        camera.position.x += (targetX - 8.0 - camera.position.x) * 0.05;
        camera.position.y += (targetY + 28.0 - camera.position.y) * 0.05;
        camera.position.z += (32.0 - camera.position.z) * 0.05;
        camera.lookAt(targetX, targetY, 0);
      } else if (mode === 'Ground') {
        // Ground Spectator Telephoto View at Landing Zone
        const spectatorX = simulation.challenge === 'jump' ? settings.jumpZoneX + 12 : settings.zoneX + 8;
        camera.position.set(spectatorX, 1.2, 14);
        camera.lookAt(targetX, targetY, 0);
      }

      // Apply Manual Orbital Drag
      if (orbitRef.current.yaw !== 0 || orbitRef.current.pitch !== 0) {
        camera.position.x += Math.sin(orbitRef.current.yaw) * 6.0;
        camera.position.z += Math.cos(orbitRef.current.yaw) * 4.0;
        camera.position.y += orbitRef.current.pitch * 6.0;
        camera.lookAt(targetX, targetY, 0);
      }

      // Render Scene with Bloom Post-processing
      composer.render();

      // Update Telemetry for React HUD (Throttled for efficiency)
      if (Math.round(currentTime) % 3 === 0) {
        setTelemetry({
          height: Math.max(0, simulation.y - 0.6),
          speed: Math.hypot(simulation.vx, simulation.vy),
          gForce: simulation.gForce,
          tilt: (180 * Math.abs(Math.atan2(Math.sin(simulation.angle), Math.cos(simulation.angle)))) / Math.PI,
          gas: simulation.gas,
          gasMax: settings.gas,
          mode: simulation.mode,
          suction: simulation.suction,
          lifting: simulation.lifting,
          boosting: simulation.boosting,
          pitching: simulation.pitching
        });
      }
    };

    animId = requestAnimationFrame(animate);

    // Cleanup Resources on Unmount
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      rampMeshObj.dispose();
      runwayObj.dispose();
      obstaclesObj.dispose();
      particles.dispose();
      sound.dispose();
      renderer.dispose();
    };
  }, [settings, restart, bestScore, handleToggleView]);

  // Synchronize Settings Updates to Live Simulation and Car
  const handleUpdateSettings = useCallback((newSettings: Partial<GameSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      if (simRef.current) simRef.current.setSettings(updated);
      if (carRef.current && newSettings.bodyColor) {
        carRef.current.setPaintColor(newSettings.bodyColor);
      }
      return updated;
    });
  }, []);

  return (
    <div className="rdst-viewport" ref={containerRef}>
      <canvas ref={canvasRef} className="rdst-canvas" />

      {/* Modern HUD Overlay */}
      <HUD
        challenge={challenge}
        onSelectChallenge={handleSelectChallenge}
        viewMode={viewMode}
        onToggleView={handleToggleView}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          setSoundEnabled(s => {
            const next = !s;
            if (soundRef.current) soundRef.current.enabled = next;
            return next;
          });
        }}
        onOpenControls={() => setIsDrawerOpen(true)}
        onRestart={restart}
        testCount={testCount}
        bestScore={bestScore}
        telemetry={telemetry}
        result={stuntResult}
        onCloseResult={() => setStuntResult(null)}
        onTouchPress={handleTouchPress}
      />

      {/* Tuning Settings Drawer */}
      <ControlsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetSettings={() => handleUpdateSettings(DEFAULT_SETTINGS)}
      />
    </div>
  );
};
