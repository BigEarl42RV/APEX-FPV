/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type {
  CameraView,
  ComputedDroneStats,
  DroneCustomization,
  DroneFrameId,
  DroneVisualBlueprint,
  FlightMode,
  GamepadConfig,
  GhostKeyframe,
  GhostRecording,
  GoggleFeedMode,
  GraphicsQuality,
  RatesProfile,
  ScreenMode,
  StickInputs,
  TelemetrySnapshot,
  TrackDef,
} from '../types/game';
import { buildProceduralDroneModel, type DroneModelHandles } from './droneMesh';
import {
  buildTrackEnvironment,
  getBiomeAtmosphere,
  type BuiltTrackScene,
} from './trackBuilder';
import { createContactShadowTexture } from './proceduralTextures';
import {
  createInitialPhysicsState,
  stepDronePhysics,
  type DronePhysicsState,
} from './physics';
import { fpvAudio } from './audio';
import { sampleTrackTerrainHeight } from '../data/tracks';
import { createGamepadPollOut, pollGamepadInto } from './gamepad';
import { sampleGhostPoseAtTimeInto } from '../data/progression';
import {
  buildAtmosphericSkyDome,
  buildGhostDroneMesh,
  createAeroTrailSystem,
  createGateShockwavePool,
  createSpeedLinesEffect,
  type AeroRibbonHandle,
  type AtmosphericSkyHandle,
  type GhostDroneHandle,
  type ShockwavePoolHandle,
  type SpeedLinesHandle,
} from './skyAndEffects';
import {
  createMultiplayerVisualSystem,
  type MultiplayerVisualSystem,
} from './multiplayerVisuals';
import type {
  LaserBeamVisual,
  MultiplayerModeId,
  MultiplayerPose,
} from '../types/multiplayer';

export interface MultiplayerViewportConfig {
  active: boolean;
  mode: MultiplayerModeId;
  localPlayerId: string | null;
  spectatingFollowLeader: boolean;
  spectateTargetId: string | null;
  laserCooldownMs: number;
  arenaSpawnIndex: number;
  arenaTotalSlots: number;
  remotePoses: Map<string, MultiplayerPose>;
  pendingLaserBeams: LaserBeamVisual[];
  fireTriggerRef?: React.MutableRefObject<(() => void) | null>;
  onPublishPose: (pose: {
    x: number;
    y: number;
    z: number;
    qx: number;
    qy: number;
    qz: number;
    qw: number;
    vx: number;
    vy: number;
    vz: number;
    lap: number;
    gateIndex: number;
  }) => void;
  onFireLaser: (
    origin: [number, number, number],
    dir: [number, number, number]
  ) => void;
  onReportProgress: (lap: number, gateIndex: number, cleanGates: number) => void;
}

export interface FpvViewportProps {
  screenMode: ScreenMode;
  track: TrackDef;
  frameId: DroneFrameId;
  visualBlueprint?: DroneVisualBlueprint;
  benchInspectActive?: boolean;
  benchExploded?: boolean;
  benchCameraResetKey?: number;
  customization: DroneCustomization;
  stats: ComputedDroneStats;
  rates: RatesProfile;
  flightMode: FlightMode;
  cameraView: CameraView;
  gamepadConfig: GamepadConfig;
  graphicsQuality: GraphicsQuality;
  maxDpr?: number;
  goggleMode: GoggleFeedMode;
  racingLineEnabled: boolean;
  propwashDamping: number;
  activeGhost: GhostRecording | null;
  multiplayer?: MultiplayerViewportConfig | null;
  touchSticksRef: React.MutableRefObject<StickInputs>;
  raceRunId: number;
  onTelemetry: (snap: TelemetrySnapshot) => void;
  onGatePassed: (gateId: number, isLapComplete: boolean) => void;
  onRaceFinished: (summary: {
    totalTimeMs: number;
    bestLapMs: number;
    lapTimesMs: number[];
    cleanGates: number;
    maxSpeedKmh: number;
    flightDurationSec: number;
    distanceKm: number;
    recordedGhostFrames: GhostKeyframe[];
  }) => void;
  onFlightSessionAccumulate?: (
    flightSeconds: number,
    distanceKm: number,
    maxSpeedKmh: number
  ) => void;
  onTogglePause: () => void;
  onQuickSwitchCam: () => void;
  onQuickSwitchMode: () => void;
  onQuickToggleHud?: () => void;
  onGamepadStatus?: (status: { connected: boolean; id: string }) => void;
}

// Pre-allocated scratch objects for zero GC inside requestAnimationFrame
const _camOffset = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _chaseLift = new THREE.Vector3(0, 0.58, 0);
const _tiltQuat = new THREE.Quaternion();
const _axisX = new THREE.Vector3(1, 0, 0);
const _gateVec = new THREE.Vector3();
const _prevGateVec = new THREE.Vector3();
const _localGate = new THREE.Vector3();
const _invQuat = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _tipLeft = new THREE.Vector3();
const _tipRight = new THREE.Vector3();
const _ghostPos = new THREE.Vector3();
const _ghostQuat = new THREE.Quaternion();

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
  visualBlueprint,
  benchInspectActive = false,
  benchExploded = false,
  benchCameraResetKey = 0,
  customization,
  stats,
  rates,
  flightMode,
  cameraView,
  gamepadConfig,
  graphicsQuality,
  maxDpr = 2,
  goggleMode,
  racingLineEnabled,
  propwashDamping,
  activeGhost = null,
  multiplayer = null,
  touchSticksRef,
  raceRunId,
  onTelemetry,
  onGatePassed,
  onRaceFinished,
  onFlightSessionAccumulate,
  onTogglePause,
  onQuickSwitchCam,
  onQuickSwitchMode,
  onQuickToggleHud,
  onGamepadStatus,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const propsRef = useRef({
    screenMode,
    track,
    frameId,
    visualBlueprint,
    benchInspectActive,
    benchExploded,
    customization,
    stats,
    rates,
    flightMode,
    cameraView,
    gamepadConfig,
    graphicsQuality,
    maxDpr,
    goggleMode,
    racingLineEnabled,
    propwashDamping,
    activeGhost,
    multiplayer,
    onTelemetry,
    onGatePassed,
    onRaceFinished,
    onFlightSessionAccumulate,
    onTogglePause,
    onQuickSwitchCam,
    onQuickSwitchMode,
    onQuickToggleHud,
    onGamepadStatus,
  });
  propsRef.current = {
    screenMode,
    track,
    frameId,
    visualBlueprint,
    benchInspectActive,
    benchExploded,
    customization,
    stats,
    rates,
    flightMode,
    cameraView,
    gamepadConfig,
    graphicsQuality,
    maxDpr,
    goggleMode,
    racingLineEnabled,
    propwashDamping,
    activeGhost,
    multiplayer,
    onTelemetry,
    onGatePassed,
    onRaceFinished,
    onFlightSessionAccumulate,
    onTogglePause,
    onQuickSwitchCam,
    onQuickSwitchMode,
    onQuickToggleHud,
    onGamepadStatus,
  };

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer | null;
    bloomPass: UnrealBloomPass | null;
    camera: THREE.PerspectiveCamera;
    droneHandle: DroneModelHandles | null;
    trackHandle: BuiltTrackScene | null;
    skyHandle: AtmosphericSkyHandle;
    aeroTrails: AeroRibbonHandle;
    shockwaves: ShockwavePoolHandle;
    speedLines: SpeedLinesHandle;
    ghostMesh: GhostDroneHandle;
    mpVisuals: MultiplayerVisualSystem;
    physics: DronePhysicsState;
    sunLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    contactShadow: THREE.Mesh;
    maxAnisotropy: number;
    isSoftwareGl: boolean;
    countdownTimer: number;
    lastCountdownBeep: number;
    elapsedRaceMs: number;
    lastGhostSampleMs: number;
    recordedGhostFrames: GhostKeyframe[];
    resetCurrentRace: () => void;
  } | null>(null);

  const benchOrbitRef = useRef({
    yaw: 0.65,
    pitch: 0.34,
    distance: 0.62,
    dragging: false,
    userInteracted: false,
    lastX: 0,
    lastY: 0,
    explodedValue: 0,
  });

  useEffect(() => {
    benchOrbitRef.current.yaw = 0.65;
    benchOrbitRef.current.pitch = 0.34;
    benchOrbitRef.current.distance = 0.62;
    benchOrbitRef.current.userInteracted = false;
  }, [benchCameraResetKey]);

  // Rebuild drone mesh only when frame or structural blueprint changes
  useEffect(() => {
    const s = sceneRefs.current;
    if (!s) return;

    if (s.droneHandle) {
      s.scene.remove(s.droneHandle.root);
      s.droneHandle.dispose();
    }
    const cust = propsRef.current.customization;
    const nextDrone = buildProceduralDroneModel(
      frameId,
      cust,
      s.maxAnisotropy,
      s.isSoftwareGl,
      visualBlueprint
    );
    nextDrone.setExploded(benchOrbitRef.current.explodedValue);
    s.scene.add(nextDrone.root);
    s.droneHandle = nextDrone;
    s.aeroTrails.setColor(cust.ledColor);
  }, [frameId, visualBlueprint]);

  // Live zero-GC material & camera-tilt updates for smooth 60fps color picker scrubbing
  useEffect(() => {
    const s = sceneRefs.current;
    if (!s || !s.droneHandle) return;
    const dh = s.droneHandle;
    dh.materials.frame.color.set(customization.frameColor ?? '#27272a');
    dh.setFrameFinish(customization.frameFinish ?? 'matte');
    dh.materials.canopy.color.set(customization.canopyColor);
    dh.materials.accent.color.set(customization.armAccentColor);
    dh.materials.prop.color.set(customization.propColor);
    dh.materials.blurDisc.color.set(customization.propColor);
    dh.materials.led.color.set(customization.ledColor);
    dh.materials.led.emissive.set(customization.ledColor);
    dh.setCameraTilt(customization.cameraTiltDeg);
    s.aeroTrails.setColor(customization.ledColor);
  }, [customization]);

  // Rebuild track environment when track changes
  useEffect(() => {
    const s = sceneRefs.current;
    if (!s) return;

    if (s.trackHandle) {
      s.scene.remove(s.trackHandle.group);
      s.trackHandle.dispose();
    }
    const nextTrack = buildTrackEnvironment(track, s.maxAnisotropy);
    nextTrack.setRacingLineVisible(propsRef.current.racingLineEnabled);
    nextTrack.setWaterVisible(propsRef.current.graphicsQuality !== 'performance');
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

  // Apply Quality Preset & Avionics HUD toggles live without tearing down scene
  useEffect(() => {
    const s = sceneRefs.current;
    if (!s) return;

    const isPerf = graphicsQuality === 'performance' || s.isSoftwareGl;
    const cap = Math.max(1, maxDpr);
    const targetDpr = s.isSoftwareGl
      ? 1
      : graphicsQuality === 'ultra'
        ? Math.min(window.devicePixelRatio, cap)
        : graphicsQuality === 'high'
          ? Math.min(window.devicePixelRatio, Math.min(cap, 1.5))
          : 1;

    s.renderer.setPixelRatio(targetDpr);
    const w = s.renderer.domElement.parentElement?.clientWidth || window.innerWidth;
    const h = Math.max(1, s.renderer.domElement.parentElement?.clientHeight || window.innerHeight);
    s.renderer.setSize(w, h);
    s.composer?.setSize(w, h);

    s.renderer.shadowMap.enabled = !isPerf;
    s.sunLight.castShadow = !isPerf;

    if (s.bloomPass) {
      s.bloomPass.enabled = !isPerf;
      s.bloomPass.strength = graphicsQuality === 'ultra' ? 0.62 : 0.42;
      s.bloomPass.radius = graphicsQuality === 'ultra' ? 0.48 : 0.34;
    }

    s.renderer.toneMappingExposure =
      goggleMode === 'action-raw' ? 1.18 : goggleMode === 'analog-raceband' ? 1.03 : 1.09;

    s.trackHandle?.setRacingLineVisible(racingLineEnabled);
    s.trackHandle?.setWaterVisible(graphicsQuality !== 'performance');
    s.aeroTrails.group.visible = graphicsQuality !== 'performance';
  }, [graphicsQuality, maxDpr, goggleMode, racingLineEnabled]);

  // Update ghost hologram tint when rival type changes
  useEffect(() => {
    const s = sceneRefs.current;
    if (!s || !activeGhost) return;
    s.ghostMesh.setModeColor(Boolean(activeGhost.isProTarget));
  }, [activeGhost]);

  // Reset physics cleanly when a new raceRunId begins
  useEffect(() => {
    const s = sceneRefs.current;
    if (!s) return;
    s.resetCurrentRace();
  }, [raceRunId]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

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

    const initQuality = propsRef.current.graphicsQuality;
    const initPerf = initQuality === 'performance' || isSoftwareGl;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.09;
    const cap = Math.max(1, propsRef.current.maxDpr);
    renderer.setPixelRatio(
      isSoftwareGl
        ? 1
        : initQuality === 'ultra'
          ? Math.min(window.devicePixelRatio, cap)
          : initQuality === 'high'
            ? Math.min(window.devicePixelRatio, Math.min(cap, 1.5))
            : 1
    );

    const initW = container.clientWidth || window.innerWidth;
    const initH = Math.max(1, container.clientHeight || window.innerHeight);
    renderer.setSize(initW, initH);
    renderer.shadowMap.enabled = !initPerf;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
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

    const camera = new THREE.PerspectiveCamera(95, initW / initH, 0.08, 950);

    // Post-processing EffectComposer with selective high-threshold UnrealBloom + OutputPass (GPU only)
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(Math.max(1, Math.floor(initW / 2)), Math.max(1, Math.floor(initH / 2))),
        initQuality === 'ultra' ? 0.62 : 0.42,
        0.44,
        0.86
      );
      bloomPass.enabled = !initPerf;
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }

    // Dynamic GLSL Atmospheric Sky Dome
    const skyHandle = buildAtmosphericSkyDome(propsRef.current.track.biome);
    scene.add(skyHandle.mesh);

    // 3-Point Studio / Outdoor Lighting Rig
    const hemiLight = new THREE.HemisphereLight(atmo.hemiSky, atmo.hemiGround, 0.78);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(atmo.sunColor, 2.05);
    sunLight.position.set(85, 140, 65);
    sunLight.castShadow = !initPerf;
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

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.62);
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

    // Wingtip Aero Trails, Gate Shockwaves, Speed Lines & Holographic Ghost Rival
    const aeroTrails = createAeroTrailSystem(propsRef.current.customization.ledColor);
    aeroTrails.group.visible = initQuality !== 'performance';
    scene.add(aeroTrails.group);

    const shockwaves = createGateShockwavePool();
    scene.add(shockwaves.group);

    const speedLines = createSpeedLinesEffect();
    scene.add(speedLines.lines);

    const ghostMesh = buildGhostDroneMesh();
    if (propsRef.current.activeGhost) {
      ghostMesh.setModeColor(Boolean(propsRef.current.activeGhost.isProTarget));
    }
    scene.add(ghostMesh.root);

    const mpVisuals = createMultiplayerVisualSystem(maxAnisotropy, isSoftwareGl);
    scene.add(mpVisuals.group);

    // Build initial track & drone
    const trackHandle = buildTrackEnvironment(propsRef.current.track, maxAnisotropy);
    trackHandle.setRacingLineVisible(propsRef.current.racingLineEnabled);
    trackHandle.setWaterVisible(initQuality !== 'performance');
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
    aeroTrails.reset(initialPhysics.position);

    let unflushedFlightSec = 0;
    let unflushedDistM = 0;
    let unflushedMaxSpeedKmh = 0;
    let wasPlayingMode = false;

    const flushUnflushedFlight = () => {
      if (unflushedFlightSec >= 2) {
        propsRef.current.onFlightSessionAccumulate?.(
          Number(unflushedFlightSec.toFixed(1)),
          Number((unflushedDistM / 1000).toFixed(3)),
          Math.round(unflushedMaxSpeedKmh)
        );
      }
      unflushedFlightSec = 0;
      unflushedDistM = 0;
      unflushedMaxSpeedKmh = 0;
    };

    const refsObj = {
      scene,
      renderer,
      composer,
      bloomPass,
      camera,
      droneHandle,
      trackHandle,
      skyHandle,
      aeroTrails,
      shockwaves,
      speedLines,
      ghostMesh,
      mpVisuals,
      physics: initialPhysics,
      sunLight,
      hemiLight,
      contactShadow,
      maxAnisotropy,
      isSoftwareGl,
      countdownTimer: 2.6,
      lastCountdownBeep: 3,
      elapsedRaceMs: 0,
      lastGhostSampleMs: -100,
      recordedGhostFrames: [] as GhostKeyframe[],
      resetCurrentRace: () => {
        flushUnflushedFlight();
        const mp = propsRef.current.multiplayer;
        const freshPhys = createInitialPhysicsState(
          propsRef.current.track,
          propsRef.current.stats
        );
        if (
          mp?.active &&
          (mp.mode === 'laser-tag' || mp.mode === 'drone-tag')
        ) {
          const idx = Math.max(0, mp.arenaSpawnIndex);
          const total = Math.max(2, mp.arenaTotalSlots);
          const ang = (idx / total) * Math.PI * 2;
          const radius = 58 + (idx % 2) * 18;
          const sx = Math.cos(ang) * radius;
          const sz = Math.sin(ang) * radius;
          const gy = sampleTrackTerrainHeight(sx, sz, propsRef.current.track);
          freshPhys.position.set(sx, gy + 7.5, sz);
          freshPhys.prevPosition.copy(freshPhys.position);
          freshPhys.quaternion.setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            Math.atan2(-sx, -sz) + Math.PI
          );
        } else if (mp?.active && mp.arenaSpawnIndex > 0) {
          const g0 = propsRef.current.track.gates[0];
          const h = g0 ? g0.headingRad : 0;
          const rightX = Math.cos(h);
          const rightZ = -Math.sin(h);
          const fwdX = Math.sin(h);
          const fwdZ = Math.cos(h);
          const col = (mp.arenaSpawnIndex % 4) - 1.5;
          const row = Math.floor(mp.arenaSpawnIndex / 4);
          freshPhys.position.x += rightX * (col * 2.8) - fwdX * (row * 3.2);
          freshPhys.position.z += rightZ * (col * 2.8) - fwdZ * (row * 3.2);
          freshPhys.prevPosition.copy(freshPhys.position);
        }
        refsObj.physics = freshPhys;
        refsObj.countdownTimer = mp?.active ? 0.8 : 2.6;
        refsObj.lastCountdownBeep = mp?.active ? 1 : 3;
        refsObj.elapsedRaceMs = 0;
        refsObj.lastGhostSampleMs = -100;
        refsObj.recordedGhostFrames = [];
        refsObj.aeroTrails.reset(refsObj.physics.position);
      },
    };
    sceneRefs.current = refsObj;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Keyboard & Combat Pulse state
    const heldKeys: Record<string, boolean> = {};
    let kbThrottle = 0.28;
    let lastLocalFirePerfMs = 0;

    const tryFireMultiplayerPulse = () => {
      const mp = propsRef.current.multiplayer;
      if (
        propsRef.current.screenMode !== 'playing' ||
        !mp?.active ||
        mp.spectatingFollowLeader ||
        (mp.mode !== 'laser-tag' && mp.mode !== 'drone-tag') ||
        refsObj.countdownTimer > 0
      ) {
        return;
      }
      const nowPerf = performance.now();
      if (nowPerf - lastLocalFirePerfMs < Math.max(220, mp.laserCooldownMs)) {
        return;
      }
      lastLocalFirePerfMs = nowPerf;
      const phys = refsObj.physics;
      _tiltQuat.setFromAxisAngle(
        _axisX,
        THREE.MathUtils.degToRad(propsRef.current.customization.cameraTiltDeg)
      );
      _forward
        .set(0, 0, -1)
        .applyQuaternion(phys.quaternion.clone().multiply(_tiltQuat))
        .normalize();
      mp.onFireLaser(
        [phys.position.x, phys.position.y + 0.05, phys.position.z],
        [_forward.x, _forward.y, _forward.z]
      );
    };

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
        } else if (e.code === 'KeyH') {
          propsRef.current.onQuickToggleHud?.();
        } else if (e.code === 'KeyF') {
          tryFireMultiplayerPulse();
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

    const onContextLost = (ev: Event) => {
      ev.preventDefault();
    };
    const onCanvasContextMenu = (ev: MouseEvent) => {
      ev.preventDefault();
    };
    const onCanvasPointerDown = (ev: PointerEvent) => {
      if (
        propsRef.current.screenMode === 'playing' &&
        ev.pointerType !== 'touch' &&
        ev.button === 0
      ) {
        tryFireMultiplayerPulse();
        return;
      }
      if (propsRef.current.screenMode !== 'garage') return;
      benchOrbitRef.current.dragging = true;
      benchOrbitRef.current.userInteracted = true;
      benchOrbitRef.current.lastX = ev.clientX;
      benchOrbitRef.current.lastY = ev.clientY;
    };
    const onWindowPointerMove = (ev: PointerEvent) => {
      const orbit = benchOrbitRef.current;
      if (!orbit.dragging || propsRef.current.screenMode !== 'garage') return;
      const dx = ev.clientX - orbit.lastX;
      const dy = ev.clientY - orbit.lastY;
      orbit.lastX = ev.clientX;
      orbit.lastY = ev.clientY;
      orbit.yaw -= dx * 0.0085;
      orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + dy * 0.0065, -0.35, 1.2);
    };
    const onWindowPointerUp = () => {
      benchOrbitRef.current.dragging = false;
    };
    const onCanvasWheel = (ev: WheelEvent) => {
      if (propsRef.current.screenMode !== 'garage') return;
      ev.preventDefault();
      benchOrbitRef.current.distance = THREE.MathUtils.clamp(
        benchOrbitRef.current.distance + ev.deltaY * 0.0005,
        0.38,
        1.25
      );
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('contextmenu', onCanvasContextMenu);
    renderer.domElement.addEventListener('pointerdown', onCanvasPointerDown);
    renderer.domElement.addEventListener('wheel', onCanvasWheel, { passive: false });
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = Math.max(1, container.clientHeight || window.innerHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => handleResize())
        : null;
    resizeObserver?.observe(container);

    // Animation loop with Software WebGL pacing
    let frameIdRef = 0;
    let disposed = false;
    const clock = new THREE.Clock();
    let totalElapsed = 0;
    let lastTelemetryPush = 0;
    let finishedSent = false;

    const gamepadOut = createGamepadPollOut();
    const gamepadPrevButtons: boolean[] = [];
    let lastReportedPadConnected = false;
    let lastReportedPadId = '';

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
        gamepadConfig: activeGamepadConfig,
        graphicsQuality: quality,
        propwashDamping: fwDamping,
        activeGhost: ghostRec,
        multiplayer: mpConfig,
      } = propsRef.current;

      if (mpConfig?.fireTriggerRef) {
        mpConfig.fireTriggerRef.current = tryFireMultiplayerPulse;
      }

      const phys = refsObj.physics;

      // Poll hardware USB RC transmitter / Gamepad at 60fps
      pollGamepadInto(activeGamepadConfig, gamepadPrevButtons, gamepadOut);
      if (
        gamepadOut.connected !== lastReportedPadConnected ||
        gamepadOut.id !== lastReportedPadId
      ) {
        lastReportedPadConnected = gamepadOut.connected;
        lastReportedPadId = gamepadOut.id;
        propsRef.current.onGamepadStatus?.({
          connected: gamepadOut.connected,
          id: gamepadOut.id,
        });
      }

      if (gamepadOut.triggerPause && (mode === 'playing' || mode === 'paused')) {
        propsRef.current.onTogglePause();
      }
      if (mode === 'playing') {
        if (gamepadOut.triggerSwitchCam) propsRef.current.onQuickSwitchCam();
        if (gamepadOut.triggerCycleMode) propsRef.current.onQuickSwitchMode();
        if (gamepadOut.triggerFire) tryFireMultiplayerPulse();
        if (gamepadOut.triggerReset) {
          refsObj.resetCurrentRace();
          kbThrottle = 0.28;
        }
      }

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

      const useGamepad =
        gamepadOut.connected &&
        activeGamepadConfig.enabled &&
        (gamepadOut.active || activeGamepadConfig.preset === 'rc-radio') &&
        !kbActive;

      const combinedSticks: StickInputs = {
        throttle: kbActive
          ? Math.max(touch.throttle, kbThrottle)
          : useGamepad
            ? gamepadOut.sticks.throttle
            : touch.throttle,
        yaw:
          (heldKeys['KeyD'] ? 1 : 0) - (heldKeys['KeyA'] ? 1 : 0) ||
          (useGamepad ? gamepadOut.sticks.yaw : 0) ||
          touch.yaw,
        pitch:
          (heldKeys['ArrowUp'] ? 1 : 0) - (heldKeys['ArrowDown'] ? 1 : 0) ||
          (useGamepad ? gamepadOut.sticks.pitch : 0) ||
          touch.pitch,
        roll:
          (heldKeys['ArrowRight'] ? 1 : 0) - (heldKeys['ArrowLeft'] ? 1 : 0) ||
          (useGamepad ? gamepadOut.sticks.roll : 0) ||
          touch.roll,
      };

      const isSpectatingLeader = Boolean(
        mpConfig?.active && mpConfig.spectatingFollowLeader
      );
      const effectiveTrackForPhysics: TrackDef =
        mpConfig?.active &&
        (mpConfig.mode === 'laser-tag' || mpConfig.mode === 'drone-tag')
          ? { ...activeTrack, lapCount: 999 }
          : activeTrack;

      if (mode === 'playing') {
        wasPlayingMode = true;
        if (isSpectatingLeader) {
          fpvAudio.updateFlightSound(false, 0, 0, 0);
        } else if (refsObj.countdownTimer > 0) {
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
            effectiveTrackForPhysics,
            dt,
            refsObj.elapsedRaceMs,
            {
              onGatePassed: (gateId, isLapComplete) => {
                fpvAudio.playGatePass(isLapComplete);
                const passedGate = activeTrack.gates.find((g) => g.id === gateId);
                if (passedGate) {
                  _gateVec.set(
                    passedGate.position[0],
                    passedGate.position[1],
                    passedGate.position[2]
                  );
                  spawnParticleBurst(_gateVec, 18, 13);
                  if (quality !== 'performance') {
                    shockwaves.spawn(_gateVec, passedGate.headingRad, isLapComplete);
                  }
                }
                mpConfig?.onReportProgress(
                  phys.currentLap,
                  phys.currentGateIndex,
                  phys.cleanGates
                );
                propsRef.current.onGatePassed(gateId, isLapComplete);
              },
              onImpact: (severity, impactPos) => {
                fpvAudio.playImpact(severity);
                spawnParticleBurst(impactPos, 18, 10 + severity * 12);
              },
              onRaceFinished: () => {
                if (!finishedSent) {
                  finishedSent = true;
                  const flightDurationSec = Number(unflushedFlightSec.toFixed(1));
                  const distanceKm = Number((unflushedDistM / 1000).toFixed(3));
                  unflushedFlightSec = 0;
                  unflushedDistM = 0;
                  unflushedMaxSpeedKmh = 0;
                  // Push final keyframe
                  refsObj.recordedGhostFrames.push([
                    Math.round(refsObj.elapsedRaceMs),
                    Number(phys.position.x.toFixed(2)),
                    Number(phys.position.y.toFixed(2)),
                    Number(phys.position.z.toFixed(2)),
                    Number(phys.quaternion.x.toFixed(4)),
                    Number(phys.quaternion.y.toFixed(4)),
                    Number(phys.quaternion.z.toFixed(4)),
                    Number(phys.quaternion.w.toFixed(4)),
                  ]);
                  propsRef.current.onRaceFinished({
                    totalTimeMs: refsObj.elapsedRaceMs,
                    bestLapMs: phys.bestLapMs ?? refsObj.elapsedRaceMs,
                    lapTimesMs: [...phys.lapTimesMs],
                    cleanGates: phys.cleanGates,
                    maxSpeedKmh: Math.round(phys.maxSpeedKmhReached),
                    flightDurationSec,
                    distanceKm,
                    recordedGhostFrames: [...refsObj.recordedGhostFrames],
                  });
                }
              },
            },
            fwDamping
          );

          if (!finishedSent) {
            unflushedFlightSec += dt;
            const instSpeedMs = phys.velocity.length();
            unflushedDistM += instSpeedMs * dt;
            const instSpeedKmh = instSpeedMs * 3.6;
            if (instSpeedKmh > unflushedMaxSpeedKmh) {
              unflushedMaxSpeedKmh = instSpeedKmh;
            }
          }

          // Record 15Hz Ghost keyframe (cap ~1800 frames)
          if (
            refsObj.elapsedRaceMs - refsObj.lastGhostSampleMs >= 66 &&
            refsObj.recordedGhostFrames.length < 1800
          ) {
            refsObj.lastGhostSampleMs = refsObj.elapsedRaceMs;
            refsObj.recordedGhostFrames.push([
              Math.round(refsObj.elapsedRaceMs),
              Number(phys.position.x.toFixed(2)),
              Number(phys.position.y.toFixed(2)),
              Number(phys.position.z.toFixed(2)),
              Number(phys.quaternion.x.toFixed(4)),
              Number(phys.quaternion.y.toFixed(4)),
              Number(phys.quaternion.z.toFixed(4)),
              Number(phys.quaternion.w.toFixed(4)),
            ]);
          }

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
        if (wasPlayingMode) {
          wasPlayingMode = false;
          flushUnflushedFlight();
        }
        fpvAudio.updateFlightSound(false, 0, 0, 0);
      }

      // Spin propellers & update player drone mesh
      if (refsObj.droneHandle) {
        const dh = refsObj.droneHandle;
        dh.propHubs.forEach((hub, idx) => {
          const rpm = mode === 'playing' ? phys.motorRpms[idx] : 0.35;
          const dir = idx === 0 || idx === 3 ? 1 : -1;
          hub.rotation.y += dir * rpm * dt * 68;
          dh.propBlurDiscs[idx].visible = rpm > 0.32;
          dh.materials.blurDisc.opacity = THREE.MathUtils.clamp((rpm - 0.25) * 0.26, 0.04, 0.24);
        });

        if (mode === 'title' || mode === 'garage') {
          const firstGate = activeTrack.gates[0];
          const h = firstGate ? firstGate.headingRad : 0;
          const sx = firstGate ? firstGate.position[0] - Math.sin(h) * 16 : 0;
          const sz = firstGate ? firstGate.position[2] - Math.cos(h) * 16 : 0;
          const gy = sampleTrackTerrainHeight(sx, sz, activeTrack);
          const hoverY = gy + 1.35 + Math.sin(totalElapsed * 2.2) * (propsRef.current.benchInspectActive ? 0.025 : 0.08);
          dh.root.position.set(sx, hoverY, sz);

          const orbit = benchOrbitRef.current;
          const targetExplode =
            mode === 'garage' && propsRef.current.benchExploded ? 1 : 0;
          orbit.explodedValue = THREE.MathUtils.lerp(
            orbit.explodedValue,
            targetExplode,
            1 - Math.exp(-8.0 * dt)
          );
          dh.setExploded(orbit.explodedValue);

          if (mode === 'garage' && orbit.userInteracted) {
            dh.root.rotation.set(0, h + Math.PI, 0);
          } else {
            dh.root.rotation.set(
              Math.sin(totalElapsed * 1.3) * 0.04,
              h + Math.PI + totalElapsed * 0.38,
              Math.cos(totalElapsed * 1.1) * 0.04
            );
          }
          dh.root.visible = true;
          aeroTrails.group.visible = false;
          ghostMesh.root.visible = false;

          refsObj.contactShadow.position.set(sx, gy + 0.06, sz);
          refsObj.contactShadow.visible = true;

          const orbitRadius = mode === 'garage' ? orbit.distance : 1.05;
          const orbitAng =
            mode === 'garage' && orbit.userInteracted
              ? orbit.yaw
              : totalElapsed * 0.28 + 0.6;
          const pitchLift =
            mode === 'garage'
              ? Math.sin(orbit.pitch) * orbitRadius + 0.06
              : 0.36;
          const horizRadius =
            mode === 'garage'
              ? Math.cos(orbit.pitch * 0.65) * orbitRadius
              : orbitRadius;

          const targetCamX = sx + Math.sin(orbitAng) * horizRadius;
          const targetCamZ = sz + Math.cos(orbitAng) * horizRadius;
          const targetCamY = hoverY + pitchLift;

          const damp = 1 - Math.exp(-7.5 * dt);
          camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, damp);
          camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, damp);
          camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, damp);
          // Frame drone higher in viewport when Build Bench dock is open below
          const lookOffsetY =
            mode === 'garage' && propsRef.current.benchInspectActive
              ? -0.055
              : 0.03;
          _lookTarget.set(sx, hoverY + lookOffsetY, sz);
          camera.lookAt(_lookTarget);
          if (Math.abs(camera.fov - 52) > 0.2) {
            camera.fov = THREE.MathUtils.lerp(camera.fov, 52, damp);
            camera.updateProjectionMatrix();
          }
        } else {
          benchOrbitRef.current.explodedValue = 0;
          dh.setExploded(0);
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

          const spectatePose =
            isSpectatingLeader && mpConfig?.spectateTargetId
              ? mpConfig.remotePoses.get(mpConfig.spectateTargetId) ?? null
              : null;

          if (spectatePose) {
            dh.root.visible = false;
            aeroTrails.group.visible = false;
            _ghostPos.set(spectatePose.x, spectatePose.y, spectatePose.z);
            _ghostQuat.set(
              spectatePose.qx,
              spectatePose.qy,
              spectatePose.qz,
              spectatePose.qw
            );
            _forward.set(0, 0, -1).applyQuaternion(_ghostQuat).normalize();
            _camTargetPos
              .copy(_ghostPos)
              .addScaledVector(_forward, -2.35)
              .add(_chaseLift);
            const camGround = sampleTrackTerrainHeight(
              _camTargetPos.x,
              _camTargetPos.z,
              activeTrack
            );
            if (_camTargetPos.y < camGround + 0.65) {
              _camTargetPos.y = camGround + 0.65;
            }
            const chaseDamp = 1 - Math.exp(-10 * dt);
            smoothedChasePos.lerp(_camTargetPos, chaseDamp);
            camera.position.copy(smoothedChasePos);
            _lookTarget.copy(_ghostPos).addScaledVector(_forward, 3.5);
            camera.lookAt(_lookTarget);
          } else if (activeCamView === 'fpv') {
            dh.root.visible = false;
            aeroTrails.group.visible = false;
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
            if (quality !== 'performance') {
              aeroTrails.group.visible = true;
              _tipLeft.set(-0.2, 0.03, 0.1).applyQuaternion(phys.quaternion).add(phys.position);
              _tipRight.set(0.2, 0.03, 0.1).applyQuaternion(phys.quaternion).add(phys.position);
              const trailPower = THREE.MathUtils.clamp((speed - 8) / 30, 0, 1);
              aeroTrails.pushTipPositions(_tipLeft, _tipRight, trailPower);
            } else {
              aeroTrails.group.visible = false;
            }

            _forward.set(0, 0, -1).applyQuaternion(phys.quaternion).normalize();
            _camTargetPos
              .copy(phys.position)
              .addScaledVector(_forward, -1.65)
              .add(_chaseLift);

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

          // Update 3D Holographic Ghost Rival pose
          if (
            mode === 'playing' &&
            ghostRec &&
            ghostRec.frames.length > 1 &&
            refsObj.countdownTimer <= 0
          ) {
            const hasPose = sampleGhostPoseAtTimeInto(
              ghostRec.frames,
              refsObj.elapsedRaceMs,
              _ghostPos,
              _ghostQuat
            );
            ghostMesh.root.visible = hasPose;
            if (hasPose) {
              ghostMesh.root.position.copy(_ghostPos);
              ghostMesh.root.quaternion.copy(_ghostQuat);
            }
          } else {
            ghostMesh.root.visible = false;
          }
        }
      }

      // Update multiplayer remote drones & laser beams
      mpVisuals.update(
        dt,
        totalElapsed,
        Boolean(mode === 'playing' && mpConfig?.active),
        mpConfig?.remotePoses ?? new Map(),
        mpConfig?.pendingLaserBeams ?? [],
        (sparkPos) => spawnParticleBurst(sparkPos, 20, 14)
      );

      // Update atmospheric sky dome, reflective water, shockwaves, and velocity speed lines
      skyHandle.update(totalElapsed, activeTrack.biome, quality !== 'performance');
      refsObj.trackHandle?.updateActiveGate(phys.currentGateIndex, totalElapsed);
      refsObj.trackHandle?.updateEffects(totalElapsed, camera.position);
      shockwaves.update(dt);
      speedLines.update(
        camera.position,
        camera.quaternion,
        phys.velocity.length() * 3.6,
        dt,
        mode === 'playing' && quality !== 'performance' && refsObj.countdownTimer <= 0 && !isSpectatingLeader
      );

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

      // Push throttled telemetry snapshot (~20Hz) to HUD & publish multiplayer pose
      if (mode === 'playing' && totalElapsed - lastTelemetryPush >= 0.05) {
        lastTelemetryPush = totalElapsed;
        if (mpConfig?.active && !isSpectatingLeader) {
          mpConfig.onPublishPose({
            x: Number(phys.position.x.toFixed(2)),
            y: Number(phys.position.y.toFixed(2)),
            z: Number(phys.position.z.toFixed(2)),
            qx: Number(phys.quaternion.x.toFixed(4)),
            qy: Number(phys.quaternion.y.toFixed(4)),
            qz: Number(phys.quaternion.z.toFixed(4)),
            qw: Number(phys.quaternion.w.toFixed(4)),
            vx: Number(phys.velocity.x.toFixed(2)),
            vy: Number(phys.velocity.y.toFixed(2)),
            vz: Number(phys.velocity.z.toFixed(2)),
            lap: phys.currentLap,
            gateIndex: phys.currentGateIndex,
          });
        }
        const g = activeTrack.gates[phys.currentGateIndex];
        let gateArrowAngle = 0;
        let gateDist = 0;
        let gateElevationDiff = 0;
        if (g) {
          _gateVec.set(g.position[0], g.position[1], g.position[2]);
          gateDist = phys.position.distanceTo(_gateVec);
          gateElevationDiff = Number((g.position[1] - phys.position.y).toFixed(1));
          _invQuat.copy(phys.quaternion).invert();
          _localGate.copy(_gateVec).sub(phys.position).applyQuaternion(_invQuat);
          gateArrowAngle = Math.atan2(_localGate.x, -_localGate.z);
        }

        // Compute Ghost pace delta & Euclidean distance
        let ghostDeltaMs: number | null = null;
        let ghostDistM: number | null = null;
        if (ghostRec && ghostRec.frames.length > 1 && activeTrack.gates.length > 0) {
          ghostDistM = Math.round(phys.position.distanceTo(_ghostPos));
          const totalRaceGates = activeTrack.gates.length * activeTrack.lapCount;
          const gatesCleared =
            (phys.currentLap - 1) * activeTrack.gates.length + phys.currentGateIndex;

          const prevGateIdx =
            phys.currentGateIndex === 0 && phys.currentLap === 1
              ? 0
              : (phys.currentGateIndex - 1 + activeTrack.gates.length) % activeTrack.gates.length;
          const prevG = activeTrack.gates[prevGateIdx];
          let legFrac = 0;
          if (g && prevG) {
            _prevGateVec.set(prevG.position[0], prevG.position[1], prevG.position[2]);
            const legLen = Math.max(12, _gateVec.distanceTo(_prevGateVec));
            legFrac = THREE.MathUtils.clamp(1 - gateDist / legLen, 0, 0.95);
          }
          const progress = THREE.MathUtils.clamp(
            (gatesCleared + legFrac) / Math.max(1, totalRaceGates),
            0,
            1
          );
          const expectedGhostTimeMs = progress * ghostRec.totalTimeMs;
          if (refsObj.elapsedRaceMs > 800) {
            ghostDeltaMs = Math.round(refsObj.elapsedRaceMs - expectedGhostTimeMs);
          }
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
          gateElevationDiffM: gateElevationDiff,
          ghostDeltaMs,
          ghostDistM,
          ghostLabel: ghostRec ? ghostRec.label : null,
          motorRpms: phys.motorRpms,
          armed: phys.armed,
          crashed: phys.crashCooldown > 0,
          countdownSec: Math.ceil(refsObj.countdownTimer),
        });
      }

      if (isSoftwareGl || quality === 'performance' || !composer) {
        renderer.render(scene, camera);
      } else {
        composer.render();
      }

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
      flushUnflushedFlight();
      cancelAnimationFrame(frameIdRef);
      clearTimeout(frameIdRef);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('contextmenu', onCanvasContextMenu);
      renderer.domElement.removeEventListener('pointerdown', onCanvasPointerDown);
      renderer.domElement.removeEventListener('wheel', onCanvasWheel);
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);

      refsObj.droneHandle?.dispose();
      refsObj.trackHandle?.dispose();
      skyHandle.dispose();
      aeroTrails.dispose();
      shockwaves.dispose();
      speedLines.dispose();
      ghostMesh.dispose();
      mpVisuals.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTex.dispose();
      partGeo.dispose();
      partMat.dispose();
      envTex.dispose();
      composer?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [touchSticksRef]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-screen h-dvh overflow-hidden bg-zinc-950"
    />
  );
};
