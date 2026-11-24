import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type {
  CameraView,
  ComputedDroneStats,
  DroneCustomization,
  DroneFrameId,
  FlightMode,
  RatesProfile,
  ScreenMode,
  StickInputs,
  TelemetrySnapshot,
  TrackDef,
} from '../types/game';
import { buildProceduralDroneModel, type DroneModelHandles } from './droneMesh';
import { buildTrackEnvironment, getBiomeAtmosphere, type BuiltTrackScene } from './trackBuilder';
import { createContactShadowTexture } from './proceduralTextures';
import {
  createInitialPhysicsState,
  stepDronePhysics,
  type DronePhysicsState,
} from './physics';
import { fpvAudio } from './audio';
import { sampleTrackTerrainHeight } from '../data/tracks';

export interface FpvViewportProps {
  screenMode: ScreenMode;
  track: TrackDef;
  frameId: DroneFrameId;
  customization: DroneCustomization;
  stats: ComputedDroneStats;
  rates: RatesProfile;
  flightMode: FlightMode;
  cameraView: CameraView;
  touchSticksRef: React.MutableRefObject<StickInputs>;
  raceRunId: number;
  onTelemetry: (snap: TelemetrySnapshot) => void;
  onGatePassed: (gateId: number, isLapComplete: boolean) => void;
  onRaceFinished: (summary: {
    totalTimeMs: number;
    bestLapMs: number;
    lapTimesMs: number[];
    cleanGates: number;
  }) => void;
  onTogglePause: () => void;
  onQuickSwitchCam: () => void;
  onQuickSwitchMode: () => void;
}

// Pre-allocated scratch objects for zero GC inside requestAnimationFrame
const _camOffset = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _tiltQuat = new THREE.Quaternion();
const _axisX = new THREE.Vector3(1, 0, 0);
const _gateVec = new THREE.Vector3();
const _localGate = new THREE.Vector3();
const _invQuat = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

interface ParticleBurstItem {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export const FpvViewport: React.FC<FpvViewportProps> = ({
  screenMode,
  track,
  frameId,
  customization,
  stats,
  rates,
  flightMode,
  cameraView,
  touchSticksRef,
  raceRunId,
  onTelemetry,
  onGatePassed,
  onRaceFinished,
  onTogglePause,
  onQuickSwitchCam,
  onQuickSwitchMode,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Store latest props in refs so the WebGL loop never tears down on UI updates
  const propsRef = useRef({
    screenMode,
    track,
    frameId,
    customization,
    stats,
    rates,
    flightMode,
    cameraView,
    onTelemetry,
    onGatePassed,
    onRaceFinished,
    onTogglePause,
    onQuickSwitchCam,
    onQuickSwitchMode,
  });
  propsRef.current = {
    screenMode,
    track,
    frameId,
    customization,
    stats,
    rates,
    flightMode,
    cameraView,
    onTelemetry,
    onGatePassed,
    onRaceFinished,
    onTogglePause,
    onQuickSwitchCam,
    onQuickSwitchMode,
  };

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    droneHandle: DroneModelHandles | null;
    trackHandle: BuiltTrackScene | null;
    physics: DronePhysicsState;
    sunLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    contactShadow: THREE.Mesh;
    maxAnisotropy: number;
    isSoftwareGl: boolean;
    countdownTimer: number;
    lastCountdownBeep: number;
    elapsedRaceMs: number;
    resetCurrentRace: () => void;
  } | null>(null);

  // Rebuild drone mesh when frame or customization changes without touching renderer
  useEffect(() => {
    const s = sceneRefs.current;
    if (!s) return;

    if (s.droneHandle) {
      s.scene.remove(s.droneHandle.root);
      s.droneHandle.dispose();
    }
    const nextDrone = buildProceduralDroneModel(
      frameId,
      customization,
      s.maxAnisotropy,
      s.isSoftwareGl
    );
    s.scene.add(nextDrone.root);
    s.droneHandle = nextDrone;
  }, [frameId, customization]);

  // Rebuild track environment when track changes
  useEffect(() => {
    const s = sceneRefs.current;
    if (!s) return;

    if (s.trackHandle) {
      s.scene.remove(s.trackHandle.group);
      s.trackHandle.dispose();
    }
    const nextTrack = buildTrackEnvironment(track, s.maxAnisotropy);
    s.scene.add(nextTrack.group);
    s.trackHandle = nextTrack;

    const atmo = getBiomeAtmosphere(track.biome);
    s.scene.background = new THREE.Color(atmo.sky);
    s.scene.fog = new THREE.FogExp2(atmo.sky, atmo.fogDensity);
    s.sunLight.color.setHex(atmo.sunColor);
    s.hemiLight.color.setHex(atmo.hemiSky);
    s.hemiLight.groundColor.setHex(atmo.hemiGround);

    s.resetCurrentRace();
  }, [track]);

  // Reset physics cleanly when a new raceRunId begins
  useEffect(() => {
    const s = sceneRefs.current;
    if (!s) return;
    s.resetCurrentRace();
  }, [raceRunId]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect Software WebGL (SwiftShader/llvmpipe/WARP) strictly for rendering cost
    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    const atmo = getBiomeAtmosphere(propsRef.current.track.biome);
    scene.background = new THREE.Color(atmo.sky);
    scene.fog = new THREE.FogExp2(atmo.sky, atmo.fogDensity);

    // Mandatory RoomEnvironment IBL reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      95,
      (container.clientWidth || window.innerWidth) /
        Math.max(1, container.clientHeight || window.innerHeight),
      0.08,
      900
    );

    // 3-Point Studio / Outdoor Lighting Rig
    const hemiLight = new THREE.HemisphereLight(atmo.hemiSky, atmo.hemiGround, 0.72);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(atmo.sunColor, 1.9);
    sunLight.position.set(85, 140, 65);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    const d = 140;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 380;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.55);
    rimLight.position.set(-70, 55, -85);
    scene.add(rimLight);

    // Contact shadow grounding plane beneath drone
    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(1.4, 1.4);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    scene.add(contactShadow);

    // Pooled Spark / Gate Burst Particles (InstancedMesh, zero GC)
    const particleCount = 60;
    const partGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const partMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const particleMesh = new THREE.InstancedMesh(partGeo, partMat, particleCount);
    particleMesh.frustumCulled = false;
    scene.add(particleMesh);

    const particles: ParticleBurstItem[] = Array.from({ length: particleCount }, () => ({
      active: false,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 0.5,
    }));
    const partDummy = new THREE.Object3D();

    const spawnParticleBurst = (origin: THREE.Vector3, count: number, speed: number) => {
      let spawned = 0;
      for (let i = 0; i < particles.length && spawned < count; i++) {
        if (!particles[i].active) {
          particles[i].active = true;
          particles[i].pos.copy(origin);
          particles[i].vel.set(
            (Math.random() - 0.5) * speed,
            Math.random() * speed * 0.7,
            (Math.random() - 0.5) * speed
          );
          particles[i].life = 0;
          particles[i].maxLife = 0.35 + Math.random() * 0.25;
          spawned++;
        }
      }
    };

    // Build initial track & drone
    const trackHandle = buildTrackEnvironment(propsRef.current.track, maxAnisotropy);
    scene.add(trackHandle.group);

    const droneHandle = buildProceduralDroneModel(
      propsRef.current.frameId,
      propsRef.current.customization,
      maxAnisotropy,
      isSoftwareGl
    );
    scene.add(droneHandle.root);

    const initialPhysics = createInitialPhysicsState(
      propsRef.current.track,
      propsRef.current.stats
    );

    const refsObj = {
      scene,
      renderer,
      camera,
      droneHandle,
      trackHandle,
      physics: initialPhysics,
      sunLight,
      hemiLight,
      contactShadow,
      maxAnisotropy,
      isSoftwareGl,
      countdownTimer: 3.0,
      lastCountdownBeep: 4,
      elapsedRaceMs: 0,
      resetCurrentRace: () => {
        refsObj.physics = createInitialPhysicsState(
          propsRef.current.track,
          propsRef.current.stats
        );
        refsObj.countdownTimer = 2.6;
        refsObj.lastCountdownBeep = 3;
        refsObj.elapsedRaceMs = 0;
      },
    };
    sceneRefs.current = refsObj;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Keyboard state (isolated from React renders, cleared on blur)
    const heldKeys: Record<string, boolean> = {};
    let kbThrottle = 0.28;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      heldKeys[e.code] = true;

      const { screenMode: mode } = propsRef.current;
      if (e.code === 'Escape') {
        if (mode === 'playing' || mode === 'paused') {
          propsRef.current.onTogglePause();
        }
      } else if (mode === 'playing') {
        if (e.code === 'KeyR') {
          refsObj.resetCurrentRace();
          kbThrottle = 0.28;
        } else if (e.code === 'KeyC') {
          propsRef.current.onQuickSwitchCam();
        } else if (e.code === 'KeyM') {
          propsRef.current.onQuickSwitchMode();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      heldKeys[e.code] = false;
    };

    const handleBlur = () => {
      for (const k in heldKeys) {
        heldKeys[k] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    // WebGL context loss/restored listeners
    const onContextLost = (ev: Event) => {
      ev.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = Math.max(1, container.clientHeight || window.innerHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop with Software WebGL pacing
    let frameIdRef = 0;
    let disposed = false;
    const clock = new THREE.Clock();
    let totalElapsed = 0;
    let lastTelemetryPush = 0;
    let finishedSent = false;

    const smoothedChasePos = new THREE.Vector3().copy(initialPhysics.position);

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (sync && status === gl.UNSIGNALED) {
          frameIdRef = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameIdRef = window.setTimeout(cb, 80);
        }
      };
      frameIdRef = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      totalElapsed += dt;

      const {
        screenMode: mode,
        track: activeTrack,
        customization: cust,
        stats: activeStats,
        rates: activeRates,
        flightMode: activeFlightMode,
        cameraView: activeCamView,
      } = propsRef.current;

      const phys = refsObj.physics;

      // Combine keyboard + touch controller stick inputs
      const touch = touchSticksRef.current;
      const kbActive =
        heldKeys['KeyW'] ||
        heldKeys['KeyS'] ||
        heldKeys['KeyA'] ||
        heldKeys['KeyD'] ||
        heldKeys['ArrowUp'] ||
        heldKeys['ArrowDown'] ||
        heldKeys['ArrowLeft'] ||
        heldKeys['ArrowRight'] ||
        heldKeys['Space'];

      if (heldKeys['KeyW'] || heldKeys['Space']) {
        kbThrottle = Math.min(1, kbThrottle + dt * 0.72);
      }
      if (heldKeys['KeyS'] || heldKeys['ShiftLeft']) {
        kbThrottle = Math.max(0, kbThrottle - dt * 0.78);
      }

      const combinedSticks: StickInputs = {
        throttle: kbActive ? Math.max(touch.throttle, kbThrottle) : touch.throttle,
        yaw:
          (heldKeys['KeyD'] ? 1 : 0) -
          (heldKeys['KeyA'] ? 1 : 0) || touch.yaw,
        pitch:
          (heldKeys['ArrowUp'] ? 1 : 0) -
          (heldKeys['ArrowDown'] ? 1 : 0) || touch.pitch,
        roll:
          (heldKeys['ArrowRight'] ? 1 : 0) -
          (heldKeys['ArrowLeft'] ? 1 : 0) || touch.roll,
      };

      if (mode === 'playing') {
        if (refsObj.countdownTimer > 0) {
          refsObj.countdownTimer = Math.max(0, refsObj.countdownTimer - dt);
          const ceilSec = Math.ceil(refsObj.countdownTimer);
          if (ceilSec < refsObj.lastCountdownBeep && ceilSec > 0) {
            refsObj.lastCountdownBeep = ceilSec;
            fpvAudio.playCountdownBeep(false);
          } else if (refsObj.countdownTimer === 0 && refsObj.lastCountdownBeep > 0) {
            refsObj.lastCountdownBeep = 0;
            fpvAudio.playCountdownBeep(true);
            finishedSent = false;
          }
          // Hover gently on start pad during countdown
          phys.motorRpms = [0.22, 0.22, 0.22, 0.22];
          fpvAudio.updateFlightSound(true, 0.16, 0, 0.22);
        } else {
          refsObj.elapsedRaceMs += dt * 1000;
          stepDronePhysics(
            phys,
            combinedSticks,
            activeStats,
            activeRates,
            activeFlightMode,
            activeTrack,
            dt,
            refsObj.elapsedRaceMs,
            {
              onGatePassed: (gateId, isLapComplete) => {
                fpvAudio.playGatePass(isLapComplete);
                const gObj = activeTrack.gates[phys.currentGateIndex];
                if (gObj) {
                  _gateVec.set(gObj.position[0], gObj.position[1], gObj.position[2]);
                  spawnParticleBurst(_gateVec, 16, 12);
                }
                propsRef.current.onGatePassed(gateId, isLapComplete);
              },
              onImpact: (severity, impactPos) => {
                fpvAudio.playImpact(severity);
                spawnParticleBurst(impactPos, 18, 10 + severity * 12);
              },
              onRaceFinished: () => {
                if (!finishedSent) {
                  finishedSent = true;
                  propsRef.current.onRaceFinished({
                    totalTimeMs: refsObj.elapsedRaceMs,
                    bestLapMs: phys.bestLapMs ?? refsObj.elapsedRaceMs,
                    lapTimesMs: [...phys.lapTimesMs],
                    cleanGates: phys.cleanGates,
                  });
                }
              },
            }
          );

          const avgRpm =
            (phys.motorRpms[0] + phys.motorRpms[1] + phys.motorRpms[2] + phys.motorRpms[3]) *
            0.25;
          fpvAudio.updateFlightSound(
            phys.armed,
            combinedSticks.throttle,
            phys.velocity.length(),
            avgRpm
          );
        }
      } else {
        fpvAudio.updateFlightSound(false, 0, 0, 0);
      }

      // Spin propellers visually
      if (refsObj.droneHandle) {
        const dh = refsObj.droneHandle;
        dh.propHubs.forEach((hub, idx) => {
          const rpm = mode === 'playing' ? phys.motorRpms[idx] : 0.35;
          const dir = idx === 0 || idx === 3 ? 1 : -1;
          hub.rotation.y += dir * rpm * dt * 68;
          dh.propBlurDiscs[idx].visible = rpm > 0.32;
          dh.materials.blurDisc.opacity = THREE.MathUtils.clamp((rpm - 0.25) * 0.26, 0.04, 0.24);
        });

        // Position drone mesh
        if (mode === 'title' || mode === 'garage') {
          const firstGate = activeTrack.gates[0];
          const h = firstGate ? firstGate.headingRad : 0;
          const sx = firstGate ? firstGate.position[0] - Math.sin(h) * 16 : 0;
          const sz = firstGate ? firstGate.position[2] - Math.cos(h) * 16 : 0;
          const gy = sampleTrackTerrainHeight(sx, sz, activeTrack);
          const hoverY = gy + 1.35 + Math.sin(totalElapsed * 2.2) * 0.08;
          dh.root.position.set(sx, hoverY, sz);
          dh.root.rotation.set(
            Math.sin(totalElapsed * 1.3) * 0.04,
            h + Math.PI + totalElapsed * 0.38,
            Math.cos(totalElapsed * 1.1) * 0.04
          );
          dh.root.visible = true;

          // Contact shadow under hovering showcase drone
          refsObj.contactShadow.position.set(sx, gy + 0.06, sz);
          refsObj.contactShadow.visible = true;

          // Cinematic orbit camera on Title / Hangar
          const orbitRadius = mode === 'garage' ? 0.62 : 1.05;
          const orbitAng = totalElapsed * 0.28 + 0.6;
          const targetCamX = sx + Math.sin(orbitAng) * orbitRadius;
          const targetCamZ = sz + Math.cos(orbitAng) * orbitRadius;
          const targetCamY = hoverY + (mode === 'garage' ? 0.24 : 0.36);

          const damp = 1 - Math.exp(-5.0 * dt);
          camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, damp);
          camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, damp);
          camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, damp);
          _lookTarget.set(sx, hoverY + 0.03, sz);
          camera.lookAt(_lookTarget);
          if (Math.abs(camera.fov - 52) > 0.2) {
            camera.fov = THREE.MathUtils.lerp(camera.fov, 52, damp);
            camera.updateProjectionMatrix();
          }
        } else {
          // Playing / Paused / Results / Worldmap backdrop
          dh.root.position.copy(phys.position);
          dh.root.quaternion.copy(phys.quaternion);

          const gy = sampleTrackTerrainHeight(phys.position.x, phys.position.z, activeTrack);
          const agl = Math.max(0, phys.position.y - gy);
          refsObj.contactShadow.position.set(phys.position.x, gy + 0.05, phys.position.z);
          refsObj.contactShadow.scale.setScalar(1 + Math.min(2, agl * 0.35));
          (refsObj.contactShadow.material as THREE.MeshBasicMaterial).opacity =
            THREE.MathUtils.clamp(0.48 - agl * 0.08, 0, 0.48);
          refsObj.contactShadow.visible = agl < 5.5;

          const speed = phys.velocity.length();
          const shakeX = phys.shakeIntensity > 0 ? (Math.random() - 0.5) * 0.14 * phys.shakeIntensity : 0;
          const shakeY = phys.shakeIntensity > 0 ? (Math.random() - 0.5) * 0.14 * phys.shakeIntensity : 0;

          if (activeCamView === 'fpv') {
            dh.root.visible = false; // Clean unobstructed FPV lens view
            _camOffset.set(0, 0.06, -0.09).applyQuaternion(phys.quaternion);
            camera.position.copy(phys.position).add(_camOffset);
            camera.position.x += shakeX;
            camera.position.y += shakeY;

            _tiltQuat.setFromAxisAngle(
              _axisX,
              THREE.MathUtils.degToRad(cust.cameraTiltDeg)
            );
            camera.quaternion.copy(phys.quaternion).multiply(_tiltQuat);

            const targetFov = 92 + Math.min(22, speed * 0.45);
            if (Math.abs(camera.fov - targetFov) > 0.1) {
              camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.exp(-8 * dt));
              camera.updateProjectionMatrix();
            }
          } else {
            dh.root.visible = true;
            _forward.set(0, 0, -1).applyQuaternion(phys.quaternion).normalize();
            _camTargetPos
              .copy(phys.position)
              .addScaledVector(_forward, -1.65)
              .add(new THREE.Vector3(0, 0.58, 0));

            const camGround = sampleTrackTerrainHeight(_camTargetPos.x, _camTargetPos.z, activeTrack);
            if (_camTargetPos.y < camGround + 0.45) {
              _camTargetPos.y = camGround + 0.45;
            }

            const chaseDamp = 1 - Math.exp(-12 * dt);
            smoothedChasePos.lerp(_camTargetPos, chaseDamp);
            camera.position.copy(smoothedChasePos);
            camera.position.x += shakeX;
            camera.position.y += shakeY;

            _lookTarget.copy(phys.position).addScaledVector(_forward, 4.0);
            camera.lookAt(_lookTarget);

            const targetFov = 78 + Math.min(18, speed * 0.35);
            if (Math.abs(camera.fov - targetFov) > 0.1) {
              camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.exp(-8 * dt));
              camera.updateProjectionMatrix();
            }
          }
        }
      }

      // Update active gate beacon & highlight
      if (refsObj.trackHandle) {
        refsObj.trackHandle.updateActiveGate(phys.currentGateIndex, totalElapsed);
      }

      // Update pooled particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.active) {
          p.life += dt;
          if (p.life >= p.maxLife) {
            p.active = false;
            partDummy.scale.setScalar(0);
          } else {
            p.vel.y -= 9.8 * dt;
            p.pos.addScaledVector(p.vel, dt);
            partDummy.position.copy(p.pos);
            partDummy.scale.setScalar(1 - p.life / p.maxLife);
          }
        } else {
          partDummy.scale.setScalar(0);
        }
        partDummy.updateMatrix();
        particleMesh.setMatrixAt(i, partDummy.matrix);
      }
      particleMesh.instanceMatrix.needsUpdate = true;

      // Push throttled telemetry snapshot (~20Hz) to HUD
      if (mode === 'playing' && totalElapsed - lastTelemetryPush >= 0.05) {
        lastTelemetryPush = totalElapsed;
        const g = activeTrack.gates[phys.currentGateIndex];
        let gateArrowAngle = 0;
        let gateDist = 0;
        if (g) {
          _gateVec.set(g.position[0], g.position[1], g.position[2]);
          gateDist = phys.position.distanceTo(_gateVec);
          _invQuat.copy(phys.quaternion).invert();
          _localGate.copy(_gateVec).sub(phys.position).applyQuaternion(_invQuat);
          gateArrowAngle = Math.atan2(_localGate.x, -_localGate.z);
        }
        _euler.setFromQuaternion(phys.quaternion, 'YXZ');
        const groundAtDrone = sampleTrackTerrainHeight(
          phys.position.x,
          phys.position.z,
          activeTrack
        );

        propsRef.current.onTelemetry({
          speedKmh: Math.round(phys.velocity.length() * 3.6),
          altitudeM: Math.max(0, Number((phys.position.y - groundAtDrone).toFixed(1))),
          verticalSpeedMs: Number(phys.velocity.y.toFixed(1)),
          throttlePct: Math.round(combinedSticks.throttle * 100),
          voltageV: phys.voltageV,
          batteryPct: Math.round(
            (phys.batteryRemainingWh / Math.max(1, activeStats.batteryWh)) * 100
          ),
          pitchDeg: Math.round(THREE.MathUtils.radToDeg(_euler.x)),
          rollDeg: Math.round(THREE.MathUtils.radToDeg(_euler.z)),
          headingDeg: Math.round(
            ((THREE.MathUtils.radToDeg(-_euler.y) % 360) + 360) % 360
          ),
          currentLap: phys.currentLap,
          totalLaps: activeTrack.lapCount,
          currentGateIndex: phys.currentGateIndex,
          totalGates: activeTrack.gates.length,
          lapTimeMs: Math.max(0, refsObj.elapsedRaceMs - phys.lapStartTimeMs),
          totalTimeMs: refsObj.elapsedRaceMs,
          bestLapMs: phys.bestLapMs,
          lastSplitDeltaMs: phys.lastSplitDeltaMs,
          gateArrowAngleRad: gateArrowAngle,
          gateDistM: Math.round(gateDist),
          motorRpms: phys.motorRpms,
          armed: phys.armed,
          crashed: phys.crashCooldown > 0,
          countdownSec: Math.ceil(refsObj.countdownTimer),
        });
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameIdRef = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameIdRef = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameIdRef);
      clearTimeout(frameIdRef);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

      refsObj.droneHandle?.dispose();
      refsObj.trackHandle?.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTex.dispose();
      partGeo.dispose();
      partMat.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [touchSticksRef]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-zinc-950"
    />
  );
};
