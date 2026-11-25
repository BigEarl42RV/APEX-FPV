/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import * as THREE from 'three';
import { buildProceduralDroneModel, type DroneModelHandles } from './droneMesh';
import type { LaserBeamVisual, MultiplayerPose, TeamId } from '../types/multiplayer';

interface RemoteSlot {
  assignedId: string | null;
  model: DroneModelHandles;
  itRing: THREE.Mesh;
  itRingMat: THREE.MeshBasicMaterial;
  targetPos: THREE.Vector3;
  targetQuat: THREE.Quaternion;
  initialized: boolean;
}

interface BeamSlot {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  ageSec: number;
  maxAgeSec: number;
}

const _up = new THREE.Vector3(0, 1, 0);
const _beamDir = new THREE.Vector3();
const _beamMid = new THREE.Vector3();
const _beamStart = new THREE.Vector3();
const _beamEnd = new THREE.Vector3();
const _beamQuat = new THREE.Quaternion();

function getTeamHex(team: TeamId): string {
  if (team === 'red') return '#ef4444';
  if (team === 'blue') return '#06b6d4';
  return '#f59e0b';
}

export interface MultiplayerVisualSystem {
  group: THREE.Group;
  update: (
    dt: number,
    elapsedSec: number,
    active: boolean,
    remotePoses: Map<string, MultiplayerPose>,
    pendingBeams: LaserBeamVisual[],
    onImpactSpark: (pos: THREE.Vector3) => void
  ) => void;
  dispose: () => void;
}

export function createMultiplayerVisualSystem(
  maxAnisotropy: number,
  isSoftwareGl: boolean
): MultiplayerVisualSystem {
  const group = new THREE.Group();

  const ringGeo = new THREE.TorusGeometry(0.54, 0.045, 8, 28);
  ringGeo.rotateX(Math.PI / 2);

  const remoteSlots: RemoteSlot[] = Array.from({ length: 7 }, () => {
    const model = buildProceduralDroneModel(
      'apex-x5',
      {
        frameColor: '#18181b',
        frameFinish: 'matte',
        canopyColor: '#06b6d4',
        armAccentColor: '#22d3ee',
        propColor: '#f59e0b',
        ledColor: '#06b6d4',
        cameraTiltDeg: 24,
      },
      maxAnisotropy,
      isSoftwareGl
    );
    model.root.visible = false;

    const itRingMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const itRing = new THREE.Mesh(ringGeo, itRingMat);
    itRing.visible = false;
    model.root.add(itRing);
    group.add(model.root);

    return {
      assignedId: null,
      model,
      itRing,
      itRingMat,
      targetPos: new THREE.Vector3(),
      targetQuat: new THREE.Quaternion(),
      initialized: false,
    };
  });

  const beamGeo = new THREE.CylinderGeometry(0.055, 0.055, 1, 6);
  const beamSlots: BeamSlot[] = Array.from({ length: 16 }, () => {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(beamGeo, mat);
    mesh.visible = false;
    mesh.frustumCulled = false;
    group.add(mesh);
    return {
      active: false,
      mesh,
      mat,
      ageSec: 0,
      maxAgeSec: 0.24,
    };
  });

  const update = (
    dt: number,
    elapsedSec: number,
    active: boolean,
    remotePoses: Map<string, MultiplayerPose>,
    pendingBeams: LaserBeamVisual[],
    onImpactSpark: (pos: THREE.Vector3) => void
  ) => {
    if (!active) {
      for (const s of remoteSlots) {
        s.model.root.visible = false;
        s.assignedId = null;
        s.initialized = false;
      }
      for (const b of beamSlots) {
        b.active = false;
        b.mesh.visible = false;
      }
      return;
    }

    // Consume pending laser beams
    while (pendingBeams.length > 0) {
      const beam = pendingBeams.shift()!;
      const slot = beamSlots.find((b) => !b.active) ?? beamSlots[0];
      _beamStart.set(beam.start[0], beam.start[1], beam.start[2]);
      _beamEnd.set(beam.end[0], beam.end[1], beam.end[2]);
      _beamDir.subVectors(_beamEnd, _beamStart);
      const len = Math.max(0.5, _beamDir.length());
      _beamDir.normalize();

      _beamMid.addVectors(_beamStart, _beamEnd).multiplyScalar(0.5);
      _beamQuat.setFromUnitVectors(_up, _beamDir);

      slot.active = true;
      slot.ageSec = 0;
      slot.maxAgeSec = 0.22;
      slot.mesh.position.copy(_beamMid);
      slot.mesh.quaternion.copy(_beamQuat);
      slot.mesh.scale.set(1, len, 1);
      slot.mat.color.set(getTeamHex(beam.team));
      slot.mat.opacity = 0.95;
      slot.mesh.visible = true;

      if (beam.hitPlayerId) {
        onImpactSpark(_beamEnd);
      }
    }

    // Decay active laser beams
    for (const b of beamSlots) {
      if (!b.active) continue;
      b.ageSec += dt;
      if (b.ageSec >= b.maxAgeSec) {
        b.active = false;
        b.mesh.visible = false;
      } else {
        const lifeFrac = 1 - b.ageSec / b.maxAgeSec;
        b.mat.opacity = lifeFrac * 0.95;
        b.mesh.scale.x = 0.4 + lifeFrac * 0.85;
        b.mesh.scale.z = 0.4 + lifeFrac * 0.85;
      }
    }

    // Reconcile remote drone slots
    const activeIds = new Set(remotePoses.keys());
    for (const s of remoteSlots) {
      if (s.assignedId && !activeIds.has(s.assignedId)) {
        s.assignedId = null;
        s.initialized = false;
        s.model.root.visible = false;
      }
    }

    const damp = 1 - Math.exp(-16 * dt);

    for (const pose of remotePoses.values()) {
      let slot = remoteSlots.find((s) => s.assignedId === pose.playerId);
      if (!slot) {
        slot = remoteSlots.find((s) => s.assignedId === null);
        if (!slot) continue;
        slot.assignedId = pose.playerId;
        slot.initialized = false;
      }

      if (pose.eliminated) {
        slot.model.root.visible = false;
        continue;
      }

      slot.targetPos.set(pose.x, pose.y, pose.z);
      slot.targetQuat.set(pose.qx, pose.qy, pose.qz, pose.qw);

      if (!slot.initialized) {
        slot.model.root.position.copy(slot.targetPos);
        slot.model.root.quaternion.copy(slot.targetQuat);
        slot.initialized = true;
      } else {
        slot.model.root.position.lerp(slot.targetPos, damp);
        slot.model.root.quaternion.slerp(slot.targetQuat, damp);
      }

      const hex = getTeamHex(pose.team);
      slot.model.materials.canopy.color.set(hex);
      slot.model.materials.accent.color.set(hex);
      slot.model.materials.led.color.set(pose.isIt ? '#f59e0b' : hex);
      slot.model.materials.led.emissive.set(pose.isIt ? '#f59e0b' : hex);
      slot.model.materials.led.emissiveIntensity = pose.respawnInvuln
        ? 0.4 + Math.sin(elapsedSec * 22) * 0.4
        : 2.2;

      slot.itRing.visible = pose.isIt;
      if (pose.isIt) {
        slot.itRing.rotation.z = elapsedSec * 5.2;
        const pulse = 1 + Math.sin(elapsedSec * 9) * 0.12;
        slot.itRing.scale.setScalar(pulse);
      }

      slot.model.propHubs.forEach((hub, idx) => {
        const dir = idx === 0 || idx === 3 ? 1 : -1;
        hub.rotation.y += dir * 0.72 * dt * 68;
      });
      slot.model.root.visible = true;
    }
  };

  const dispose = () => {
    for (const s of remoteSlots) {
      s.model.dispose();
      s.itRingMat.dispose();
    }
    ringGeo.dispose();
    beamGeo.dispose();
    for (const b of beamSlots) {
      b.mat.dispose();
    }
  };

  return { group, update, dispose };
}
