import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { ThrusterCone } from './particles';

export interface RoadsterCar {
  group: THREE.Group;
  bodyMesh: THREE.Mesh | THREE.Group;
  wheels: THREE.Mesh[];
  liftCones: ThrusterCone[];
  boostCone: ThrusterCone;
  reverseCone?: ThrusterCone;
  brakeLight: THREE.Mesh;
  headlight: THREE.Mesh;
  headlightsLight?: THREE.SpotLight;
  taillightLight?: THREE.PointLight;
  thrusterLight?: THREE.PointLight;
  setPaintColor: (colorHex: string) => void;
  updateThrusters: (lifting: boolean, boosting: boolean, dt: number, time: number, reversing?: boolean) => void;
  updateWheelRotation: (rot: number) => void;
  setBraking?: (braking: boolean) => void;
  dispose: () => void;
}

export function createProceduralTeslaRoadster(bodyColorHex: string = '#c00f1c'): RoadsterCar {
  const group = new THREE.Group();
  const geoms: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  // 1. High-End Automotive Metallic Paint Material
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(bodyColorHex),
    metalness: 0.85,
    roughness: 0.22,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    reflectivity: 0.8
  });
  mats.push(bodyMaterial);

  // Carbon Fiber trim material
  const carbonMaterial = new THREE.MeshStandardMaterial({
    color: '#18181b',
    roughness: 0.4,
    metalness: 0.8
  });
  mats.push(carbonMaterial);

  // Dark Bronze Tinted Panoramic Glass Roof
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: '#090a0f',
    metalness: 0.2,
    roughness: 0.08,
    transmission: 0.75,
    ior: 1.52,
    transparent: true,
    opacity: 0.92
  });
  mats.push(glassMaterial);

  // Glowing Headlights
  const headlightMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#e0f2fe').multiplyScalar(2.5),
    toneMapped: false
  });
  mats.push(headlightMaterial);

  // Signature Rear Curved OLED Taillight
  const taillightMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ff2a1f').multiplyScalar(3.0),
    toneMapped: false
  });
  mats.push(taillightMaterial);

  // Sport Wheel Materials
  const tireMaterial = new THREE.MeshStandardMaterial({
    color: '#18181b',
    roughness: 0.85
  });
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: '#27272a',
    metalness: 0.9,
    roughness: 0.25
  });
  const caliperMaterial = new THREE.MeshStandardMaterial({
    color: '#dc2626',
    metalness: 0.5,
    roughness: 0.3
  });
  mats.push(tireMaterial, rimMaterial, caliperMaterial);

  // --- CAR CHASSIS GEOMETRY ---
  const carRoot = new THREE.Group();
  carRoot.position.y = 0.6; // Anchor center of mass above ground

  // Lower Main Fuselage (Aggressive wedge body)
  const lowerBodyGeom = new THREE.BoxGeometry(4.4, 0.45, 1.95);
  geoms.push(lowerBodyGeom);
  const lowerBody = new THREE.Mesh(lowerBodyGeom, bodyMaterial);
  lowerBody.position.set(0, -0.15, 0);
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  carRoot.add(lowerBody);

  // Slanted Aerodynamic Nose Wedge
  const noseShape = new THREE.Shape();
  noseShape.moveTo(-2.2, -0.35);
  noseShape.lineTo(-1.2, 0.05);
  noseShape.lineTo(-1.2, -0.35);
  noseShape.closePath();
  const noseGeom = new THREE.ExtrudeGeometry(noseShape, { depth: 1.9, bevelEnabled: false });
  noseGeom.translate(0, 0, -0.95);
  geoms.push(noseGeom);
  const noseMesh = new THREE.Mesh(noseGeom, bodyMaterial);
  noseMesh.castShadow = true;
  carRoot.add(noseMesh);

  // Front Carbon Fiber Splitter
  const splitterGeom = new THREE.BoxGeometry(0.8, 0.06, 1.98);
  geoms.push(splitterGeom);
  const splitter = new THREE.Mesh(splitterGeom, carbonMaterial);
  splitter.position.set(-2.0, -0.35, 0);
  carRoot.add(splitter);

  // Front Matrix LED Lightstrip
  const headlightGeom = new THREE.BoxGeometry(0.12, 0.04, 1.6);
  geoms.push(headlightGeom);
  const headlight = new THREE.Mesh(headlightGeom, headlightMaterial);
  headlight.position.set(-2.21, -0.12, 0);
  carRoot.add(headlight);

  // Rear Continuous Curved OLED Tail Lightblade
  const taillightGeom = new THREE.BoxGeometry(0.08, 0.04, 1.7);
  geoms.push(taillightGeom);
  const taillight = new THREE.Mesh(taillightGeom, taillightMaterial);
  taillight.position.set(2.21, 0.04, 0);
  carRoot.add(taillight);

  // Rear Carbon Diffuser with SpaceX Rocket Nozzles
  const diffuserGeom = new THREE.BoxGeometry(0.6, 0.22, 1.8);
  geoms.push(diffuserGeom);
  const diffuser = new THREE.Mesh(diffuserGeom, carbonMaterial);
  diffuser.position.set(2.0, -0.26, 0);
  carRoot.add(diffuser);

  // Rear Active Aero Spoiler
  const wingGeom = new THREE.BoxGeometry(0.5, 0.05, 1.75);
  geoms.push(wingGeom);
  const wing = new THREE.Mesh(wingGeom, carbonMaterial);
  wing.position.set(1.95, 0.16, 0);
  wing.rotation.z = -0.1;
  carRoot.add(wing);

  // Glass Canopy Cabin (Flowing teardrop coupe roof)
  const cabinShape = new THREE.Shape();
  cabinShape.moveTo(-1.2, 0.05);
  cabinShape.lineTo(-0.4, 0.52);
  cabinShape.lineTo(0.9, 0.48);
  cabinShape.lineTo(1.8, 0.05);
  cabinShape.closePath();
  const cabinGeom = new THREE.ExtrudeGeometry(cabinShape, { depth: 1.45, bevelEnabled: false });
  cabinGeom.translate(0, 0, -0.725);
  geoms.push(cabinGeom);
  const cabinMesh = new THREE.Mesh(cabinGeom, glassMaterial);
  cabinMesh.castShadow = true;
  carRoot.add(cabinMesh);

  // Muscular Rear Quarter-Panel Hips
  for (const side of [1, -1]) {
    const hipGeom = new THREE.BoxGeometry(1.6, 0.42, 0.22);
    geoms.push(hipGeom);
    const hip = new THREE.Mesh(hipGeom, bodyMaterial);
    hip.position.set(0.9, 0.05, side * 0.95);
    carRoot.add(hip);
  }

  // --- 4 SPORT ALLOY WHEELS ---
  const wheels: THREE.Mesh[] = [];
  const wheelRadius = 0.38;
  const wheelGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.28, 20);
  wheelGeom.rotateX(Math.PI / 2);
  const rimGeom = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, 0.29, 12);
  rimGeom.rotateX(Math.PI / 2);
  geoms.push(wheelGeom, rimGeom);

  const wheelPositions = [
    [-1.38, -0.22, 0.92],  // Front Left
    [-1.38, -0.22, -0.92], // Front Right
    [1.38, -0.22, 0.92],   // Rear Left
    [1.38, -0.22, -0.92]   // Rear Right
  ];

  for (const pos of wheelPositions) {
    const wheelGroup = new THREE.Mesh(wheelGeom, tireMaterial);
    wheelGroup.position.set(pos[0], pos[1], pos[2]);
    wheelGroup.castShadow = true;

    const rim = new THREE.Mesh(rimGeom, rimMaterial);
    wheelGroup.add(rim);

    // Red brake caliper
    const caliperGeom = new THREE.BoxGeometry(0.12, 0.16, 0.1);
    geoms.push(caliperGeom);
    const caliper = new THREE.Mesh(caliperGeom, caliperMaterial);
    caliper.position.set(0, wheelRadius * 0.4, 0);
    wheelGroup.add(caliper);

    carRoot.add(wheelGroup);
    wheels.push(wheelGroup);
  }

  // --- SPACEX THRUSTERS ---
  const thrusterColor = new THREE.Color('#d6efff');

  // Tail Boost Thruster (Mounted behind rear license plate)
  const boostCone = new ThrusterCone(new THREE.Vector3(2.35, -0.2, 0), new THREE.Vector3(1, 0, 0), thrusterColor);
  carRoot.add(boostCone.mesh);

  // 4 Floor Lift Thrusters (Pointing directly downwards beneath chassis floor)
  const liftCones: ThrusterCone[] = [];
  const liftPositions = [
    [1.2, -0.4, 0.55],
    [1.2, -0.4, -0.55],
    [-1.2, -0.4, 0.55],
    [-1.2, -0.4, -0.55]
  ];
  for (const lp of liftPositions) {
    const cone = new ThrusterCone(new THREE.Vector3(lp[0], lp[1], lp[2]), new THREE.Vector3(0, -1, 0), thrusterColor);
    carRoot.add(cone.mesh);
    liftCones.push(cone);
  }

  // --- DYNAMIC CAR LIGHTS ---
  // Forward Matrix LED Projector Spotlight
  const headlightsLight = new THREE.SpotLight('#f8fafc', 26, 60, 0.5, 0.6, 1.2);
  headlightsLight.position.set(-2.2, -0.05, 0);
  const headTarget = new THREE.Object3D();
  headTarget.position.set(-16, -0.8, 0);
  carRoot.add(headlightsLight, headTarget);
  headlightsLight.target = headTarget;

  // Rear OLED Taillight Glow
  const taillightLight = new THREE.PointLight('#ff2211', 2.0, 12, 1.6);
  taillightLight.position.set(2.3, 0.05, 0);
  carRoot.add(taillightLight);

  // SpaceX Cold-Gas Thruster Pulse Light
  const thrusterLight = new THREE.PointLight('#38bdf8', 0, 16, 1.8);
  thrusterLight.position.set(0, -0.4, 0);
  carRoot.add(thrusterLight);

  group.add(carRoot);

  return {
    group,
    bodyMesh: carRoot,
    wheels,
    liftCones,
    boostCone,
    brakeLight: taillight,
    headlight,
    headlightsLight,
    taillightLight,
    thrusterLight,
    setPaintColor(colorHex: string) {
      bodyMaterial.color.set(colorHex);
    },
    updateThrusters(lifting: boolean, boosting: boolean, dt: number, time: number, reversing: boolean = false) {
      boostCone.update(boosting ? 1.0 : 0.0, dt, time);
      liftCones.forEach(cone => cone.update(lifting ? 1.0 : 0.0, dt, time));
      const targetIntensity = (lifting ? 7.0 : 0) + (boosting ? 9.0 : 0) + (reversing ? 9.0 : 0);
      thrusterLight.intensity = THREE.MathUtils.lerp(thrusterLight.intensity, targetIntensity, 0.3);
    },
    updateWheelRotation(rot: number) {
      wheels.forEach(w => {
        w.rotation.z = rot;
      });
    },
    setBraking(braking: boolean) {
      if (braking) {
        taillightMaterial.color.set('#ff0000').multiplyScalar(5.5);
        taillightLight.intensity = 6.5;
      } else {
        taillightMaterial.color.set('#ff2a1f').multiplyScalar(2.8);
        taillightLight.intensity = 2.0;
      }
    },
    dispose() {
      geoms.forEach(g => g.dispose());
      mats.forEach(m => m.dispose());
      boostCone.dispose();
      liftCones.forEach(c => c.dispose());
    }
  };
}

export function loadGlbRoadster(
  url: string,
  dracoPath: string,
  onLoaded: (car: RoadsterCar) => void,
  onFallback: () => void,
  initialColor: string = '#c00f1c'
) {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(dracoPath);
  loader.setDRACOLoader(draco);

  loader.load(
    url,
    gltf => {
      draco.dispose();
      const scene = gltf.scene;
      scene.rotation.y = -Math.PI / 2;
      scene.position.y = -0.6;

      const materialMap: Record<string, string> = {
        Body_Color: 'body',
        Glass_Gray: 'glass',
        Projector_Glass: 'body',
        Taillight_Glass: 'dark',
        Turn_Signal_LED: 'body',
        Tires: 'tyre',
        metal_gray: 'rim',
        metal_chrome: 'chrome',
        plastic_gray: 'dark',
        Carbon_Fiber: 'dark',
        Interior_dark: 'dark',
        Interior_light: 'dark',
        Leather: 'dark',
        Leather_red: 'dark',
        Carpet: 'dark',
        Ferrari_Yellow: 'body',
        _0098_DodgerBlue: 'body'
      };

      const bodyMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(initialColor),
        roughness: 0.38,
        metalness: 0.1,
        clearcoat: 0.5,
        clearcoatRoughness: 0.25,
        specularIntensity: 0.45,
        envMapIntensity: 0.95
      });
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: '#33251a',
        roughness: 0.28,
        metalness: 0.05,
        envMapIntensity: 0.8,
        specularIntensity: 0.25,
        side: THREE.DoubleSide
      });
      const darkMat = new THREE.MeshStandardMaterial({ color: '#121214', roughness: 0.6, metalness: 0.2 });
      const rimMat = new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: 0.5, metalness: 0.7 });
      const chromeMat = new THREE.MeshStandardMaterial({ color: '#5e6166', roughness: 0.5, metalness: 0.8 });
      const tyreMat = new THREE.MeshStandardMaterial({ color: '#0c0c0d', roughness: 0.9 });
      const redMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2a1f').multiplyScalar(2), toneMapped: false });
      const whiteMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff'), toneMapped: false });

      const p: Record<string, THREE.Material> = {
        body: bodyMat,
        glass: glassMat,
        dark: darkMat,
        rim: rimMat,
        tyre: tyreMat,
        chrome: chromeMat,
        red: redMat,
        white: whiteMat
      };

      const wheels: THREE.Mesh[] = [];

      scene.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          const matName = mats[0]?.name ?? '';
          const key = materialMap[matName] ?? 'dark';
          mesh.material = p[key];
          mesh.castShadow = key === 'body';
          mesh.receiveShadow = true;
        }
      });

      for (const wName of ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']) {
        const w = scene.getObjectByName(wName);
        if (w && (w as THREE.Mesh).isMesh) {
          wheels.push(w as THREE.Mesh);
        }
      }

      const root = new THREE.Group();
      root.add(scene);

      const thrusterColor = new THREE.Color('#d6efff');

      // 1. Single Rear SpaceX Rocket Booster (behind license plate, pointing backward -X)
      const boostCone = new ThrusterCone(new THREE.Vector3(-2.24, 0.35, 0), new THREE.Vector3(-1, 0, 0), thrusterColor);
      root.add(boostCone.mesh);

      // 2. Front Nose Reverse / Airbrake Rocket Booster (pointing forward +X)
      const reverseCone = new ThrusterCone(new THREE.Vector3(2.15, 0.32, 0), new THREE.Vector3(1, 0, 0), thrusterColor);
      root.add(reverseCone.mesh);

      // 3. Underfloor SpaceX Cold Gas Lift Thrusters
      const liftCones: ThrusterCone[] = [
        new ThrusterCone(new THREE.Vector3(1.2, 0.16, 0.55), new THREE.Vector3(0, -1, 0), thrusterColor),
        new ThrusterCone(new THREE.Vector3(1.2, 0.16, -0.55), new THREE.Vector3(0, -1, 0), thrusterColor),
        new ThrusterCone(new THREE.Vector3(-1.2, 0.16, 0.55), new THREE.Vector3(0, -1, 0), thrusterColor),
        new ThrusterCone(new THREE.Vector3(-1.2, 0.16, -0.55), new THREE.Vector3(0, -1, 0), thrusterColor)
      ];
      liftCones.forEach(c => root.add(c.mesh));

      const brakeLightMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.026, 1.34), redMat);
      brakeLightMesh.position.set(-2.21, 0.4, 0);
      brakeLightMesh.visible = false;
      root.add(brakeLightMesh);

      const dummyLight = new THREE.Mesh();

      onLoaded({
        group: root,
        bodyMesh: scene,
        wheels,
        liftCones,
        boostCone,
        reverseCone,
        brakeLight: brakeLightMesh,
        headlight: dummyLight,
        setPaintColor(colorHex: string) {
          bodyMat.color.set(colorHex);
          bodyMat.needsUpdate = true;
        },
        updateThrusters(lifting: boolean, boosting: boolean, dt: number, time: number, reversing: boolean = false) {
          boostCone.update(boosting ? 1.0 : 0.0, dt, time);
          reverseCone.update(reversing ? 1.0 : 0.0, dt, time);
          liftCones.forEach(cone => cone.update(lifting ? 1.0 : 0.0, dt, time));
        },
        updateWheelRotation(rot: number) {
          wheels.forEach(w => {
            w.rotation.x = rot;
          });
        },
        setBraking(braking: boolean) {
          brakeLightMesh.visible = braking;
        },
        dispose() {
          boostCone.dispose();
          reverseCone.dispose();
          liftCones.forEach(c => c.dispose());
        }
      });
    },
    undefined,
    err => {
      console.warn('Could not load external GLB model, using procedural Tesla Roadster:', err);
      draco.dispose();
      onFallback();
    }
  );
}
