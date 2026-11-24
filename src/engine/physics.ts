import * as THREE from 'three';
import type {
  ComputedDroneStats,
  FlightMode,
  GateDef,
  RatesProfile,
  StickInputs,
  TrackDef,
} from '../types/game';
import { sampleTrackTerrainHeight } from '../data/tracks';

export interface DronePhysicsState {
  position: THREE.Vector3;
  prevPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  quaternion: THREE.Quaternion;
  angularVelocity: THREE.Vector3; // local body rad/s: x=pitch, y=yaw, z=roll
  motorRpms: [number, number, number, number];
  batteryRemainingWh: number;
  voltageV: number;
  armed: boolean;
  crashed: boolean;
  crashCooldown: number;
  hitstopTimer: number;
  shakeIntensity: number;
  currentGateIndex: number;
  currentLap: number;
  lapStartTimeMs: number;
  raceStartTimeMs: number;
  lapTimesMs: number[];
  bestLapMs: number | null;
  lastSplitDeltaMs: number | null;
  cleanGates: number;
  finished: boolean;
}

// Pre-allocated scratch math objects (zero GC in 60fps loop)
const _upWorld = new THREE.Vector3(0, 1, 0);
const _localUp = new THREE.Vector3();
const _thrustVec = new THREE.Vector3();
const _dragVec = new THREE.Vector3();
const _deltaQ = new THREE.Quaternion();
const _axisX = new THREE.Vector3(1, 0, 0);
const _axisY = new THREE.Vector3(0, 1, 0);
const _axisZ = new THREE.Vector3(0, 0, 1);
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _gateCenter = new THREE.Vector3();
const _gateNormal = new THREE.Vector3();
const _gateRight = new THREE.Vector3();
const _toPrev = new THREE.Vector3();
const _toCurr = new THREE.Vector3();
const _crossPt = new THREE.Vector3();

/**
 * Authentic Betaflight Rate Curve calculation (deg/s -> rad/s)
 */
export function computeBetaflightRateRadS(
  stickDeflection: number,
  rates: RatesProfile,
  agilityScale = 1
): number {
  const absStick = Math.min(1, Math.abs(stickDeflection));
  const sign = stickDeflection < 0 ? -1 : 1;

  // Apply cubic expo
  const expoed =
    absStick * (1 - rates.expo) + Math.pow(absStick, 3) * rates.expo;

  const rcCommand = expoed;
  const superFactor = 1 / Math.max(0.1, 1 - absStick * rates.superRate);
  const degPerSec = 200 * rates.rcRate * rcCommand * superFactor * agilityScale;

  return THREE.MathUtils.degToRad(sign * degPerSec);
}

/**
 * Non-linear throttle curve with configurable mid & expo
 */
export function shapeThrottle(raw: number, rates: RatesProfile): number {
  const t = THREE.MathUtils.clamp(raw, 0, 1);
  const centered = t - rates.throttleMid;
  const shaped =
    t + rates.throttleExpo * centered * (centered * centered - 0.25);
  return THREE.MathUtils.clamp(shaped, 0, 1);
}

export function createInitialPhysicsState(
  track: TrackDef,
  stats: ComputedDroneStats
): DronePhysicsState {
  const firstGate = track.gates[0];
  // Spawn 16m behind Gate 1 facing Gate 1
  const heading = firstGate ? firstGate.headingRad : 0;
  const spawnX = firstGate ? firstGate.position[0] - Math.sin(heading) * 16 : 0;
  const spawnZ = firstGate ? firstGate.position[2] - Math.cos(heading) * 16 : 0;
  const groundY = sampleTrackTerrainHeight(spawnX, spawnZ, track);

  const q = new THREE.Quaternion().setFromAxisAngle(_axisY, heading + Math.PI);
  //Wait: Three.js camera looks down -Z in local space. When headingRad = atan2(dx, dz),
  // forward vector (sin(h), 0, cos(h)) corresponds to local -Z rotated by (heading + PI) around Y!
  // Let's verify: local (0, 0, -1) rotated by Y=theta is (-sin(theta), 0, -cos(theta)).
  // To equal (sin(h), 0, cos(h)), we want theta = h + PI! Let's check:
  // -sin(h+PI) = sin(h), -cos(h+PI) = cos(h). Exact!

  return {
    position: new THREE.Vector3(spawnX, groundY + 0.35, spawnZ),
    prevPosition: new THREE.Vector3(spawnX, groundY + 0.35, spawnZ),
    velocity: new THREE.Vector3(0, 0, 0),
    quaternion: q,
    angularVelocity: new THREE.Vector3(0, 0, 0),
    motorRpms: [0, 0, 0, 0],
    batteryRemainingWh: stats.batteryWh,
    voltageV: 25.2,
    armed: true,
    crashed: false,
    crashCooldown: 0,
    hitstopTimer: 0,
    shakeIntensity: 0,
    currentGateIndex: 0,
    currentLap: 1,
    lapStartTimeMs: 0,
    raceStartTimeMs: 0,
    lapTimesMs: [],
    bestLapMs: null,
    lastSplitDeltaMs: null,
    cleanGates: 0,
    finished: false,
  };
}

export interface StepPhysicsCallbacks {
  onGatePassed?: (gateIdx: number, isLapComplete: boolean) => void;
  onRaceFinished?: () => void;
  onImpact?: (severity: number, pos: THREE.Vector3) => void;
}

export function stepDronePhysics(
  state: DronePhysicsState,
  inputs: StickInputs,
  stats: ComputedDroneStats,
  rates: RatesProfile,
  flightMode: FlightMode,
  track: TrackDef,
  dt: number,
  elapsedRaceMs: number,
  callbacks?: StepPhysicsCallbacks
): void {
  if (state.hitstopTimer > 0) {
    state.hitstopTimer = Math.max(0, state.hitstopTimer - dt);
    return;
  }

  state.shakeIntensity = Math.max(0, state.shakeIntensity - dt * 2.8);
  state.crashCooldown = Math.max(0, state.crashCooldown - dt);
  state.prevPosition.copy(state.position);

  if (!state.armed) {
    state.motorRpms = [0, 0, 0, 0];
    // Gravity settling when disarmed
    const groundY = sampleTrackTerrainHeight(state.position.x, state.position.z, track);
    if (state.position.y > groundY + 0.2) {
      state.velocity.y -= 9.81 * dt;
      state.position.addScaledVector(state.velocity, dt);
    }
    if (state.position.y <= groundY + 0.2) {
      state.position.y = groundY + 0.2;
      state.velocity.set(0, 0, 0);
    }
    return;
  }

  // Shape throttle and compute thrust
  const shapedThrottle = shapeThrottle(inputs.throttle, rates);
  // Real quadcopter thrust scales roughly quadratically with motor RPM/throttle
  const throttleCurve = 0.08 + 0.92 * Math.pow(shapedThrottle, 1.35);

  // Battery depletion & sag
  const powerDrawW = stats.maxThrustN * 14 * throttleCurve + 18;
  state.batteryRemainingWh = Math.max(
    0,
    state.batteryRemainingWh - (powerDrawW * dt) / 3600
  );
  const battFrac = state.batteryRemainingWh / Math.max(1, stats.batteryWh);
  const restingVoltage = 21.0 + 4.2 * battFrac;
  const sag = throttleCurve * 1.45;
  state.voltageV = Number(Math.max(18.6, restingVoltage - sag).toFixed(2));
  const voltageMult = THREE.MathUtils.clamp(state.voltageV / 23.8, 0.78, 1.06);

  // Attitude / Angular PID Control
  // Local drone axes: -Z = forward, +Y = thrust up, +X = right
  // Pitch forward stick (+1) => pitch nose down => negative rotation around local +X
  // Roll right stick (+1) => roll right wing down => negative rotation around local -Z (i.e. negative around +Z? Wait: right-hand rule around -Z: thumb forward (-Z), fingers curl from +Y to -X? No, thumb along +Z: fingers curl +X to +Y. So rolling right (+X down, +Y toward +X) is NEGATIVE rotation around +Z? Let's verify: rotate (+X=1, +Y=0) by -theta around Z => (cos(-t), sin(-t)) = (cos, -sin) -> right wing goes DOWN (-Y). Rotate (0, +Y=1) by -theta around Z => (-sin(-t), cos(-t)) = (+sin, cos) -> top tilts RIGHT (+X). YES! Negative rotation around +Z tilts right!)
  // Yaw right stick (+1) => turn nose right => negative rotation around +Y! (thumb up +Y, fingers curl +Z to +X, so -Z rotates toward +X when theta is NEGATIVE around +Y!)
  let targetPitchRate = 0;
  let targetRollRate = 0;
  let targetYawRate = 0;

  if (flightMode === 'angle') {
    // Self-leveling Angle Mode (max bank 52 deg)
    _euler.setFromQuaternion(state.quaternion, 'YXZ');
    const maxBank = THREE.MathUtils.degToRad(52);
    const desiredPitch = -inputs.pitch * maxBank;
    const desiredRoll = -inputs.roll * maxBank;
    const angleGain = 7.5 * stats.pidResponsiveness;

    targetPitchRate = (desiredPitch - _euler.x) * angleGain;
    targetRollRate = (desiredRoll - _euler.z) * angleGain;
    targetYawRate = computeBetaflightRateRadS(-inputs.yaw, rates, 0.75);
  } else {
    // True ACRO / AIRMODE rate mode
    const activeAuthority =
      flightMode === 'airmode'
        ? 1.0
        : THREE.MathUtils.clamp(0.22 + inputs.throttle * 1.15, 0.22, 1.0);
    targetPitchRate = computeBetaflightRateRadS(-inputs.pitch, rates, activeAuthority);
    targetRollRate = computeBetaflightRateRadS(-inputs.roll, rates, activeAuthority);
    targetYawRate = computeBetaflightRateRadS(-inputs.yaw, rates, activeAuthority * 0.85);
  }

  // First-order PID gyro tracking with physical motor responsiveness
  const gyroResponse = 1 - Math.exp(-16.5 * stats.pidResponsiveness * dt);
  state.angularVelocity.x = THREE.MathUtils.lerp(state.angularVelocity.x, targetPitchRate, gyroResponse);
  state.angularVelocity.y = THREE.MathUtils.lerp(state.angularVelocity.y, targetYawRate, gyroResponse);
  state.angularVelocity.z = THREE.MathUtils.lerp(state.angularVelocity.z, targetRollRate, gyroResponse);

  // Integrate local angular velocity into world quaternion
  _deltaQ.setFromAxisAngle(_axisX, state.angularVelocity.x * dt);
  state.quaternion.multiply(_deltaQ);
  _deltaQ.setFromAxisAngle(_axisY, state.angularVelocity.y * dt);
  state.quaternion.multiply(_deltaQ);
  _deltaQ.setFromAxisAngle(_axisZ, state.angularVelocity.z * dt);
  state.quaternion.multiply(_deltaQ);
  state.quaternion.normalize();

  // Compute local thrust direction in world space
  _localUp.set(0, 1, 0).applyQuaternion(state.quaternion).normalize();

  // Ground effect boost when flying low over terrain
  const groundY = sampleTrackTerrainHeight(state.position.x, state.position.z, track);
  const agl = Math.max(0, state.position.y - groundY);
  const groundEffect = agl < 1.6 ? 1 + (1 - agl / 1.6) * 0.16 : 1.0;

  const thrustN = stats.maxThrustN * throttleCurve * voltageMult * groundEffect;
  _thrustVec.copy(_localUp).multiplyScalar(thrustN);

  // Aerodynamic drag: linear parasitic + quadratic velocity^2 drag
  const speed = state.velocity.length();
  const dragMag = speed * 0.18 + speed * speed * stats.dragCoeff * 0.11;
  if (speed > 0.001) {
    _dragVec.copy(state.velocity).divideScalar(speed).multiplyScalar(-dragMag);
  } else {
    _dragVec.set(0, 0, 0);
  }

  // Sum forces: F = Thrust + Drag + Gravity
  const invMass = 1 / stats.massKg;
  state.velocity.x += (_thrustVec.x + _dragVec.x) * invMass * dt;
  state.velocity.y += (_thrustVec.y + _dragVec.y) * invMass * dt - 9.81 * dt;
  state.velocity.z += (_thrustVec.z + _dragVec.z) * invMass * dt;

  // Integrate position
  state.position.addScaledVector(state.velocity, dt);

  // Update simulated 4-motor RPM mix (FL, FR, RL, RR) for prop blur & audio
  const baseRpm = 0.16 + throttleCurve * 0.84;
  const pMix = inputs.pitch * 0.12;
  const rMix = inputs.roll * 0.12;
  const yMix = inputs.yaw * 0.08;
  state.motorRpms = [
    THREE.MathUtils.clamp(baseRpm + pMix + rMix - yMix, 0.1, 1.25),
    THREE.MathUtils.clamp(baseRpm + pMix - rMix + yMix, 0.1, 1.25),
    THREE.MathUtils.clamp(baseRpm - pMix + rMix + yMix, 0.1, 1.25),
    THREE.MathUtils.clamp(baseRpm - pMix - rMix - yMix, 0.1, 1.25),
  ];

  // Terrain Collision & Scrape Physics
  const nextGroundY = sampleTrackTerrainHeight(state.position.x, state.position.z, track);
  const clearance = 0.24;
  if (state.position.y < nextGroundY + clearance) {
    const impactSpeed = Math.abs(state.velocity.y);
    state.position.y = nextGroundY + clearance;

    if (impactSpeed > 6.5 && state.crashCooldown <= 0) {
      const severity = Math.min(1, (impactSpeed - 5) / 18);
      state.shakeIntensity = Math.max(state.shakeIntensity, 0.45 + severity * 0.55);
      state.hitstopTimer = 0.045;
      state.crashCooldown = 0.35;
      callbacks?.onImpact?.(severity, state.position);
      // Bounce upward slightly and damp horizontal speed
      state.velocity.y = Math.max(1.8, impactSpeed * 0.35);
      state.velocity.x *= 0.55;
      state.velocity.z *= 0.55;
    } else {
      state.velocity.y = Math.max(0, state.velocity.y);
      state.velocity.x *= 0.92;
      state.velocity.z *= 0.92;
    }
  }

  // Arena soft boundary (radius 250m)
  const distFromOrigin = Math.hypot(state.position.x, state.position.z);
  if (distFromOrigin > 245) {
    const nx = state.position.x / distFromOrigin;
    const nz = state.position.z / distFromOrigin;
    state.position.x = nx * 245;
    state.position.z = nz * 245;
    state.velocity.x *= -0.4;
    state.velocity.z *= -0.4;
  }

  // Obstacle cylindrical collision checks
  for (let i = 0; i < track.obstacles.length; i++) {
    const obs = track.obstacles[i];
    const obsGround = sampleTrackTerrainHeight(obs.x, obs.z, track);
    if (state.position.y <= obsGround + obs.height) {
      const dx = state.position.x - obs.x;
      const dz = state.position.z - obs.z;
      const dist = Math.hypot(dx, dz);
      const hitRad = obs.radius + stats.armSpanM * 0.6;
      if (dist < hitRad && dist > 0.001) {
        const nx = dx / dist;
        const nz = dz / dist;
        state.position.x = obs.x + nx * hitRad;
        state.position.z = obs.z + nz * hitRad;
        const impactVel = Math.hypot(state.velocity.x, state.velocity.z);
        state.velocity.x = nx * Math.max(3, impactVel * 0.45);
        state.velocity.z = nz * Math.max(3, impactVel * 0.45);
        if (impactVel > 5 && state.crashCooldown <= 0) {
          const sev = Math.min(1, impactVel / 24);
          state.shakeIntensity = Math.max(state.shakeIntensity, 0.5 + sev * 0.5);
          state.hitstopTimer = 0.05;
          state.crashCooldown = 0.35;
          callbacks?.onImpact?.(sev, state.position);
        }
      }
    }
  }

  // Gate crossing detection (segment vs gate plane intersection)
  if (!state.finished && track.gates.length > 0) {
    const gate: GateDef = track.gates[state.currentGateIndex];
    _gateCenter.set(gate.position[0], gate.position[1], gate.position[2]);
    _gateNormal.set(Math.sin(gate.headingRad), 0, Math.cos(gate.headingRad)).normalize();
    _gateRight.set(Math.cos(gate.headingRad), 0, -Math.sin(gate.headingRad)).normalize();

    _toPrev.subVectors(state.prevPosition, _gateCenter);
    _toCurr.subVectors(state.position, _gateCenter);

    const dPrev = _toPrev.dot(_gateNormal);
    const dCurr = _toCurr.dot(_gateNormal);

    // Crossed plane in either direction near gate aperture
    if ((dPrev <= 0 && dCurr >= 0) || (dPrev >= 0 && dCurr <= 0)) {
      const denom = Math.abs(dPrev) + Math.abs(dCurr);
      const tCross = denom > 0.0001 ? Math.abs(dPrev) / denom : 0.5;
      _crossPt.lerpVectors(state.prevPosition, state.position, tCross);

      const relX = _crossPt.clone().sub(_gateCenter).dot(_gateRight);
      const relY = _crossPt.y - _gateCenter.y;

      // Generous race-gate aperture check (+0.8m tolerance for exhilarating flow)
      if (
        Math.abs(relX) <= gate.width * 0.56 &&
        Math.abs(relY) <= gate.height * 0.58
      ) {
        state.cleanGates++;
        const nextIdx = state.currentGateIndex + 1;
        if (nextIdx >= track.gates.length) {
          const lapDuration = elapsedRaceMs - state.lapStartTimeMs;
          state.lapTimesMs.push(lapDuration);
          if (state.bestLapMs === null || lapDuration < state.bestLapMs) {
            state.lastSplitDeltaMs =
              state.bestLapMs === null ? null : lapDuration - state.bestLapMs;
            state.bestLapMs = lapDuration;
          } else {
            state.lastSplitDeltaMs = lapDuration - state.bestLapMs;
          }
          state.lapStartTimeMs = elapsedRaceMs;
          state.currentGateIndex = 0;

          if (state.currentLap >= track.lapCount) {
            state.finished = true;
            callbacks?.onGatePassed?.(gate.id, true);
            callbacks?.onRaceFinished?.();
          } else {
            state.currentLap++;
            callbacks?.onGatePassed?.(gate.id, true);
          }
        } else {
          state.currentGateIndex = nextIdx;
          callbacks?.onGatePassed?.(gate.id, false);
        }
      }
    }
  }
}
