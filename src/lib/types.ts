export type ChallengeType = 'ramp' | 'jump';
export type CameraViewMode = 'Side' | 'Chase' | 'Drone' | 'Ground';

export interface GameSettings {
  // Environment & Gravity
  gravity: number;
  
  // Driving Dynamics
  drive: number;
  cruise: number;
  
  // SpaceX Thruster Dynamics
  thrust: number;      // Vertical lift multiplier
  boost: number;       // Forward boost multiplier
  gas: number;         // Total fuel tank in Liters (default 600)
  burn: number;        // Fuel consumption rate in L/s (default 180)
  spin: number;        // Pitch control reaction torque
  steady: number;      // Aerodynamic rotational damping
  
  // Landing Criteria
  landAngle: number;   // Max angle in degrees for safe landing (default 28)
  landSpeed: number;   // Max touchdown speed in m/s (default 7)
  zoneX: number;       // Center of target landing zone for Ramp
  zoneHalf: number;    // Half-width of target zone for Ramp
  jumpZoneX: number;   // Center of target landing zone for Jump
  jumpZoneHalf: number;// Half-width of target zone for Jump
  
  // Ramp Geometry
  runIn: number;
  r1: number;
  wall: number;
  r2: number;
  sweep: number;
  lip: number;
  width: number;
  
  // Appearance
  bodyColor: string;
  ledColor: string;
  gasColor: string;
  bloom: number;
  exposure: number;
  shake: boolean;
  sound: boolean;
  volume: number;
}

export interface ObstacleVehicle {
  label: string;
  length: number;
  width: number;
  height: number;
  color: string;
  metal: number;
  x0: number;
  x1: number;
  h: number;
}

export interface ScoreLine {
  label: string;
  value: string;
  points?: number;
}

export interface StuntResult {
  landed: boolean;
  kind: ChallengeType;
  title: string;
  reason: string;
  score: number;
  height: number;
  flips: number;
  cleared: number;
  lines: ScoreLine[];
}

export interface TelemetryData {
  height: number;
  speed: number;
  gForce: number;
  tilt: number;
  gas: number;
  gasMax: number;
  mode: 'ready' | 'drive' | 'air' | 'landed' | 'crashed';
  suction: boolean;
  lifting: boolean;
  boosting: boolean;
  reversing?: boolean;
  pitching: number;
}

export interface InputControls {
  forward: boolean;
  back: boolean;
  lift: boolean;
  boost: boolean;
  reverseBoost?: boolean;
  ccw: boolean;
  cw: boolean;
}
