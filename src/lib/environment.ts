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

  // 1. Wet Asphalt Ground Plane (Visible slate terrain matching flowing.to)
  const groundGeom = new THREE.PlaneGeometry(750, 400);
  groundGeom.rotateX(-Math.PI / 2);
  geoms.push(groundGeom);

  const groundMat = new THREE.MeshStandardMaterial({
    color: '#15181f',
    roughness: 0.82,
    metalness: 0.1,
    envMapIntensity: 0.4
  });
  mats.push(groundMat);

  const groundMesh = new THREE.Mesh(groundGeom, groundMat);
  groundMesh.position.set(-80, -0.03, 0);
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // 2. Tarmac Markings Material (Visible silver-grey guide lines)
  const lineMat = new THREE.MeshBasicMaterial({
    color: '#8e98a8',
    transparent: true,
    opacity: 0.65,
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

  // Runway center axis and perspective guide lines (matching flowing.to)
  addLine(-190, 0, 24, 0, 0.16);
  addLine(-75, -28, 22, 22, 0.18);
  addLine(-75, 28, 22, -22, 0.18);
  addLine(-120, -14, 22, -14, 0.14);
  addLine(-120, 14, 22, 14, 0.14);

  // Target Landing Zones with diagonal "X" cross-hairs
  const addTargetZone = (centerX: number, halfWidth: number) => {
    const x0 = centerX - halfWidth;
    const x1 = centerX + halfWidth;
    const z0 = -3.2;
    const z1 = 3.2;
    // Outer bounding box
    addLine(x0, z0, x1, z0, 0.22);
    addLine(x0, z1, x1, z1, 0.22);
    addLine(x0, z0, x0, z1, 0.22);
    addLine(x1, z0, x1, z1, 0.22);
    // Diagonal "X" cross-lines (exact flowing.to match)
    addLine(x0, z0, x1, z1, 0.16);
    addLine(x0, z1, x1, z0, 0.16);
  };

  addTargetZone(settings.zoneX, settings.zoneHalf);
  addTargetZone(settings.jumpZoneX, settings.jumpZoneHalf);

  // Glowing neon red runway edge kerbs and white beacon lights (matching flowing.to)
  const curbMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ff3326').multiplyScalar(2.2),
    toneMapped: false
  });
  const beaconMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffffff').multiplyScalar(2.0),
    toneMapped: false
  });
  mats.push(curbMat, beaconMat);

  const beaconGeom = new THREE.SphereGeometry(0.07, 6, 4);
  geoms.push(beaconGeom);

  const addCurbAndBeacons = (x0: number, x1: number, z: number) => {
    const curbGeom = new THREE.BoxGeometry(x1 - x0, 0.08, 0.08);
    geoms.push(curbGeom);
    const curb = new THREE.Mesh(curbGeom, curbMat);
    curb.position.set((x0 + x1) / 2, 0.05, z);
    group.add(curb);

    const count = Math.floor((x1 - x0) / 2);
    if (count > 0) {
      const inst = new THREE.InstancedMesh(beaconGeom, beaconMat, count);
      const dummy = new THREE.Matrix4();
      for (let i = 0; i < count; i++) {
        dummy.makeTranslation(x0 + 1 + 2 * i, 0.35, z - 0.4 * Math.sign(z));
        inst.setMatrixAt(i, dummy);
      }
      group.add(inst);
    }
  };

  addCurbAndBeacons(-66, -2, -9);
  addCurbAndBeacons(-190, -60, -9);
  addCurbAndBeacons(-66, -2, 9);
  addCurbAndBeacons(-190, -60, 9);

  return {
    group,
    dispose() {
      geoms.forEach(g => g.dispose());
      mats.forEach(m => m.dispose());
    }
  };
}

export function createObstacleCars(): { group: THREE.Group; obstacles: ObstacleVehicle[]; start: number; end: number; dispose: () => void } {
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

  // 3D Industrial Floodlight Lamp Posts (towering 26m masts over Jump Section)
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
    color: new THREE.Color('#ffffff').multiplyScalar(2.5),
    toneMapped: false
  });
  mats.push(lampPoleMat, lampHeadMat, lampBulbMat);

  const buildLamp = (posX: number, posZ: number) => {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(posX, 0, posZ);

    const isBackside = posZ < 0;
    const dir = isBackside ? 1 : -1;

    // Vertical steel tower mast (height 26m)
    const mastGeom = new THREE.CylinderGeometry(0.18, 0.28, 26, 12);
    mastGeom.translate(0, 13, 0);
    geoms.push(mastGeom);
    lampGroup.add(new THREE.Mesh(mastGeom, lampPoleMat));

    // Overhang horizontal boom arm pointing towards track center (z = 0)
    const boomGeom = new THREE.BoxGeometry(0.22, 0.22, 7.5);
    boomGeom.translate(0, 25.5, dir * 3.75);
    geoms.push(boomGeom);
    lampGroup.add(new THREE.Mesh(boomGeom, lampPoleMat));

    // Angled support brace
    const braceGeom = new THREE.BoxGeometry(0.14, 0.14, 4.5);
    braceGeom.rotateX(dir * (Math.PI / 4));
    braceGeom.translate(0, 23.5, dir * 2.8);
    geoms.push(braceGeom);
    lampGroup.add(new THREE.Mesh(braceGeom, lampPoleMat));

    // Floodlight head fixture angled down towards runway
    const fixtureGeom = new THREE.BoxGeometry(1.6, 0.75, 1.1);
    fixtureGeom.rotateX(-dir * 0.48);
    fixtureGeom.translate(0, 25.1, dir * 7.5);
    geoms.push(fixtureGeom);
    lampGroup.add(new THREE.Mesh(fixtureGeom, lampHeadMat));

    // Luminous floodlight lens facing the runway
    const lensGeom = new THREE.PlaneGeometry(1.4, 0.65);
    lensGeom.rotateX(isBackside ? Math.PI / 2 - 0.48 : -Math.PI / 2 + 0.48);
    lensGeom.translate(0, 24.7, dir * 7.6);
    geoms.push(lensGeom);
    lampGroup.add(new THREE.Mesh(lensGeom, lampBulbMat));

    group.add(lampGroup);
  };

  // 1. Tower mast in background at Jump starting grid
  buildLamp(-174, -14);
  // 2. Tower mast in background over Jump obstacle convoy
  buildLamp(-118, -14);

  // Realistic Automotive Materials for Obstacle Vehicles (matching Roadster quality)
  const carbonMat = new THREE.MeshStandardMaterial({
    color: '#111215',
    roughness: 0.45,
    metalness: 0.7
  });
  const chassisSteelMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.5,
    metalness: 0.8
  });
  const caliperMat = new THREE.MeshStandardMaterial({
    color: '#dc2626',
    roughness: 0.35,
    metalness: 0.6
  });
  const headlightMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#e0f2fe').multiplyScalar(2.8),
    toneMapped: false
  });
  const taillightMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ff2a1f').multiplyScalar(3.2),
    toneMapped: false
  });
  const taxiSignMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#fef08a').multiplyScalar(2.2),
    toneMapped: false
  });
  mats.push(carbonMat, chassisSteelMat, caliperMat, headlightMat, taillightMat, taxiSignMat);

  // Helper: Detailed Automotive Wheel Assembly with Rubber Tire, Spoked Rim, and Brake Caliper
  const addDetailedWheel = (carGroup: THREE.Group, wx: number, wy: number, wz: number, r: number, isDual = false, isChrome = false) => {
    const tireW = isDual ? 0.42 : 0.26;
    const tireGeom = new THREE.CylinderGeometry(r, r, tireW, 20);
    tireGeom.rotateX(Math.PI / 2);
    geoms.push(tireGeom);
    const tire = new THREE.Mesh(tireGeom, tireMat);
    tire.position.set(wx, wy, wz);
    tire.castShadow = true;
    carGroup.add(tire);

    const rimR = 0.62 * r;
    const rimGeom = new THREE.CylinderGeometry(rimR, rimR, tireW + 0.02, 16);
    rimGeom.rotateX(Math.PI / 2);
    geoms.push(rimGeom);
    const rim = new THREE.Mesh(rimGeom, isChrome ? rimMat : rimMat);
    rim.position.set(wx, wy, wz);
    carGroup.add(rim);

    // Radial spokes
    const spokeGeom = new THREE.BoxGeometry(0.04, rimR * 1.8, tireW + 0.025);
    geoms.push(spokeGeom);
    for (let s = 0; s < 3; s++) {
      const spoke = new THREE.Mesh(spokeGeom, isChrome ? rimMat : rimMat);
      spoke.position.set(wx, wy, wz);
      spoke.rotation.x = (s * Math.PI) / 3;
      carGroup.add(spoke);
    }

    // Red brake caliper (visible behind front/single wheels)
    if (!isDual) {
      const caliperGeom = new THREE.BoxGeometry(rimR * 0.45, rimR * 0.5, 0.08);
      geoms.push(caliperGeom);
      const caliper = new THREE.Mesh(caliperGeom, caliperMat);
      caliper.position.set(wx - rimR * 0.35, wy + rimR * 0.35, wz - Math.sign(wz) * 0.05);
      carGroup.add(caliper);
    }
  };

  let currentX = -124;

  for (let cIdx = 0; cIdx < OBSTACLES_CONFIG.length; cIdx++) {
    const cfg = OBSTACLES_CONFIG[cIdx];
    const carGroup = new THREE.Group();
    const centerX = currentX + cfg.length / 2;
    carGroup.position.x = centerX;

    const halfW = cfg.width / 2;

    if (cfg.label === 'the Cab') {
      // 1. Tesla Cybercab / NYC Taxi (Gloss Taxi Yellow Multi-Coat)
      const paintMat = new THREE.MeshPhysicalMaterial({
        color: '#eab308',
        metalness: 0.45,
        roughness: 0.22,
        clearcoat: 0.9,
        clearcoatRoughness: 0.1
      });
      mats.push(paintMat);

      // Sculpted Aerodynamic Lower Body with Beveled Chamfers
      const bodyShape = new THREE.Shape();
      cfg.body.forEach((pt, idx) => {
        if (idx === 0) bodyShape.moveTo(pt[0], pt[1]);
        else bodyShape.lineTo(pt[0], pt[1]);
      });
      const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, {
        depth: cfg.width - 0.16,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 3
      });
      bodyGeom.translate(0, 0, -(cfg.width - 0.16) / 2);
      geoms.push(bodyGeom);
      const bodyMesh = new THREE.Mesh(bodyGeom, paintMat);
      bodyMesh.castShadow = true;
      carGroup.add(bodyMesh);

      // Front Carbon Splitter Lip
      const splitterGeom = new THREE.BoxGeometry(0.65, 0.06, cfg.width - 0.08);
      splitterGeom.translate(1.9, 0.24, 0);
      geoms.push(splitterGeom);
      carGroup.add(new THREE.Mesh(splitterGeom, carbonMat));

      // Front Matrix LED Headlights
      for (const zSide of [1, -1]) {
        const headGeom = new THREE.BoxGeometry(0.08, 0.06, 0.38);
        headGeom.translate(2.11, 0.52, zSide * (halfW - 0.32));
        geoms.push(headGeom);
        carGroup.add(new THREE.Mesh(headGeom, headlightMat));
      }

      // Panoramic Tinted Glass Canopy
      const glassShape = new THREE.Shape();
      cfg.glass.forEach((pt, idx) => {
        if (idx === 0) glassShape.moveTo(pt[0], pt[1]);
        else glassShape.lineTo(pt[0], pt[1]);
      });
      const glassWidth = 0.74 * cfg.width;
      const glassGeom = new THREE.ExtrudeGeometry(glassShape, {
        depth: glassWidth,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2
      });
      glassGeom.translate(0, 0, -glassWidth / 2);
      geoms.push(glassGeom);
      carGroup.add(new THREE.Mesh(glassGeom, glassMat));

      // Rear Full-Width Curved Red OLED Taillight
      const tailGeom = new THREE.BoxGeometry(0.06, 0.04, cfg.width - 0.22);
      tailGeom.translate(-2.12, 0.62, 0);
      geoms.push(tailGeom);
      carGroup.add(new THREE.Mesh(tailGeom, taillightMat));

      // Illuminated Roof Taxi Pod
      const podBase = new THREE.BoxGeometry(0.5, 0.04, 0.26);
      podBase.translate(-0.1, 1.43, 0);
      geoms.push(podBase);
      carGroup.add(new THREE.Mesh(podBase, carbonMat));

      const podLamp = new THREE.BoxGeometry(0.44, 0.11, 0.22);
      podLamp.translate(-0.1, 1.5, 0);
      geoms.push(podLamp);
      carGroup.add(new THREE.Mesh(podLamp, taxiSignMat));

      // 4 Detailed Sport Wheels
      for (const wx of cfg.wheels) {
        for (const side of [1, -1]) {
          addDetailedWheel(carGroup, wx, cfg.wheelR, side * (halfW - 0.12), cfg.wheelR);
        }
      }
    } else if (cfg.label === 'the Pickup') {
      // 2. Tesla Cybertruck (Cold-Rolled 30X Stainless Steel Exoskeleton)
      const stainlessMat = new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        metalness: 0.96,
        roughness: 0.22,
        envMapIntensity: 1.1
      });
      mats.push(stainlessMat);

      // Signature Angular Triangular Origami Exoskeleton
      const bodyShape = new THREE.Shape();
      cfg.body.forEach((pt, idx) => {
        if (idx === 0) bodyShape.moveTo(pt[0], pt[1]);
        else bodyShape.lineTo(pt[0], pt[1]);
      });
      const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, {
        depth: cfg.width - 0.12,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.03,
        bevelSegments: 2
      });
      bodyGeom.translate(0, 0, -(cfg.width - 0.12) / 2);
      geoms.push(bodyGeom);
      const bodyMesh = new THREE.Mesh(bodyGeom, stainlessMat);
      bodyMesh.castShadow = true;
      carGroup.add(bodyMesh);

      // Vault Bed Motorized Tonneau Cover
      const vaultGeom = new THREE.BoxGeometry(2.65, 0.06, cfg.width - 0.25);
      vaultGeom.translate(-1.3, 1.48, 0);
      geoms.push(vaultGeom);
      carGroup.add(new THREE.Mesh(vaultGeom, carbonMat));

      // Signature Full-Width Horizon Front LED Lightbar
      const horizonGeom = new THREE.BoxGeometry(0.06, 0.04, cfg.width - 0.14);
      horizonGeom.translate(2.86, 1.12, 0);
      geoms.push(horizonGeom);
      carGroup.add(new THREE.Mesh(horizonGeom, headlightMat));

      // Signature Full-Width Tailgate Red LED Lightstrip
      const tailGeom = new THREE.BoxGeometry(0.06, 0.04, cfg.width - 0.14);
      tailGeom.translate(-2.86, 1.38, 0);
      geoms.push(tailGeom);
      carGroup.add(new THREE.Mesh(tailGeom, taillightMat));

      // Rugged Lower Front Skid Plate & Bumper
      const bumperGeom = new THREE.BoxGeometry(0.48, 0.24, cfg.width - 0.1);
      bumperGeom.translate(2.7, 0.44, 0);
      geoms.push(bumperGeom);
      carGroup.add(new THREE.Mesh(bumperGeom, carbonMat));

      // Rugged Angular Wheel Arch Cladding Flares
      for (const wx of cfg.wheels) {
        for (const side of [1, -1]) {
          const flareGeom = new THREE.BoxGeometry(1.2, 0.14, 0.08);
          flareGeom.translate(wx, cfg.wheelR + 0.42, side * (halfW - 0.04));
          geoms.push(flareGeom);
          carGroup.add(new THREE.Mesh(flareGeom, carbonMat));
        }
      }

      // Angular Tinted Armor Glass
      const glassShape = new THREE.Shape();
      cfg.glass.forEach((pt, idx) => {
        if (idx === 0) glassShape.moveTo(pt[0], pt[1]);
        else glassShape.lineTo(pt[0], pt[1]);
      });
      const glassWidth = cfg.width + 0.02;
      const glassGeom = new THREE.ExtrudeGeometry(glassShape, {
        depth: glassWidth,
        bevelEnabled: false
      });
      glassGeom.translate(0, 0, -glassWidth / 2);
      geoms.push(glassGeom);
      carGroup.add(new THREE.Mesh(glassGeom, glassMat));

      // 4 Rugged All-Terrain Cybertruck Turbine Aero Wheels
      for (const wx of cfg.wheels) {
        for (const side of [1, -1]) {
          addDetailedWheel(carGroup, wx, cfg.wheelR, side * (halfW - 0.12), cfg.wheelR);
        }
      }
    } else if (cfg.label === 'the Semi Truck') {
      // 3. Tesla Semi Truck (Tesla Pure White Gloss Lacquer)
      const semiPaintMat = new THREE.MeshPhysicalMaterial({
        color: '#f8fafc',
        metalness: 0.35,
        roughness: 0.16,
        clearcoat: 0.85
      });
      mats.push(semiPaintMat);

      // Imposing Aerodynamic Cab Fuselage
      const bodyShape = new THREE.Shape();
      cfg.body.forEach((pt, idx) => {
        if (idx === 0) bodyShape.moveTo(pt[0], pt[1]);
        else bodyShape.lineTo(pt[0], pt[1]);
      });
      const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, {
        depth: cfg.width - 0.12,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 3
      });
      bodyGeom.translate(0, 0, -(cfg.width - 0.12) / 2);
      geoms.push(bodyGeom);
      const bodyMesh = new THREE.Mesh(bodyGeom, semiPaintMat);
      bodyMesh.castShadow = true;
      carGroup.add(bodyMesh);

      // Panoramic Cockpit Wrap-Around Windshield
      const glassShape = new THREE.Shape();
      cfg.glass.forEach((pt, idx) => {
        if (idx === 0) glassShape.moveTo(pt[0], pt[1]);
        else glassShape.lineTo(pt[0], pt[1]);
      });
      const glassWidth = cfg.width + 0.02;
      const glassGeom = new THREE.ExtrudeGeometry(glassShape, {
        depth: glassWidth,
        bevelEnabled: false
      });
      glassGeom.translate(0, 0, -glassWidth / 2);
      geoms.push(glassGeom);
      carGroup.add(new THREE.Mesh(glassGeom, glassMat));

      // Signature Vertical LED Blade Headlights (Left & Right)
      for (const zSide of [1, -1]) {
        const bladeGeom = new THREE.BoxGeometry(0.06, 0.58, 0.08);
        bladeGeom.translate(3.61, 0.95, zSide * (halfW - 0.22));
        geoms.push(bladeGeom);
        carGroup.add(new THREE.Mesh(bladeGeom, headlightMat));
      }

      // Aerodynamic Front Lower Splitter Bumper
      const bumperGeom = new THREE.BoxGeometry(0.55, 0.22, cfg.width - 0.06);
      bumperGeom.translate(3.4, 0.45, 0);
      geoms.push(bumperGeom);
      carGroup.add(new THREE.Mesh(bumperGeom, carbonMat));

      // Aerodynamic Side Skirts Covering Chassis Battery Packs
      for (const zSide of [1, -1]) {
        const skirtGeom = new THREE.BoxGeometry(3.8, 0.52, 0.1);
        skirtGeom.translate(0.5, 0.65, zSide * (halfW - 0.08));
        geoms.push(skirtGeom);
        carGroup.add(new THREE.Mesh(skirtGeom, carbonMat));
      }

      // Exposed Rear Chassis Rails
      for (const zSide of [1, -1]) {
        const railGeom = new THREE.BoxGeometry(3.6, 0.24, 0.14);
        railGeom.translate(-1.8, 0.82, zSide * 0.48);
        geoms.push(railGeom);
        carGroup.add(new THREE.Mesh(railGeom, chassisSteelMat));
      }

      // Fifth-Wheel Heavy-Duty Trailer Coupler Hitch Plate
      const hitchGeom = new THREE.CylinderGeometry(0.48, 0.48, 0.08, 16);
      hitchGeom.rotateZ(0.08);
      hitchGeom.translate(-1.8, 0.96, 0);
      geoms.push(hitchGeom);
      carGroup.add(new THREE.Mesh(hitchGeom, carbonMat));

      // Rear Mudflaps & Dual Red Tail Light Clusters
      for (const zSide of [1, -1]) {
        const mudGeom = new THREE.BoxGeometry(0.06, 0.48, 0.38);
        mudGeom.translate(-3.61, 0.65, zSide * (halfW - 0.25));
        geoms.push(mudGeom);
        carGroup.add(new THREE.Mesh(mudGeom, carbonMat));

        const tailCluster = new THREE.BoxGeometry(0.04, 0.08, 0.22);
        tailCluster.translate(-3.63, 0.75, zSide * (halfW - 0.25));
        geoms.push(tailCluster);
        carGroup.add(new THREE.Mesh(tailCluster, taillightMat));
      }

      // 3 Commercial Axles (Front Steer Axle + Dual Rear Tandem Axles = 10 Wheels)
      for (const side of [1, -1]) {
        // Front Steer (Single wheel, chrome hub)
        addDetailedWheel(carGroup, 2.6, cfg.wheelR, side * (halfW - 0.12), cfg.wheelR, false, true);
        // Rear Tandem 1 (Dual wheel)
        addDetailedWheel(carGroup, -1.7, cfg.wheelR, side * (halfW - 0.22), cfg.wheelR, true, true);
        // Rear Tandem 2 (Dual wheel)
        addDetailedWheel(carGroup, -2.95, cfg.wheelR, side * (halfW - 0.22), cfg.wheelR, true, true);
      }
    } else if (cfg.label === 'the SUV') {
      // 4. Tesla Model SUV (Midnight Charcoal Metallic Lacquer)
      const suvPaintMat = new THREE.MeshPhysicalMaterial({
        color: '#1e293b',
        metalness: 0.85,
        roughness: 0.22,
        clearcoat: 0.9
      });
      mats.push(suvPaintMat);

      // Sculpted Muscular Crossover Body
      const bodyShape = new THREE.Shape();
      cfg.body.forEach((pt, idx) => {
        if (idx === 0) bodyShape.moveTo(pt[0], pt[1]);
        else bodyShape.lineTo(pt[0], pt[1]);
      });
      const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, {
        depth: cfg.width - 0.14,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 3
      });
      bodyGeom.translate(0, 0, -(cfg.width - 0.14) / 2);
      geoms.push(bodyGeom);
      const bodyMesh = new THREE.Mesh(bodyGeom, suvPaintMat);
      bodyMesh.castShadow = true;
      carGroup.add(bodyMesh);

      // Panoramic All-Glass Bubble Roof Canopy
      const glassShape = new THREE.Shape();
      cfg.glass.forEach((pt, idx) => {
        if (idx === 0) glassShape.moveTo(pt[0], pt[1]);
        else glassShape.lineTo(pt[0], pt[1]);
      });
      const glassWidth = 0.74 * cfg.width;
      const glassGeom = new THREE.ExtrudeGeometry(glassShape, {
        depth: glassWidth,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2
      });
      glassGeom.translate(0, 0, -glassWidth / 2);
      geoms.push(glassGeom);
      carGroup.add(new THREE.Mesh(glassGeom, glassMat));

      // Front Twin LED Projector Headlights
      for (const zSide of [1, -1]) {
        const headGeom = new THREE.BoxGeometry(0.08, 0.06, 0.38);
        headGeom.translate(2.38, 0.62, zSide * (halfW - 0.32));
        geoms.push(headGeom);
        carGroup.add(new THREE.Mesh(headGeom, headlightMat));
      }

      // Rear Wrap-Around LED Taillight Blade
      const tailGeom = new THREE.BoxGeometry(0.06, 0.04, cfg.width - 0.22);
      tailGeom.translate(-2.38, 0.78, 0);
      geoms.push(tailGeom);
      carGroup.add(new THREE.Mesh(tailGeom, taillightMat));

      // Lower Rocker Panel & Protective Fender Trim
      const sillGeom = new THREE.BoxGeometry(2.8, 0.06, cfg.width - 0.08);
      sillGeom.translate(0, 0.28, 0);
      geoms.push(sillGeom);
      carGroup.add(new THREE.Mesh(sillGeom, carbonMat));

      // 4 Large 20-inch Performance Alloy Wheels
      for (const wx of cfg.wheels) {
        for (const side of [1, -1]) {
          addDetailedWheel(carGroup, wx, cfg.wheelR, side * (halfW - 0.12), cfg.wheelR);
        }
      }
    } else {
      // 5. Tesla Model Sedan / Performance Coupe (Deep Crimson Metallic Multi-Coat)
      const sedanPaintMat = new THREE.MeshPhysicalMaterial({
        color: '#b91c1c',
        metalness: 0.88,
        roughness: 0.18,
        clearcoat: 0.95,
        clearcoatRoughness: 0.08
      });
      mats.push(sedanPaintMat);

      // Low-Slung Aerodynamic Sports Sedan Profile
      const bodyShape = new THREE.Shape();
      cfg.body.forEach((pt, idx) => {
        if (idx === 0) bodyShape.moveTo(pt[0], pt[1]);
        else bodyShape.lineTo(pt[0], pt[1]);
      });
      const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, {
        depth: cfg.width - 0.14,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 3
      });
      bodyGeom.translate(0, 0, -(cfg.width - 0.14) / 2);
      geoms.push(bodyGeom);
      const bodyMesh = new THREE.Mesh(bodyGeom, sedanPaintMat);
      bodyMesh.castShadow = true;
      carGroup.add(bodyMesh);

      // Carbon Fiber Front Splitter Lip
      const splitterGeom = new THREE.BoxGeometry(0.65, 0.05, cfg.width - 0.08);
      splitterGeom.translate(2.18, 0.24, 0);
      geoms.push(splitterGeom);
      carGroup.add(new THREE.Mesh(splitterGeom, carbonMat));

      // Front Slim Matrix LED Headlights
      for (const zSide of [1, -1]) {
        const headGeom = new THREE.BoxGeometry(0.08, 0.05, 0.36);
        headGeom.translate(2.36, 0.58, zSide * (halfW - 0.32));
        geoms.push(headGeom);
        carGroup.add(new THREE.Mesh(headGeom, headlightMat));
      }

      // Panoramic Teardrop Tinted Glass Canopy
      const glassShape = new THREE.Shape();
      cfg.glass.forEach((pt, idx) => {
        if (idx === 0) glassShape.moveTo(pt[0], pt[1]);
        else glassShape.lineTo(pt[0], pt[1]);
      });
      const glassWidth = 0.74 * cfg.width;
      const glassGeom = new THREE.ExtrudeGeometry(glassShape, {
        depth: glassWidth,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2
      });
      glassGeom.translate(0, 0, -glassWidth / 2);
      geoms.push(glassGeom);
      carGroup.add(new THREE.Mesh(glassGeom, glassMat));

      // Rear Ducktail Aerodynamic Spoiler Lip
      const spoilerGeom = new THREE.BoxGeometry(0.35, 0.04, cfg.width - 0.25);
      spoilerGeom.translate(-2.2, 0.92, 0);
      geoms.push(spoilerGeom);
      carGroup.add(new THREE.Mesh(spoilerGeom, carbonMat));

      // Rear Full-Width Curved OLED Taillight
      const tailGeom = new THREE.BoxGeometry(0.06, 0.04, cfg.width - 0.2);
      tailGeom.translate(-2.36, 0.72, 0);
      geoms.push(tailGeom);
      carGroup.add(new THREE.Mesh(tailGeom, taillightMat));

      // 4 High-Performance Sport Alloy Turbine Wheels
      for (const wx of cfg.wheels) {
        for (const side of [1, -1]) {
          addDetailedWheel(carGroup, wx, cfg.wheelR, side * (halfW - 0.12), cfg.wheelR);
        }
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
    start: -124,
    end: currentX - 1.6,
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
    color: '#6e7582', // Crisp visible concrete road surface matching flowing.to
    roughness: 0.72,
    metalness: 0.15,
    side: THREE.DoubleSide
  });

  const deckMesh = new THREE.Mesh(deckGeom, deckMat);
  deckMesh.receiveShadow = true;
  group.add(deckMesh);

  // Center road line on ramp deck (matching flowing.to)
  const clGeom = new THREE.BufferGeometry();
  const clPos: number[] = [];
  const clIdx: number[] = [];
  const clW = 0.08;
  samples.forEach((sm, i) => {
    clPos.push(sm.p.x - sm.nx * 0.003, sm.p.y + sm.ny * 0.003, -clW);
    clPos.push(sm.p.x - sm.nx * 0.003, sm.p.y + sm.ny * 0.003, clW);
    if (i < samples.length - 1) {
      const base = 2 * i;
      clIdx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  });
  clGeom.setAttribute('position', new THREE.Float32BufferAttribute(clPos, 3));
  clGeom.setIndex(clIdx);
  const clMat = new THREE.MeshBasicMaterial({
    color: '#b0b8c6',
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide
  });
  const clMesh = new THREE.Mesh(clGeom, clMat);
  group.add(clMesh);

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

  // 3. Steel Truss Scaffolding (Full 3D structural lattice tower matching flowing.to)
  const trussMat = new THREE.LineBasicMaterial({
    color: '#64748b',
    transparent: true,
    opacity: 0.52
  });

  const trussPoints: number[] = [];
  const addBar = (p1: number[], p2: number[]) => {
    trussPoints.push(...p1, ...p2);
  };

  const { r1 } = path.shape;
  const lateralZ = [halfW + 0.4, -halfW - 0.4];
  const xCols = [r1 - 2.5, r1 + 0.9, r1 + 3.6];
  const topH = path.top + 2.4;

  const heights: number[] = [];
  for (let h = 0; h < topH; h += 2.4) heights.push(h);
  heights.push(topH);

  // Vertical columns at all lattice corner posts
  for (const z of lateralZ) {
    for (const x of xCols) {
      addBar([x, 0, z], [x, topH, z]);
    }
  }

  // Horizontal longitudinal beams & lateral X-braces
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i];
    const prevH = i > 0 ? heights[i - 1] : 0;

    for (const z of lateralZ) {
      for (let j = 0; j < xCols.length - 1; j++) {
        const xA = xCols[j];
        const xB = xCols[j + 1];
        // Horizontal bar
        addBar([xA, h, z], [xB, h, z]);
        // Diagonal cross-brace in each square bay
        if (i > 0) {
          addBar([xA, prevH, z], [xB, h, z]);
          addBar([xA, h, z], [xB, prevH, z]);
        }
      }
    }

    // Transverse cross-beams connecting front (+Z) and back (-Z) sides
    for (const x of xCols) {
      addBar([x, h, lateralZ[0]], [x, h, lateralZ[1]]);
    }

    // Back-face diagonal cross-braces
    if (i > 0) {
      const xBack = xCols[xCols.length - 1];
      addBar([xBack, prevH, lateralZ[0]], [xBack, h, lateralZ[1]]);
      addBar([xBack, h, lateralZ[0]], [xBack, prevH, lateralZ[1]]);
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
      clGeom.dispose();
      clMat.dispose();
      ledMat.dispose();
      trussGeom.dispose();
      trussMat.dispose();
    }
  };
}
