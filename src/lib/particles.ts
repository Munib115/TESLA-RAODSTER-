import * as THREE from 'three';

/**
 * High-performance 2400-particle burst system for cold gas thrusters & tire smoke
 */
export class ParticleSystem {
  public points: THREE.Points;
  private geom: THREE.BufferGeometry;
  private mat: THREE.ShaderMaterial;

  private pos: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private size0: Float32Array;
  private size1: Float32Array;
  private kind: Uint8Array; // 0 = Cold gas plume, 1 = Tire friction smoke

  private sizeAttr: THREE.BufferAttribute;
  private alphaAttr: THREE.BufferAttribute;
  private tintAttr: THREE.BufferAttribute;
  private cursor: number = 0;

  public gasColor = new THREE.Color('#d6efff');
  public smokeColor = new THREE.Color('#9ca3af');

  private tmpP = new THREE.Vector3();
  private tmpV = new THREE.Vector3();

  constructor() {
    const COUNT = 2400;
    this.pos = new Float32Array(COUNT * 3);
    this.vel = new Float32Array(COUNT * 3);
    this.life = new Float32Array(COUNT);
    this.maxLife = new Float32Array(COUNT);
    this.size0 = new Float32Array(COUNT);
    this.size1 = new Float32Array(COUNT);
    this.kind = new Uint8Array(COUNT);

    const alphas = new Float32Array(COUNT);
    const sizes = new Float32Array(COUNT);
    const tints = new Float32Array(COUNT * 3);

    this.geom = new THREE.BufferGeometry();
    this.geom.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.sizeAttr = new THREE.BufferAttribute(sizes, 1);
    this.alphaAttr = new THREE.BufferAttribute(alphas, 1);
    this.tintAttr = new THREE.BufferAttribute(tints, 3);

    this.geom.setAttribute('aSize', this.sizeAttr);
    this.geom.setAttribute('aAlpha', this.alphaAttr);
    this.geom.setAttribute('aTint', this.tintAttr);

    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uScale: { value: 300.0 }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aTint;
        uniform float uScale;
        varying float vAlpha;
        varying vec3 vTint;
        void main() {
          vAlpha = aAlpha;
          vTint = aTint;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / max(0.1, -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vTint;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float r = dot(c, c) * 4.0;
          if (r > 1.0) discard;
          float a = (1.0 - r) * (1.0 - r) * vAlpha;
          gl_FragColor = vec4(vTint, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.points = new THREE.Points(this.geom, this.mat);
    this.points.frustumCulled = false;
  }

  public setScale(viewportHeight: number, fov: number) {
    this.mat.uniforms.uScale.value = viewportHeight / (2 * Math.tan((fov * Math.PI) / 360));
  }

  public emit(kind: number, p: THREE.Vector3, v: THREE.Vector3, maxL: number, s0: number, s1: number) {
    const idx = this.cursor;
    this.cursor = (this.cursor + 1) % 2400;

    this.pos[3 * idx] = p.x;
    this.pos[3 * idx + 1] = p.y;
    this.pos[3 * idx + 2] = p.z;

    this.vel[3 * idx] = v.x;
    this.vel[3 * idx + 1] = v.y;
    this.vel[3 * idx + 2] = v.z;

    this.life[idx] = 0;
    this.maxLife[idx] = maxL;
    this.size0[idx] = s0;
    this.size1[idx] = s1;
    this.kind[idx] = kind;
  }

  public emitGas(origin: THREE.Vector3, dir: THREE.Vector3, carVel: THREE.Vector3, count: number, intensity: number = 1.0) {
    for (let i = 0; i < count; i++) {
      const speed = (12 + 10 * Math.random()) * intensity;
      this.tmpV.copy(dir).multiplyScalar(speed).add(carVel);
      this.tmpV.x += (Math.random() - 0.5) * 2.5;
      this.tmpV.y += (Math.random() - 0.5) * 2.5;
      this.tmpV.z += (Math.random() - 0.5) * 2.5;

      this.tmpP.copy(origin).addScaledVector(dir, 0.2 * Math.random());
      this.emit(0, this.tmpP, this.tmpV, (0.35 + 0.35 * Math.random()) * (0.7 + 0.3 * intensity), 0.12, (0.75 + 0.65 * Math.random()) * intensity);
    }
  }

  public emitSmoke(origin: THREE.Vector3, count: number, spread: number, lift: number, scale: number = 1.0) {
    for (let i = 0; i < count; i++) {
      this.tmpV.set((Math.random() - 0.5) * spread, lift * (0.4 + Math.random()), (Math.random() - 0.5) * spread);
      this.tmpP.set(origin.x + (Math.random() - 0.5) * 0.6, origin.y + 0.2 * Math.random(), origin.z + (Math.random() - 0.5) * 0.6);
      this.emit(1, this.tmpP, this.tmpV, 1.6 + 1.8 * Math.random(), 0.5 * scale, (2.4 + 2.2 * Math.random()) * scale);
    }
  }

  public update(dt: number) {
    const sizes = this.sizeAttr.array as Float32Array;
    const alphas = this.alphaAttr.array as Float32Array;
    const tints = this.tintAttr.array as Float32Array;

    for (let i = 0; i < 2400; i++) {
      if (this.life[i] >= this.maxLife[i]) {
        alphas[i] = 0;
        sizes[i] = 0;
        continue;
      }

      this.life[i] += dt;
      const progress = Math.min(1.0, this.life[i] / this.maxLife[i]);
      const isGas = this.kind[i] === 0;
      const drag = Math.exp(-(isGas ? 4.2 : 0.9) * dt);

      this.vel[3 * i] *= drag;
      this.vel[3 * i + 1] = this.vel[3 * i + 1] * drag + (isGas ? 0.2 : 0.6) * dt;
      this.vel[3 * i + 2] *= drag;

      this.pos[3 * i] += this.vel[3 * i] * dt;
      this.pos[3 * i + 1] += this.vel[3 * i + 1] * dt;
      this.pos[3 * i + 2] += this.vel[3 * i + 2] * dt;

      // Ground bounce
      if (this.pos[3 * i + 1] < 0.25) {
        this.pos[3 * i + 1] = 0.25;
        const vy = Math.min(0, this.vel[3 * i + 1]);
        this.vel[3 * i + 1] = -0.15 * vy;
        const rad = Math.random() * Math.PI * 2;
        this.vel[3 * i] += -Math.cos(rad) * vy * 0.5;
        this.vel[3 * i + 2] += -Math.sin(rad) * vy * 0.5;
      }

      sizes[i] = this.size0[i] + (this.size1[i] - this.size0[i]) * Math.sqrt(progress);
      alphas[i] = (isGas ? 0.38 : 0.35) * Math.min(1.0, 5.0 * progress) * Math.pow(1.0 - progress, 1.4);

      const color = isGas ? this.gasColor : this.smokeColor;
      tints[3 * i] = color.r;
      tints[3 * i + 1] = color.g;
      tints[3 * i + 2] = color.b;
    }

    this.geom.attributes.position.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
    this.tintAttr.needsUpdate = true;
  }

  public clear() {
    this.life.fill(0);
    this.maxLife.fill(0);
  }

  public dispose() {
    this.geom.dispose();
    this.mat.dispose();
  }
}

/**
 * Conical Thruster Jet Plume for SpaceX cold-gas nozzles (realistic compact de Laval nozzle expansion)
 */
export class ThrusterCone {
  public mesh: THREE.Mesh;
  private static sharedGeom: THREE.CylinderGeometry | null = null;
  private mat: THREE.ShaderMaterial;
  private level: number = 0;

  constructor(position: THREE.Vector3, direction: THREE.Vector3, color: THREE.Color) {
    if (!ThrusterCone.sharedGeom) {
      ThrusterCone.sharedGeom = new THREE.CylinderGeometry(0.04, 0.16, 0.45, 16, 1, true);
      ThrusterCone.sharedGeom.translate(0, -0.225, 0);
    }

    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color },
        uLevel: { value: 0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vView;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uLevel;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vView;
        void main() {
          float along = clamp(vUv.y, 0.0, 1.0);
          float lenN = length(vN);
          float lenV = length(vView);
          vec3 nN = lenN > 0.001 ? vN / lenN : vec3(0.0, 1.0, 0.0);
          vec3 nV = lenV > 0.001 ? vView / lenV : vec3(0.0, 0.0, 1.0);
          float rim = pow(clamp(abs(dot(nN, nV)), 0.0, 1.0), 1.6);
          float tipFade = pow(1.0 - along, 1.6);
          float flicker = 0.90 + 0.10 * sin(uTime * 45.0 + vUv.x * 12.0);
          float a = clamp(tipFade * rim * uLevel * flicker * 0.45, 0.0, 0.55);
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      toneMapped: true
    });

    this.mesh = new THREE.Mesh(ThrusterCone.sharedGeom, this.mat);
    this.mesh.position.copy(position);
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction);
    this.mesh.visible = false;
  }

  public update(targetLevel: number, dt: number, time: number) {
    this.level += (targetLevel - this.level) * Math.min(1.0, dt * (targetLevel > this.level ? 25 : 12));
    const active = this.level > 0.01;
    this.mesh.visible = active;
    if (active) {
      this.mat.uniforms.uLevel.value = this.level;
      this.mat.uniforms.uTime.value = time;
      this.mesh.scale.set(
        0.7 + 0.3 * this.level,
        0.5 + 0.5 * this.level * (0.95 + 0.1 * Math.random()),
        0.7 + 0.3 * this.level
      );
    }
  }

  public dispose() {
    this.mat.dispose();
  }
}
