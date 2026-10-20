import * as THREE from 'three';
import { RampPath } from './physics';
import { GameSettings, ObstacleVehicle } from './types';

export const OBSTACLES_CONFIG = [
  {
    label: 'the Cab',
    length: 4.2,
    width: 1.95,
    height: 1.42,
    color: '#eab308', // Taxi Yellow
    metal: 0.6,
    body: [
      [2.1, 0.42], [1.0, 0.90], [-1.6, 0.94], [-2.1, 0.85],
      [-2.12, 0.42], [-1.9, 0.25], [1.9, 0.25]
    ],
    glass: [
      [1.05, 0.86], [0.15, 1.38], [-0.7, 1.42], [-1.75, 0.97],
      [-1.7, 0.84], [1.0, 0.8]
    ],
    glassMode: 'canopy',
    wheels: [1.35, -1.35],
    wheelR: 0.36
  },
  {
    label: 'the Pickup',
    length: 5.7,
    width: 2.2,
    height: 1.95,
    color: '#94a3b8', // Cybertruck Silver
    metal: 0.85,
    body: [
      [2.85, 0.55], [2.85, 1.12], [0.2, 1.95], [-2.85, 1.38],
      [-2.85, 0.55], [-2.6, 0.42], [2.6, 0.42]
    ],
    glass: [
      [1.75, 1.32], [0.2, 1.82], [-1.0, 1.62], [-1.0, 1.3]
    ],
    glassMode: 'side',
    wheels: [1.9, -1.9],
    wheelR: 0.45
  },
  {
    label: 'the Semi Truck',
    length: 7.2,
    width: 2.5,
    height: 3.95,
    color: '#e2e8f0', // Clean White
    metal: 0.25,
    body: [
      [3.6, 0.5], [3.6, 1.6], [2.9, 3.4], [2.2, 3.95],
      [0.4, 3.95], [0.4, 1.3], [-3.6, 1.3], [-3.6, 0.6], [3.4, 0.45]
    ],
    glass: [
      [3.0, 2.25], [2.4, 3.35], [1.2, 3.35], [1.2, 2.25]
    ],
    glassMode: 'side',
    wheels: [2.6, -1.7, -2.95],
    wheelR: 0.52
  },
  {
    label: 'the SUV',
    length: 4.75,
    width: 1.98,
    height: 1.58,
    color: '#334155', // Charcoal Dark
    metal: 0.65,
    body: [
      [2.37, 0.42], [2.4, 0.74], [1.4, 0.98], [-2.0, 1.08],
      [-2.37, 1.0], [-2.4, 0.48], [-2.2, 0.3], [2.2, 0.3]
    ],
    glass: [
      [1.3, 0.96], [0.3, 1.55], [-1.3, 1.58], [-2.2, 1.08],
      [-2.15, 0.95], [1.2, 0.9]
    ],
    glassMode: 'canopy',
    wheels: [1.45, -1.45],
    wheelR: 0.40
  },
  {
    label: 'the Sedan',
    length: 4.7,
    width: 1.93,
    height: 1.42,
    color: '#b91c1c', // Deep Crimson
    metal: 0.7,
    body: [
      [2.35, 0.38], [2.38, 0.68], [1.3, 0.90], [-1.9, 0.98],
      [-2.35, 0.88], [-2.36, 0.45], [-2.2, 0.28], [2.2, 0.28]
    ],
    glass: [
      [1.2, 0.88], [0.25, 1.38], [-0.9, 1.42], [-2.05, 0.98],
      [-2.0, 0.86], [1.1, 0.82]
    ],
    glassMode: 'canopy',
    wheels: [1.42, -1.42],
    wheelR: 0.38
  }
];

export function createRunway(settings: GameSettings) {
  const group = new THREE.Group();
  const geoms: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  // 1. Wet Asphalt Ground Plane
  const groundGeom = new THREE.PlaneGeometry(750, 400);
  groundGeom.rotateX(-Math.PI / 2);
  geoms.push(groundGeom);

  const groundMat = new THREE.MeshStandardMaterial({
    color: '#0d0d0f',
    roughness: 0.75,
    metalness: 0.2,
    envMapIntensity: 0.4
  });
  mats.push(groundMat);

  const groundMesh = new THREE.Mesh(groundGeom, groundMat);
  groundMesh.position.set(-80, -0.03, 0);
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // 2. Tarmac Markings Material
  const lineMat = new THREE.MeshBasicMaterial({
    color: '#71717a',
    transparent: true,
    opacity: 0.6,
    polygonOffset: true,
    polygonOffsetFactor: -2
  });
  mats.push(lineMat);

  const addLine = (x0: number, z0: number, x1: number, z1: number, width: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const geom = new THREE.PlaneGeometry(len, width);
    geom.rotateX(-Math.PI / 2);
    geoms.push(geom);

    const mesh = new THREE.Mesh(geom, lineMat);
    mesh.position.set((x0 + x1) / 2, 0.005, (z0 + z1) / 2);
    mesh.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    group.add(mesh);
  };

  // Runway boundary line strips
  addLine(-70, -26, 12, 22, 0.18);
  addLine(-70, 26, 12, -22, 0.18);
  addLine(-190, 0, -40, 0, 0.14);

  // Target Landing Zones
  const addTargetZone = (centerX: number, halfWidth: number) => {
    addLine(centerX - halfWidth, -3.2, centerX + halfWidth, -3.2, 0.25);
    addLine(centerX - halfWidth, 3.2, centerX + halfWidth, 3.2, 0.25);
    addLine(centerX - halfWidth, -3.2, centerX - halfWidth, 3.2, 0.25);
    addLine(centerX + halfWidth, -3.2, centerX + halfWidth, 3.2, 0.25);
  };

  addTargetZone(settings.zoneX, settings.zoneHalf);
  addTargetZone(settings.jumpZoneX, settings.jumpZoneHalf);

  // Glowing neon red runway edge kerbs
  const curbMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ff3326').multiplyScalar(2.2),
    toneMapped: false
  });
  mats.push(curbMat);

  const addCurb = (x0: number, x1: number, z: number) => {
    const curbGeom = new THREE.BoxGeometry(x1 - x0, 0.08, 0.1);
    geoms.push(curbGeom);
    const curb = new THREE.Mesh(curbGeom, curbMat);
    curb.position.set((x0 + x1) / 2, 0.05, z);
    group.add(curb);
  };

  addCurb(-66, -2, -9);
  addCurb(-190, -60, -9);
  addCurb(-66, -2, 9);
  addCurb(-190, -60, 9);

  return {
    group,
    dispose() {
      geoms.forEach(g => g.dispose());
      mats.forEach(m => m.dispose());
    }
  };
}

export function createObstacleCars(): { group: THREE.Group; obstacles: ObstacleVehicle[]; dispose: () => void } {
  const group = new THREE.Group();
  const geoms: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const obstacles: ObstacleVehicle[] = [];

  const glassMat = new THREE.MeshStandardMaterial({
    color: '#090a0f',
    roughness: 0.12,
    metalness: 0.6,
    envMapIntensity: 0.9,
    flatShading: true
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: '#18181b',
    roughness: 0.85,
    flatShading: true
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: '#3f3f46',
    roughness: 0.4,
    metalness: 0.7,
    flatShading: true
  });
  mats.push(glassMat, tireMat, rimMat);

  // 3D Industrial Floodlight Lamp Post towering over the Jump Mode obstacle area
  const lampPoleMat = new THREE.MeshStandardMaterial({
    color: '#27272a',
    metalness: 0.8,
    roughness: 0.35
  });
  const lampHeadMat = new THREE.MeshStandardMaterial({
    color: '#18181b',
    metalness: 0.9,
    roughness: 0.25
  });
  const lampBulbMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffffff').multiplyScalar(2.0),
    toneMapped: false
  });
  mats.push(lampPoleMat, lampHeadMat, lampBulbMat);

  const lampGroup = new THREE.Group();
  lampGroup.position.set(-118, 0, 14);

  // Vertical steel tower mast (height 26m)
  const mastGeom = new THREE.CylinderGeometry(0.18, 0.28, 26, 12);
  mastGeom.translate(0, 13, 0);
  geoms.push(mastGeom);
  lampGroup.add(new THREE.Mesh(mastGeom, lampPoleMat));

  // Overhang horizontal boom arm pointing towards track center
  const boomGeom = new THREE.BoxGeometry(0.22, 0.22, 7.5);
  boomGeom.translate(0, 25.5, -3.75);
  geoms.push(boomGeom);
  lampGroup.add(new THREE.Mesh(boomGeom, lampPoleMat));

  // Angled support brace
  const braceGeom = new THREE.BoxGeometry(0.14, 0.14, 4.5);
  braceGeom.rotateX(Math.PI / 4);
  braceGeom.translate(0, 23.5, -2.8);
  geoms.push(braceGeom);
  lampGroup.add(new THREE.Mesh(braceGeom, lampPoleMat));

  // Floodlight head fixture
  const fixtureGeom = new THREE.BoxGeometry(1.6, 0.75, 1.1);
  fixtureGeom.rotateX(0.48);
  fixtureGeom.translate(0, 25.1, -7.5);
  geoms.push(fixtureGeom);
  lampGroup.add(new THREE.Mesh(fixtureGeom, lampHeadMat));

  // Luminous floodlight lens facing the obstacles
  const lensGeom = new THREE.PlaneGeometry(1.4, 0.65);
  lensGeom.rotateX(-Math.PI / 2 + 0.48);
  lensGeom.translate(0, 24.7, -7.6);
  geoms.push(lensGeom);
  lampGroup.add(new THREE.Mesh(lensGeom, lampBulbMat));

  group.add(lampGroup);

  let currentX = -124;

  for (const cfg of OBSTACLES_CONFIG) {
    const carGroup = new THREE.Group();
    const centerX = currentX + cfg.length / 2;
    carGroup.position.x = centerX;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      roughness: 0.32,
      metalness: cfg.metal,
      flatShading: true
    });
    mats.push(bodyMat);

    // Simple 3D extruded prism for obstacle vehicle body
    const bodyShape = new THREE.Shape();
    cfg.body.forEach((pt, idx) => {
      if (idx === 0) bodyShape.moveTo(pt[0], pt[1]);
      else bodyShape.lineTo(pt[0], pt[1]);
    });
    const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, {
      depth: cfg.width - 0.08,
      bevelEnabled: false
    });
    bodyGeom.translate(0, 0, -(cfg.width - 0.08) / 2);
    geoms.push(bodyGeom);

    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    bodyMesh.castShadow = true;
    carGroup.add(bodyMesh);

    // Glass canopy
    const glassShape = new THREE.Shape();
    cfg.glass.forEach((pt, idx) => {
      if (idx === 0) glassShape.moveTo(pt[0], pt[1]);
      else glassShape.lineTo(pt[0], pt[1]);
    });
    const glassWidth = cfg.glassMode === 'canopy' ? 0.74 * cfg.width : cfg.width + 0.02;
    const glassGeom = new THREE.ExtrudeGeometry(glassShape, {
      depth: glassWidth,
      bevelEnabled: false
    });
    glassGeom.translate(0, 0, -glassWidth / 2);
    geoms.push(glassGeom);

    const glassMesh = new THREE.Mesh(glassGeom, glassMat);
    carGroup.add(glassMesh);

    // Wheels
    const tireGeom = new THREE.CylinderGeometry(cfg.wheelR, cfg.wheelR, 0.3, 16);
    tireGeom.rotateX(Math.PI / 2);
    const rimGeom = new THREE.CylinderGeometry(0.6 * cfg.wheelR, 0.6 * cfg.wheelR, 0.32, 12);
    rimGeom.rotateX(Math.PI / 2);
    geoms.push(tireGeom, rimGeom);

    for (const wx of cfg.wheels) {
      for (const side of [1, -1]) {
        const tire = new THREE.Mesh(tireGeom, tireMat);
        tire.position.set(wx, cfg.wheelR, side * (cfg.width / 2 - 0.12));
        const rim = new THREE.Mesh(rimGeom, rimMat);
        rim.position.copy(tire.position);
        carGroup.add(tire, rim);
      }
    }

    group.add(carGroup);

    obstacles.push({
      label: cfg.label,
      length: cfg.length,
      width: cfg.width,
      height: cfg.height,
      color: cfg.color,
      metal: cfg.metal,
      x0: currentX,
      x1: currentX + cfg.length,
      h: cfg.height
    });

    currentX += cfg.length + 1.6;
  }

  return {
    group,
    obstacles,
    dispose() {
      geoms.forEach(g => g.dispose());
      mats.forEach(m => m.dispose());
    }
  };
}

export function createRampMesh(path: RampPath) {
  const group = new THREE.Group();
  const width = path.shape.width;
  const halfW = width / 2;
  const startS = Math.max(0, path.curveStart - 6);
  const stepCount = Math.ceil((path.length - startS) / 0.25) + 1;
  const samples: { p: { x: number; y: number; angle: number }; s: number; nx: number; ny: number }[] = [];

  for (let i = 0; i < stepCount; i++) {
    const s = Math.min(path.length, startS + 0.25 * i);
    const pt = path.at(s);
    samples.push({
      p: pt,
      s,
      nx: -Math.sin(pt.angle),
      ny: Math.cos(pt.angle)
    });
  }

  // 1. Deck Geometry
  const deckPos: number[] = [];
  const deckNorm: number[] = [];
  const deckUV: number[] = [];
  const deckIdx: number[] = [];

  const addQuads = (evaluator: (sample: typeof samples[0], side: number) => { v: number[]; n: number[]; uv: number[] }) => {
    const baseIdx = deckPos.length / 3;
    for (const sm of samples) {
      for (const side of [0, 1]) {
        const d = evaluator(sm, side);
        deckPos.push(...d.v);
        deckNorm.push(...d.n);
        deckUV.push(...d.uv);
      }
    }
    for (let i = 0; i < samples.length - 1; i++) {
      const idx = baseIdx + 2 * i;
      deckIdx.push(idx, idx + 2, idx + 1, idx + 1, idx + 2, idx + 3);
    }
  };

  // Top surface
  addQuads((sm, side) => ({
    v: [sm.p.x, sm.p.y, side ? -halfW : halfW],
    n: [sm.nx, sm.ny, 0],
    uv: [sm.s / 4, side ? 0 : width / 4]
  }));
  // Underside
  addQuads((sm, side) => ({
    v: [sm.p.x - 0.45 * sm.nx, sm.p.y - 0.45 * sm.ny, side ? halfW : -halfW],
    n: [-sm.nx, -sm.ny, 0],
    uv: [sm.s / 4, side ? 1 : 0]
  }));

  const deckGeom = new THREE.BufferGeometry();
  deckGeom.setAttribute('position', new THREE.Float32BufferAttribute(deckPos, 3));
  deckGeom.setAttribute('normal', new THREE.Float32BufferAttribute(deckNorm, 3));
  deckGeom.setAttribute('uv', new THREE.Float32BufferAttribute(deckUV, 2));
  deckGeom.setIndex(deckIdx);

  const deckMat = new THREE.MeshStandardMaterial({
    color: '#1e1e24',
    roughness: 0.65,
    metalness: 0.4,
    side: THREE.DoubleSide
  });

  const deckMesh = new THREE.Mesh(deckGeom, deckMat);
  deckMesh.receiveShadow = true;
  group.add(deckMesh);

  // 2. Animated LED Neon Progress Strip along the ramp edges
  const ledMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#ff3326') },
      uLit: { value: new THREE.Color('#ffffff').multiplyScalar(1.5) },
      uProgress: { value: -1.0 },
      uIntensity: { value: 2.2 }
    },
    vertexShader: `
      attribute float aS;
      varying float vS;
      void main() {
        vS = aS;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uLit;
      uniform float uProgress;
      uniform float uIntensity;
      varying float vS;
      void main() {
        float lit = smoothstep(uProgress + 0.6, uProgress - 0.6, vS);
        gl_FragColor = vec4(mix(uColor, uLit, lit) * uIntensity, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    toneMapped: false
  });

  const createStrip = (zOffset: number) => {
    const pos: number[] = [];
    const aS: number[] = [];
    const idx: number[] = [];

    samples.forEach((sm, i) => {
      for (const n of [0.02, 0.16]) {
        pos.push(sm.p.x - sm.nx * n, sm.p.y - sm.ny * n, zOffset);
        aS.push(sm.s);
      }
      if (i < samples.length - 1) {
        const base = 2 * i;
        idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      }
    });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geom.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1));
    geom.setIndex(idx);
    return new THREE.Mesh(geom, ledMat);
  };

  group.add(createStrip(halfW + 0.015), createStrip(-halfW - 0.015));

  // 3. Steel Truss Scaffolding (Smooth low-contrast antialiased lines)
  const trussMat = new THREE.LineBasicMaterial({
    color: '#475569',
    transparent: true,
    opacity: 0.32
  });

  const trussPoints: number[] = [];
  const addBar = (p1: number[], p2: number[]) => {
    trussPoints.push(...p1, ...p2);
  };

  const { r1, r2 } = path.shape;
  const lateralZ = [halfW + 0.4, -halfW - 0.4];
  const xLeft = r1 + 0.9;
  const xRight = r1 + 3.6;
  const topH = path.top + 2.4;

  const heights: number[] = [];
  for (let h = 0; h < topH; h += 2.4) heights.push(h);
  heights.push(topH);

  for (const z of lateralZ) {
    for (const x of [xLeft, xRight]) addBar([x, 0, z], [x, topH, z]);
    for (let i = 0; i < heights.length; i++) {
      addBar([xLeft, heights[i], z], [xRight, heights[i], z]);
      if (i > 0) addBar([xLeft, heights[i - 1], z], [xRight, heights[i], z]);
    }
  }

  const trussGeom = new THREE.BufferGeometry();
  trussGeom.setAttribute('position', new THREE.Float32BufferAttribute(trussPoints, 3));
  const trussMesh = new THREE.LineSegments(trussGeom, trussMat);
  group.add(trussMesh);

  return {
    group,
    led: ledMat,
    dispose() {
      deckGeom.dispose();
      deckMat.dispose();
      ledMat.dispose();
      trussGeom.dispose();
      trussMat.dispose();
    }
  };
}
