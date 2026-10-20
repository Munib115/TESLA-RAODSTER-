import { GameSettings, ChallengeType, ObstacleVehicle, StuntResult, ScoreLine } from './types';

export const SUB_STEP = 1 / 120; // 120Hz fixed physics sub-stepping
const MOMENT_OF_INERTIA = (4.4 * 4.4 + 1.44) / 12;

// 8 Collision Probe points relative to car center [x, y, isWheel]
export const COLLISION_PROBES: [number, number, boolean][] = [
  [1.38, -0.60, true],   // Rear wheel contact
  [-1.38, -0.60, true],  // Front wheel contact
  [2.33, -0.18, false],  // Rear bumper / tail diffuser
  [-2.25, 0.00, false],  // Front nose
  [2.15, -0.30, false],  // Rear deck underside
  [-2.15, -0.30, false], // Front splitter underside
  [-0.30, 0.60, false],  // Roof top front
  [-1.60, 0.42, false]   // Roof top rear
];

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export interface PathSample {
  kind: 'line' | 'arc';
  s0: number;
  len: number;
  x?: number;
  y?: number;
  a?: number;
  cx?: number;
  cy?: number;
  r?: number;
  a0?: number;
  sweep?: number;
}

export interface PathPoint {
  x: number;
  y: number;
  angle: number;
  k: number; // Curvature = 1 / r
}

export class RampPath {
  public segments: PathSample[] = [];
  public length: number = 0;
  public curveStart: number = 0;
  public top: number = 0;
  public shape: {
    runIn: number;
    r1: number;
    wall: number;
    r2: number;
    sweep: number;
    lip: number;
    width: number;
  };

  constructor(shape: { runIn: number; r1: number; wall: number; r2: number; sweep: number; lip: number; width: number }) {
    this.shape = shape;
    const { runIn, r1, wall, r2, lip } = shape;
    const sweepRad = (shape.sweep * Math.PI) / 180;
    let s = 0;

    const addSeg = (seg: PathSample) => {
      this.segments.push(seg);
      s += seg.len;
    };

    // 1. Straight run-in runway
    addSeg({ kind: 'line', s0: s, len: runIn, x: -runIn, y: 0, a: 0 });
    this.curveStart = s;

    // 2. First upward transition arc
    addSeg({ kind: 'arc', s0: s, len: (r1 * Math.PI) / 2, cx: 0, cy: r1, r: r1, a0: -Math.PI / 2, sweep: Math.PI / 2 });

    // 3. Vertical straight wall
    addSeg({ kind: 'line', s0: s, len: wall, x: r1, y: r1, a: Math.PI / 2 });

    // 4. Inverted return arc
    addSeg({ kind: 'arc', s0: s, len: r2 * sweepRad, cx: r1 - r2, cy: r1 + wall, r: r2, a0: 0, sweep: sweepRad });

    // 5. Exit lip tangent
    const lastSeg = this.segments[this.segments.length - 1];
    const u = this.evalSegment(lastSeg, s);
    addSeg({ kind: 'line', s0: s, len: lip, x: u.x, y: u.y, a: u.angle });

    this.length = s;
    this.top = r1 + wall + r2 * Math.sin(sweepRad);
  }

  public evalSegment(seg: PathSample, dist: number): PathPoint {
    const sRel = Math.max(0, Math.min(seg.len, dist - seg.s0));
    if (seg.kind === 'line') {
      return {
        x: (seg.x ?? 0) + Math.cos(seg.a ?? 0) * sRel,
        y: (seg.y ?? 0) + Math.sin(seg.a ?? 0) * sRel,
        angle: seg.a ?? 0,
        k: 0
      };
    }
    const theta = (seg.a0 ?? 0) + sRel / (seg.r ?? 1);
    return {
      x: (seg.cx ?? 0) + Math.cos(theta) * (seg.r ?? 1),
      y: (seg.cy ?? 0) + Math.sin(theta) * (seg.r ?? 1),
      angle: theta + Math.PI / 2,
      k: 1 / (seg.r ?? 1)
    };
  }

  public at(dist: number): PathPoint {
    const t = Math.max(0, Math.min(this.length, dist));
    for (const seg of this.segments) {
      if (t <= seg.s0 + seg.len) {
        return this.evalSegment(seg, t);
      }
    }
    return this.evalSegment(this.segments[this.segments.length - 1], t);
  }

  public nearest(px: number, py: number, minDistance: number = 0) {
    let best = null;
    let bestDistSq = Infinity;

    for (const seg of this.segments) {
      if (seg.s0 + seg.len < minDistance) continue;
      let inside = true;
      let sProj = 0;

      if (seg.kind === 'line') {
        const cosA = Math.cos(seg.a ?? 0);
        const sinA = Math.sin(seg.a ?? 0);
        sProj = (px - (seg.x ?? 0)) * cosA + (py - (seg.y ?? 0)) * sinA;
        if (sProj < 0 || sProj > seg.len) inside = false;
        sProj = Math.max(0, Math.min(seg.len, sProj));
      } else {
        let angle = Math.atan2(py - (seg.cy ?? 0), px - (seg.cx ?? 0)) - (seg.a0 ?? 0);
        angle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const sweep = seg.sweep ?? Math.PI;
        if (angle > sweep) {
          inside = false;
          angle = angle - sweep < 2 * Math.PI - angle ? sweep : 0;
        }
        sProj = angle * (seg.r ?? 1);
      }

      const pt = this.evalSegment(seg, seg.s0 + sProj);
      const dSq = (px - pt.x) ** 2 + (py - pt.y) ** 2;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        const nx = -Math.sin(pt.angle);
        const ny = Math.cos(pt.angle);
        best = {
          s: seg.s0 + sProj,
          x: pt.x,
          y: pt.y,
          nx,
          ny,
          d: (px - pt.x) * nx + (py - pt.y) * ny,
          inside
        };
      }
    }
    return best;
  }
}

export class PhysicsSimulation {
  public mode: 'ready' | 'drive' | 'air' | 'landed' | 'crashed' = 'ready';
  public challenge: ChallengeType = 'ramp';
  public obstacles: ObstacleVehicle[] = [];

  // Vehicle kinematic state in 2D plane (x = along runway, y = altitude)
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public angle: number = 0;
  public spinRate: number = 0;

  // Track position
  public s: number = 0;
  public v: number = 0;
  public side: number = 1; // 1 = top/front surface, -1 = inverted/back

  // Driver inputs
  public drive: number = 0;     // -1 to 1
  public lift: boolean = false; // SpaceX floor lift thrusters
  public boost: boolean = false;// SpaceX tail boost thruster (Right Arrow / Key D)
  public reverseBoost: boolean = false; // SpaceX reverse/airbrake thruster (Left Arrow / Key A)
  public turn: number = 0;      // -1 (CCW) to 1 (CW)

  // Status flags
  public lifting: boolean = false;
  public boosting: boolean = false;
  public reversing: boolean = false;
  public pitching: number = 0;
  public suction: boolean = false;
  public gas: number = 600;
  public progress: number = 0;
  public wheelTurn: number = 0;
  public time: number = 0;
  public gForce: number = 1.0;

  // Stunt metrics
  public releaseHeight: number = 0;
  public releaseTime: number = 0;
  public maxHeight: number = 0;
  public turned: number = 0;
  public result: StuntResult | null = null;
  public settleTime: number = 0;
  public events: string[] = [];

  private acc: number = 0;
  public path: RampPath;
  public settings: GameSettings;
  public launchX: number = 0;
  public fromRamp: boolean = false;
  private lastVx: number = 0;
  private lastVy: number = 0;

  constructor(path: RampPath, settings: GameSettings) {
    this.path = path;
    this.settings = settings;
    this.reset();
  }

  public setPath(path: RampPath) {
    this.path = path;
    if (this.mode === 'ready') this.reset();
  }

  public setSettings(settings: GameSettings) {
    this.settings = settings;
  }

  public get start(): number {
    return this.challenge === 'jump'
      ? clamp(this.path.shape.runIn - 178, 0, this.path.curveStart)
      : Math.max(0, this.path.curveStart - 7);
  }

  public reset(): void {
    this.mode = 'ready';
    this.s = this.start;
    this.v = 0;
    this.spinRate = 0;
    this.gas = this.settings.gas;
    this.progress = -1;
    this.time = 0;
    this.turned = 0;
    this.maxHeight = 0;
    this.result = null;
    this.settleTime = 0;
    this.lifting = false;
    this.boosting = false;
    this.reversing = false;
    this.pitching = 0;
    this.suction = false;
    this.fromRamp = false;
    this.side = 1;
    this.placeOnDeck();
    this.launchX = this.x;
    this.lastVx = 0;
    this.lastVy = 0;
    this.gForce = 1.0;
    this.events = [];
  }

  public placeOnDeck(): void {
    const pt = this.path.at(this.s);
    const offset = this.side > 0 ? 0.60 : -1.05;
    this.x = pt.x - Math.sin(pt.angle) * offset;
    this.y = pt.y + Math.cos(pt.angle) * offset;
    this.angle = pt.angle + (this.side > 0 ? 0 : Math.PI);
    this.vx = this.v * Math.cos(pt.angle);
    this.vy = this.v * Math.sin(pt.angle);
  }

  public advance(dt: number): void {
    this.acc = Math.min(this.acc + dt, 0.25);
    while (this.acc >= SUB_STEP) {
      this.acc -= SUB_STEP;
      this.step(SUB_STEP);

      const ax = (this.vx - this.lastVx) / SUB_STEP;
      const ay = (this.vy - this.lastVy) / SUB_STEP + this.settings.gravity;
      this.lastVx = this.vx;
      this.lastVy = this.vy;
      const measuredG = Math.min(9.0, Math.hypot(ax, ay) / this.settings.gravity);
      this.gForce += (measuredG - this.gForce) * 0.06;
    }
  }

  public step(dt: number): void {
    const g = this.settings.gravity;
    const cfg = this.settings;

    this.time += dt;
    this.lifting = false;
    this.boosting = false;
    this.pitching = 0;
    this.suction = false;

    if (this.mode === 'ready') {
      if (this.drive === 0 && !this.lift && !this.boost && !this.reverseBoost) return;
      this.mode = 'drive';
    }

    // 1. Surface Driving Simulation (Runway & Ramp Climb)
    if (this.mode === 'drive' || this.mode === 'landed') {
      const pt = this.path.at(this.s);
      const cosA = Math.cos(pt.angle);
      const sinA = Math.sin(pt.angle);
      const side = this.side;
      const isHorizontal = side > 0 && cosA > 0.97;
      const isThrottleActive = this.mode === 'drive' && this.drive !== 0;

      if (this.mode === 'landed') {
        // Friction braking to rest
        this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), 12 * dt);
      } else {
        if (isThrottleActive) {
          this.suction = true;
          const targetVel = this.drive * side * (isHorizontal ? cfg.cruise : cfg.drive);
          const diff = targetVel - this.v;
          if (!(this.boost && this.gas > 0 && diff * side < 0 && this.drive > 0)) {
            this.v += clamp(2.5 * diff, -9, 9) * dt;
          }
        } else {
          // Coasting decelerations
          this.v += -g * sinA * dt;
          this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), 0.4 * dt);
        }

        // SpaceX tail boost while on ground (Right key / Forward booster)
        if (this.boost && this.gas > 0) {
          this.v += side * cfg.boost * g * dt;
          this.gas = Math.max(0, this.gas - 0.5 * cfg.burn * dt);
          this.boosting = true;
        }

        // SpaceX reverse/airbrake boost while on ground (Left key / Backward booster)
        if (this.reverseBoost && this.gas > 0) {
          this.v -= side * cfg.boost * g * dt;
          this.gas = Math.max(0, this.gas - 0.5 * cfg.burn * dt);
          this.reversing = true;
        }

        // Centrifugal adhesion vs suction detachment check
        const normalForce = side > 0
          ? this.v * this.v * pt.k + g * cosA
          : -(this.v * this.v * pt.k) / (1 + 0.45 * pt.k) - g * cosA;

        // When throttle is released and downward gravity exceeds adhesion, car detaches!
        if (!isThrottleActive && normalForce < 0.25 * g) {
          this.detach(pt.angle, pt.k, false);
          return;
        }

        // SpaceX floor lift thruster breaks suction immediately
        if (this.lift && this.gas > 0) {
          this.detach(pt.angle, pt.k, false, 0.3);
          return;
        }
      }

      this.s += this.v * dt;
      this.wheelTurn -= (this.v * side / 0.37) * dt;

      // Inverted backside ramp boundary checks
      if (side < 0 && (this.s >= this.path.length || this.s <= this.path.curveStart + 0.3)) {
        this.s = clamp(this.s, 0, this.path.length);
        const exitPt = this.path.at(this.s);
        this.detach(exitPt.angle, exitPt.k, false, 0.2);
        return;
      }

      // Reached apex of the ramp!
      if (this.s >= this.path.length) {
        this.s = this.path.length;
        const exitPt = this.path.at(this.s);
        this.events.push('top');
        this.detach(exitPt.angle, exitPt.k, true);
        return;
      }

      if (this.s < 0) {
        this.s = 0;
        this.v = 0;
      }

      if (this.mode === 'drive' && side > 0 && this.s > this.path.curveStart) {
        this.progress = Math.max(this.progress, this.s);
      }

      this.placeOnDeck();

      if (isHorizontal && this.hitsObstacle()) return;

      if (this.mode === 'landed' && Math.abs(this.v) < 0.05) {
        this.settleTime += dt;
      }
      return;
    }

    // 2. Free-Flight Aeroballistics (Airborne with SpaceX Cold Gas Thrusters)
    let fx = 0;
    let fy = -g;
    const isAir = this.mode === 'air';

    if (isAir) {
      // SpaceX Underfloor Lift Nozzles
      if (this.lift && this.gas > 0) {
        const liftAcc = cfg.thrust * g;
        fx += -Math.sin(this.angle) * liftAcc;
        fy += Math.cos(this.angle) * liftAcc;
        this.gas = Math.max(0, this.gas - cfg.burn * dt);
        this.lifting = true;
      }

      // SpaceX Tail Boost Nozzle (Right key / Forward booster)
      if (this.boost && this.gas > 0) {
        const boostAcc = cfg.boost * g;
        fx += Math.cos(this.angle) * boostAcc;
        fy += Math.sin(this.angle) * boostAcc;
        this.gas = Math.max(0, this.gas - 0.5 * cfg.burn * dt);
        this.boosting = true;
      }

      // SpaceX Front/Airbrake Reverse Boost Nozzle (Left key / Backward booster)
      if (this.reverseBoost && this.gas > 0) {
        const reverseAcc = cfg.boost * g;
        fx -= Math.cos(this.angle) * reverseAcc;
        fy -= Math.sin(this.angle) * reverseAcc;
        this.gas = Math.max(0, this.gas - 0.5 * cfg.burn * dt);
        this.reversing = true;
      }

      // Cold Gas Attitude Reaction Control Thrusters (Pitch Flips)
      if (this.turn !== 0 && this.gas > 0) {
        this.spinRate += this.turn * cfg.spin * dt;
        this.gas = Math.max(0, this.gas - 0.18 * cfg.burn * dt);
        this.pitching = this.turn;
      }

      // Gyroscopic / Aerodynamic Angular Stabilization
      const dampingFactor = this.turn === 0 && this.gas > 0 ? cfg.steady : 0.25;
      this.spinRate *= 1 - dampingFactor * dt;
    }

    // Aerodynamic Drag
    const speed = Math.hypot(this.vx, this.vy);
    fx -= this.vx * speed * 0.004;
    fy -= this.vy * speed * 0.004;

    this.vx += fx * dt;
    this.vy += fy * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.spinRate * dt;
    this.wheelTurn -= this.spinRate * dt * 0.2;

    if (isAir) {
      this.turned += this.spinRate * dt;
      this.maxHeight = Math.max(this.maxHeight, this.y - 0.6);
      this.collideFlying();
    } else {
      this.collideWreck(dt);
    }
  }

  public detach(angle: number, curvature: number, apex: boolean, kick: number = apex ? 0.4 : 1.4): void {
    const nx = -Math.sin(angle) * this.side;
    const ny = Math.cos(angle) * this.side;
    this.vx = this.v * Math.cos(angle) + nx * kick;
    this.vy = this.v * Math.sin(angle) + ny * kick;
    this.spinRate = this.v * curvature;
    this.mode = 'air';
    this.releaseHeight = Math.max(0, this.y - 0.6);
    this.releaseTime = this.time;
    this.maxHeight = this.releaseHeight;
    this.turned = 0;
    this.launchX = this.x;
    this.fromRamp = this.s > this.path.curveStart + 0.5;
    this.events.push('detach');
  }

  public worldProbe(probeIndex: number): [number, number] {
    const [px, py] = COLLISION_PROBES[probeIndex];
    const cosA = Math.cos(this.angle);
    const sinA = Math.sin(this.angle);
    return [this.x + px * cosA - py * sinA, this.y + px * sinA + py * cosA];
  }

  public lowest(): { y: number; wheel: boolean } {
    const probeHeights = COLLISION_PROBES.map((_, i) => this.worldProbe(i)[1]);
    const minY = Math.min(...probeHeights);
    const isWheelLow = COLLISION_PROBES.some((p, i) => p[2] && probeHeights[i] - minY < 0.12);
    return { y: minY, wheel: isWheelLow };
  }

  public hitsObstacle(): boolean {
    for (const obs of this.obstacles) {
      if (this.x + 2.25 > obs.x0 && this.x - 2.25 < obs.x1) {
        const vel = this.v;
        this.crash(`Drove into ${obs.label}`);
        this.vx = -Math.sign(vel || 1) * Math.min(6, 0.3 * Math.abs(vel));
        this.vy = Math.min(5, 0.25 * Math.abs(vel));
        this.spinRate = (Math.random() - 0.5) * 4;
        return true;
      }
    }
    return false;
  }

  public obstacleAt(x: number, y: number): ObstacleVehicle | null {
    for (const obs of this.obstacles) {
      if (x > obs.x0 && x < obs.x1 && y < obs.h) {
        return obs;
      }
    }
    return null;
  }

  public collideFlying(): void {
    const cfg = this.settings;
    const near = this.path.nearest(this.x, this.y, this.path.curveStart);

    // Collision with backside of the ramp
    if (near && near.inside && near.s > this.path.curveStart + 0.3) {
      if (near.d <= -0.225 && near.d > -1.02) {
        this.touchBack(near);
        return;
      }
      if (near.d < 0.57 && near.d > -0.225) {
        const alignment = -Math.sin(this.angle) * near.nx + Math.cos(this.angle) * near.ny;
        const impactVel = -(this.vx * near.nx + this.vy * near.ny);
        if (alignment > Math.cos((30 * Math.PI) / 180) && impactVel < cfg.landSpeed) {
          this.mode = 'drive';
          this.s = near.s;
          const pt = this.path.at(near.s);
          this.v = this.vx * Math.cos(pt.angle) + this.vy * Math.sin(pt.angle);
          this.spinRate = 0;
          this.placeOnDeck();
          this.events.push('reattach');
          return;
        }
        this.crash('Hit the ramp');
        this.x += near.nx * (0.6 - near.d);
        this.y += near.ny * (0.6 - near.d);
        return;
      }
    }

    // Check collisions against parked obstacle vehicles
    for (let i = 0; i < COLLISION_PROBES.length; i++) {
      const [wx, wy] = this.worldProbe(i);
      const hit = this.obstacleAt(wx, wy);
      if (hit) {
        this.crash(`Clipped ${hit.label}`);
        this.vx *= -0.2;
        this.vy = Math.max(this.vy, 2);
        return;
      }
    }

    // Ground Touchdown Check (Never trigger ground impact while ascending with thrusters)
    const low = this.lowest();
    if (low.y > 0 || this.vy > 0 || this.time - this.releaseTime < 0.12) return;

    const normalizedAngle = ((this.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const tiltDeg = (180 * Math.abs(Math.atan2(Math.sin(this.angle), Math.cos(this.angle)))) / Math.PI;
    const impactSpeed = -this.vy;
    const wheelsFirst = tiltDeg <= cfg.landAngle && low.wheel;

    if (wheelsFirst && impactSpeed <= cfg.landSpeed) {
      this.land(impactSpeed, tiltDeg);
    } else {
      this.y -= low.y;
      const reason = wheelsFirst
        ? 'Came down too hard'
        : tiltDeg > 100
        ? 'Landed on the roof'
        : 'Landed on the nose';
      this.crash(reason);
    }
  }

  public touchBack(near: { s: number; nx: number; ny: number; d: number }): void {
    const cfg = this.settings;
    const nx = -near.nx;
    const ny = -near.ny;
    const dot = clamp(-Math.sin(this.angle) * nx + Math.cos(this.angle) * ny, -1, 1);
    const tiltDeg = (180 * Math.acos(dot)) / Math.PI;
    const impactVel = -(this.vx * nx + this.vy * ny);

    if (tiltDeg <= cfg.landAngle && impactVel <= cfg.landSpeed) {
      this.side = -1;
      this.s = near.s;
      const pt = this.path.at(near.s);
      this.v = this.vx * Math.cos(pt.angle) + this.vy * Math.sin(pt.angle);
      this.spinRate = 0;
      if (ny > 0.85) {
        this.land(impactVel, tiltDeg, true);
      } else {
        this.mode = 'drive';
        this.placeOnDeck();
        this.events.push('reattach');
      }
      return;
    }

    this.crash(ny < 0.5 ? 'Hit the back of the ramp' : tiltDeg > 100 ? 'Landed on the roof, on top' : 'Hit the top of the ramp');
    this.x += nx * (1.05 + near.d);
    this.y += ny * (1.05 + near.d);
    const dotVel = this.vx * nx + this.vy * ny;
    if (dotVel < 0) {
      this.vx -= 1.3 * dotVel * nx;
      this.vy -= 1.3 * dotVel * ny;
    }
  }

  public clearedCount(): number {
    const minX = Math.min(this.launchX, this.x);
    const maxX = Math.max(this.launchX, this.x);
    return this.obstacles.filter(obs => obs.x0 > minX && obs.x1 < maxX - 1.125).length;
  }

  public land(speed: number, tilt: number, onTop: boolean = false): void {
    const cfg = this.settings;
    const airTime = this.time - this.releaseTime;
    const totalFlips = Math.abs(this.turned) / (2 * Math.PI);
    const cleared = this.clearedCount();
    const stuntKind: ChallengeType | null = onTop || this.fromRamp ? 'ramp' : cleared > 0 ? 'jump' : null;

    this.spinRate = 0;
    if (!onTop) {
      this.side = 1;
      this.s = clamp(this.x + this.path.shape.runIn, 0, this.path.curveStart);
      this.v = this.vx;
    }
    this.placeOnDeck();

    if (!stuntKind) {
      this.mode = 'drive';
      this.events.push('hop');
      return;
    }

    this.mode = 'landed';
    this.events.push('land');

    const fuelRatio = this.gas / cfg.gas;
    const softRatio = Math.max(0, 1 - speed / cfg.landSpeed);
    const levelRatio = Math.max(0, 1 - tilt / cfg.landAngle);

    const targetX = stuntKind === 'ramp' ? cfg.zoneX : cfg.jumpZoneX;
    const targetHalf = stuntKind === 'ramp' ? cfg.zoneHalf : cfg.jumpZoneHalf;
    const onMark = !onTop && Math.abs(this.x - targetX) <= targetHalf;

    const fullFlips = stuntKind !== 'ramp' || onTop
      ? Math.floor(totalFlips + 0.08)
      : Math.max(0, Math.floor(totalFlips - 0.5 + 0.08));

    const lines: ScoreLine[] = [];
    if (stuntKind === 'jump') {
      lines.push({ label: 'Cleared', value: `${cleared} of ${this.obstacles.length}`, points: 600 * cleared });
      lines.push({ label: 'Height', value: `${this.maxHeight.toFixed(1)} m`, points: Math.round(40 * this.maxHeight) });
    } else {
      lines.push({ label: 'Height', value: `${this.releaseHeight.toFixed(1)} m`, points: Math.round(60 * this.releaseHeight) });
    }

    lines.push(
      { label: 'Air time', value: `${airTime.toFixed(2)} s`, points: Math.round(150 * airTime) },
      { label: 'Flips', value: totalFlips.toFixed(2), points: 1500 * fullFlips },
      { label: 'Touchdown', value: `${speed.toFixed(1)} m/s`, points: Math.round(1200 * softRatio) },
      { label: 'Level', value: `${tilt.toFixed(1)}°`, points: Math.round(600 * levelRatio) },
      { label: 'Gas left', value: `${Math.round(100 * fuelRatio)}%`, points: Math.round(800 * fuelRatio) },
      onTop
        ? { label: 'On top', value: 'Yes', points: 2500 }
        : { label: 'On the mark', value: onMark ? 'Yes' : 'No', points: onMark ? 1000 : 0 }
    );

    const totalScore = 10 * Math.round(lines.reduce((sum, item) => sum + (item.points ?? 0), 0) / 10);
    const isAllClear = stuntKind === 'ramp' || cleared === this.obstacles.length;
    const title = onTop
      ? softRatio > 0.75 && levelRatio > 0.75 ? 'Perfect, on top' : 'Landed on top'
      : isAllClear
      ? softRatio > 0.75 && levelRatio > 0.75 && onMark ? 'Perfect' : softRatio > 0.5 && levelRatio > 0.5 ? 'Clean' : 'Landed'
      : 'Landed short';

    this.result = {
      landed: true,
      kind: stuntKind,
      title,
      reason: title,
      score: totalScore,
      height: this.releaseHeight,
      flips: totalFlips,
      cleared,
      lines
    };
  }

  public crash(reason: string): void {
    this.mode = 'crashed';
    this.spinRate += (Math.random() - 0.5) * 3;
    this.events.push('crash');
    this.result = {
      landed: false,
      kind: this.fromRamp ? 'ramp' : 'jump',
      title: 'Crashed',
      reason,
      score: 0,
      height: this.releaseHeight,
      flips: Math.abs(this.turned) / (2 * Math.PI),
      cleared: this.clearedCount(),
      lines: []
    };
  }

  public collideWreck(dt: number): void {
    for (let i = 0; i < COLLISION_PROBES.length; i++) {
      const [wx, wy] = this.worldProbe(i);
      if (wy >= 0) continue;

      const rx = wx - this.x;
      const ry = wy - this.y;
      const vTangent = this.vx - this.spinRate * ry;
      const vNormal = this.vy + this.spinRate * rx;

      this.y -= 0.5 * wy;
      if (vNormal >= 0) continue;

      const normalImpulse = -1.25 * vNormal / (1 + (rx * rx) / MOMENT_OF_INERTIA);
      this.vy += normalImpulse;
      this.spinRate += (rx * normalImpulse) / MOMENT_OF_INERTIA;

      let frictionImpulse = -vTangent / (1 + (ry * ry) / MOMENT_OF_INERTIA);
      frictionImpulse = clamp(frictionImpulse, -0.6 * normalImpulse, 0.6 * normalImpulse);
      this.vx += frictionImpulse;
      this.spinRate += (-ry * frictionImpulse) / MOMENT_OF_INERTIA;
    }

    const rest = Math.hypot(this.vx, this.vy) < 0.4 && Math.abs(this.spinRate) < 0.4 && this.y < 5;
    this.settleTime = rest ? this.settleTime + dt : 0;
  }
}
