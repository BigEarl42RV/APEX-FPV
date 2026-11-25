/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import * as THREE from 'three';
import type { GateDef, TrackBiome, TrackDef } from '../types/game';
import { mulberry32, sampleTrackTerrainHeight } from '../data/tracks';
import {
  createBiomeTerrainDetailMaps,
  createBiomeTerrainTexture,
  createGateBannerTexture,
} from './proceduralTextures';
import {
  buildReflectiveWaterPlane,
  type AnimatedWaterHandle,
} from './skyAndEffects';

export interface BuiltTrackScene {
  group: THREE.Group;
  gateGroups: THREE.Group[];
  gateRingMaterials: THREE.MeshStandardMaterial[];
  beaconMesh: THREE.Mesh;
  guideLineMesh: THREE.Mesh | null;
  waterHandle: AnimatedWaterHandle | null;
  skyColorHex: number;
  setRacingLineVisible: (visible: boolean) => void;
  setWaterVisible: (visible: boolean) => void;
  updateEffects: (elapsedSec: number, cameraPos: THREE.Vector3) => void;
  updateActiveGate: (activeIdx: number, elapsedSec: number) => void;
  dispose: () => void;
}

const BIOME_PALETTES: Record<
  TrackBiome,
  { sky: number; fogDensity: number; sunColor: number; hemiSky: number; hemiGround: number }
> = {
  alpine: {
    sky: 0x8fb3d1,
    fogDensity: 0.0022,
    sunColor: 0xfff3d6,
    hemiSky: 0x93c5fd,
    hemiGround: 0x263829,
  },
  coastal: {
    sky: 0x7cb2cc,
    fogDensity: 0.0021,
    sunColor: 0xfff7e6,
    hemiSky: 0xbae6fd,
    hemiGround: 0x1e3a3a,
  },
  desert: {
    sky: 0xd9a773,
    fogDensity: 0.002,
    sunColor: 0xffdfad,
    hemiSky: 0xfde68a,
    hemiGround: 0x5c3a21,
  },
  urban: {
    sky: 0x1d2433,
    fogDensity: 0.0025,
    sunColor: 0xffe4b5,
    hemiSky: 0x64748b,
    hemiGround: 0x18181b,
  },
};

export function getBiomeAtmosphere(biome: TrackBiome) {
  return BIOME_PALETTES[biome];
}

export function buildTrackEnvironment(
  track: TrackDef,
  maxAnisotropy: number
): BuiltTrackScene {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const atmo = BIOME_PALETTES[track.biome];

  // 1. Extended PBR Terrain Mesh (680m x 680m with procedural albedo, bump & roughness maps)
  const terrainSize = 680;
  const segs = 128;
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segs, segs);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, sampleTrackTerrainHeight(vx, vz, track));
  }
  terrainGeo.computeVertexNormals();
  geometries.push(terrainGeo);

  const terrainTex = createBiomeTerrainTexture(track.biome, maxAnisotropy);
  const { bumpMap, roughnessMap } = createBiomeTerrainDetailMaps(
    track.biome,
    maxAnisotropy
  );
  textures.push(terrainTex, bumpMap, roughnessMap);

  const terrainMat = new THREE.MeshStandardMaterial({
    map: terrainTex,
    bumpMap,
    bumpScale: track.biome === 'urban' ? 0.16 : 0.34,
    roughnessMap,
    roughness: track.biome === 'urban' ? 0.72 : 0.88,
    metalness: track.biome === 'urban' ? 0.14 : 0.05,
  });
  materials.push(terrainMat);

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Reflective GLSL water plane in coastal & alpine low basins
  let waterHandle: AnimatedWaterHandle | null = null;
  if (track.biome === 'coastal' || track.biome === 'alpine') {
    waterHandle = buildReflectiveWaterPlane(track.biome, 0.02);
    group.add(waterHandle.mesh);
  }

  // 2. Elevated Launch Pad at Drone Spawn Point
  const firstGate = track.gates[0];
  const heading = firstGate ? firstGate.headingRad : 0;
  const spawnX = firstGate ? firstGate.position[0] - Math.sin(heading) * 16 : 0;
  const spawnZ = firstGate ? firstGate.position[2] - Math.cos(heading) * 16 : 0;
  const padGroundY = sampleTrackTerrainHeight(spawnX, spawnZ, track);

  const padGroup = new THREE.Group();
  padGroup.position.set(spawnX, padGroundY + 0.06, spawnZ);
  const padBaseGeo = new THREE.CylinderGeometry(2.6, 3.0, 0.16, 28);
  const padRingGeo = new THREE.RingGeometry(1.75, 2.2, 28);
  padRingGeo.rotateX(-Math.PI / 2);
  geometries.push(padBaseGeo, padRingGeo);

  const padBaseMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.62,
    metalness: 0.35,
  });
  const padRingMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.35,
    roughness: 0.35,
    metalness: 0.2,
  });
  materials.push(padBaseMat, padRingMat);

  const padBase = new THREE.Mesh(padBaseGeo, padBaseMat);
  padBase.receiveShadow = true;
  const padRing = new THREE.Mesh(padRingGeo, padRingMat);
  padRing.position.y = 0.09;
  padRingMat.polygonOffset = true;
  padRingMat.polygonOffsetFactor = -1;
  padGroup.add(padBase, padRing);
  group.add(padGroup);

  // 3. Composite Multi-Part Racing Gates + Flanking Race Flags
  const bannerTex = createGateBannerTexture('#f59e0b', maxAnisotropy);
  textures.push(bannerTex);

  const gateTrussMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.38,
    metalness: 0.78,
  });
  const gateBannerMat = new THREE.MeshStandardMaterial({
    map: bannerTex,
    roughness: 0.45,
    metalness: 0.2,
  });
  const flagPoleMat = new THREE.MeshStandardMaterial({
    color: 0x52525b,
    roughness: 0.35,
    metalness: 0.85,
  });
  const flagClothMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.35,
    roughness: 0.6,
    side: THREE.DoubleSide,
  });
  materials.push(gateTrussMat, gateBannerMat, flagPoleMat, flagClothMat);

  const flagPoleGeo = new THREE.CylinderGeometry(0.06, 0.08, 4.6, 8);
  const flagClothGeo = new THREE.PlaneGeometry(0.85, 2.5);
  geometries.push(flagPoleGeo, flagClothGeo);

  const gateGroups: THREE.Group[] = [];
  const gateRingMaterials: THREE.MeshStandardMaterial[] = [];

  track.gates.forEach((g: GateDef) => {
    const gg = new THREE.Group();
    gg.position.set(g.position[0], g.position[1], g.position[2]);
    gg.rotation.y = g.headingRad;

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x52525b,
      emissive: 0x27272a,
      emissiveIntensity: 0.4,
      roughness: 0.24,
      metalness: 0.6,
    });
    materials.push(ringMat);
    gateRingMaterials.push(ringMat);

    const groundAtGate = sampleTrackTerrainHeight(g.position[0], g.position[2], track);
    const legSpanY = Math.max(2, g.position[1] - groundAtGate);

    if (g.type === 'ring' || g.type === 'dive') {
      const ringGeo = new THREE.TorusGeometry(g.width * 0.48, 0.4, 14, 36);
      const outerHaloGeo = new THREE.TorusGeometry(g.width * 0.54, 0.11, 8, 36);
      geometries.push(ringGeo, outerHaloGeo);

      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.castShadow = true;
      const outerHalo = new THREE.Mesh(outerHaloGeo, gateTrussMat);
      gg.add(ringMesh, outerHalo);

      const pylonGeo = new THREE.CylinderGeometry(0.24, 0.36, legSpanY, 10);
      geometries.push(pylonGeo);
      const pylon = new THREE.Mesh(pylonGeo, gateTrussMat);
      pylon.position.y = -legSpanY * 0.5 - g.height * 0.44;
      pylon.castShadow = true;
      gg.add(pylon);
    } else {
      // Composite Arch / Split Gate with LED Trim & Grounded Footings
      const legGeo = new THREE.CylinderGeometry(0.24, 0.3, legSpanY + g.height * 0.5, 10);
      const topBarGeo = new THREE.BoxGeometry(g.width + 0.9, 1.2, 0.56);
      const innerStripGeo = new THREE.BoxGeometry(g.width - 0.3, 0.32, 0.64);
      const sideLedGeo = new THREE.BoxGeometry(0.18, g.height * 0.72, 0.44);
      const footGeo = new THREE.CylinderGeometry(0.7, 0.86, 0.38, 12);
      geometries.push(legGeo, topBarGeo, innerStripGeo, sideLedGeo, footGeo);

      const halfW = g.width * 0.5;
      const legCenterY = (g.height * 0.5 - legSpanY) * 0.5;

      const leftLeg = new THREE.Mesh(legGeo, gateTrussMat);
      leftLeg.position.set(-halfW, legCenterY, 0);
      leftLeg.castShadow = true;

      const rightLeg = new THREE.Mesh(legGeo, gateTrussMat);
      rightLeg.position.set(halfW, legCenterY, 0);
      rightLeg.castShadow = true;

      const leftLed = new THREE.Mesh(sideLedGeo, ringMat);
      leftLed.position.set(-halfW + 0.22, 0, 0);
      const rightLed = new THREE.Mesh(sideLedGeo, ringMat);
      rightLed.position.set(halfW - 0.22, 0, 0);

      const leftFoot = new THREE.Mesh(footGeo, gateTrussMat);
      leftFoot.position.set(-halfW, -legSpanY + 0.18, 0);
      const rightFoot = new THREE.Mesh(footGeo, gateTrussMat);
      rightFoot.position.set(halfW, -legSpanY + 0.18, 0);

      const topBanner = new THREE.Mesh(topBarGeo, gateBannerMat);
      topBanner.position.set(0, g.height * 0.5 + 0.22, 0);
      topBanner.castShadow = true;

      const topStrip = new THREE.Mesh(innerStripGeo, ringMat);
      topStrip.position.set(0, g.height * 0.5 - 0.44, 0);

      gg.add(
        leftLeg,
        rightLeg,
        leftLed,
        rightLed,
        leftFoot,
        rightFoot,
        topBanner,
        topStrip
      );
    }

    // Trackside feather flags planted on terrain flanking the gate
    const flagOffset = g.width * 0.68;
    [-1, 1].forEach((side) => {
      const fx =
        g.position[0] + Math.cos(g.headingRad) * flagOffset * side;
      const fz =
        g.position[2] - Math.sin(g.headingRad) * flagOffset * side;
      const fgy = sampleTrackTerrainHeight(fx, fz, track);

      const pole = new THREE.Mesh(flagPoleGeo, flagPoleMat);
      pole.position.set(fx, fgy + 2.3, fz);
      pole.castShadow = true;

      const cloth = new THREE.Mesh(flagClothGeo, flagClothMat);
      cloth.position.set(fx, fgy + 3.25, fz);
      cloth.rotation.y = g.headingRad + (side > 0 ? 0.35 : -0.35);
      group.add(pole, cloth);
    });

    group.add(gg);
    gateGroups.push(gg);
  });

  // 4. Vertical Sky Beacon above active gate (bloom-ready additive cylinder)
  const beaconGeo = new THREE.CylinderGeometry(0.32, 0.55, 76, 12, 1, true);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  geometries.push(beaconGeo);
  materials.push(beaconMat);
  const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
  group.add(beaconMesh);

  // 5. Course 3D Optimal Racing Line (Catmull-Rom spline, toggled by HUD Software Upgrade)
  let guideLineMesh: THREE.Mesh | null = null;
  if (track.gates.length >= 2) {
    const pts = track.gates.map(
      (g) => new THREE.Vector3(g.position[0], g.position[1], g.position[2])
    );
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const guideGeo = new THREE.TubeGeometry(curve, track.gates.length * 16, 0.11, 6, true);
    const guideMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(guideGeo);
    materials.push(guideMat);
    guideLineMesh = new THREE.Mesh(guideGeo, guideMat);
    group.add(guideLineMesh);
  }

  // 6. InstancedMesh Obstacles & Perimeter Trees/Rocks/Towers (> 20 repeated items)
  const trees = track.obstacles.filter((o) => o.kind === 'tree');
  const rocks = track.obstacles.filter((o) => o.kind === 'rock');
  const pylons = track.obstacles.filter(
    (o) => o.kind === 'pylon' || o.kind === 'tower'
  );
  const rand = mulberry32(track.terrainSeed + 99);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  for (let i = 0; i < 42; i++) {
    const ang = (i / 42) * Math.PI * 2 + rand() * 0.12;
    const rad = 212 + rand() * 55;
    if (track.biome === 'desert') {
      rocks.push({
        x: Math.cos(ang) * rad,
        z: Math.sin(ang) * rad,
        radius: 4.5 + rand() * 4,
        height: 8 + rand() * 12,
        kind: 'rock',
      });
    } else {
      trees.push({
        x: Math.cos(ang) * rad,
        z: Math.sin(ang) * rad,
        radius: 3 + rand() * 1.5,
        height: 12 + rand() * 10,
        kind: 'tree',
      });
    }
  }

  if (trees.length > 0) {
    const trunkGeo = new THREE.CylinderGeometry(0.32, 0.55, 1, 8);
    trunkGeo.translate(0, 0.5, 0);
    const crownGeo = new THREE.ConeGeometry(1, 1, 7);
    crownGeo.translate(0, 0.5, 0);
    geometries.push(trunkGeo, crownGeo);

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x4b3621,
      roughness: 0.92,
      metalness: 0.02,
    });
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.04,
    });
    materials.push(trunkMat, crownMat);

    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, trees.length);
    trunkInst.castShadow = true;
    crownInst.castShadow = true;
    crownInst.receiveShadow = true;

    trees.forEach((t, idx) => {
      const gy = sampleTrackTerrainHeight(t.x, t.z, track);
      const scaleJitter = 0.88 + rand() * 0.24;
      const h = t.height * scaleJitter;

      dummy.position.set(t.x, gy - 0.2, t.z);
      dummy.rotation.set(0, rand() * Math.PI * 2, 0);
      dummy.scale.set(1, h * 0.42, 1);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(t.x, gy + h * 0.28, t.z);
      dummy.scale.set(t.radius * scaleJitter, h * 0.78, t.radius * scaleJitter);
      dummy.updateMatrix();
      crownInst.setMatrixAt(idx, dummy.matrix);

      tint.setHSL(0.34 + (rand() - 0.5) * 0.05, 0.42, 0.22 + rand() * 0.1);
      crownInst.setColorAt(idx, tint);
    });

    trunkInst.instanceMatrix.needsUpdate = true;
    crownInst.instanceMatrix.needsUpdate = true;
    if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    crownInst.computeBoundingSphere();
    group.add(trunkInst, crownInst);
  }

  if (rocks.length > 0) {
    const rockGeo = new THREE.DodecahedronGeometry(1, 1);
    rockGeo.translate(0, 0.45, 0);
    geometries.push(rockGeo);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.06,
      flatShading: true,
    });
    materials.push(rockMat);

    const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length);
    rockInst.castShadow = true;
    rockInst.receiveShadow = true;

    rocks.forEach((r, idx) => {
      const gy = sampleTrackTerrainHeight(r.x, r.z, track);
      dummy.position.set(r.x, gy - 0.4, r.z);
      dummy.rotation.set(rand() * 0.4, rand() * Math.PI * 2, rand() * 0.4);
      dummy.scale.set(r.radius, r.height * 0.72, r.radius * (0.85 + rand() * 0.3));
      dummy.updateMatrix();
      rockInst.setMatrixAt(idx, dummy.matrix);

      if (track.biome === 'desert') {
        tint.setHSL(0.06 + (rand() - 0.5) * 0.02, 0.46, 0.38 + rand() * 0.12);
      } else {
        tint.setHSL(0.6, 0.08, 0.35 + rand() * 0.15);
      }
      rockInst.setColorAt(idx, tint);
    });

    rockInst.instanceMatrix.needsUpdate = true;
    if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
    rockInst.computeBoundingSphere();
    group.add(rockInst);
  }

  if (pylons.length > 0) {
    const pylonGeo = new THREE.CylinderGeometry(0.65, 1.0, 1, 8);
    pylonGeo.translate(0, 0.5, 0);
    geometries.push(pylonGeo);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.38,
      metalness: 0.72,
    });
    materials.push(pylonMat);

    const pylonInst = new THREE.InstancedMesh(pylonGeo, pylonMat, pylons.length);
    pylonInst.castShadow = true;
    pylonInst.receiveShadow = true;

    pylons.forEach((p, idx) => {
      const gy = sampleTrackTerrainHeight(p.x, p.z, track);
      dummy.position.set(p.x, gy - 0.1, p.z);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.scale.set(p.radius * 0.65, p.height, p.radius * 0.65);
      dummy.updateMatrix();
      pylonInst.setMatrixAt(idx, dummy.matrix);

      tint.setHex(p.kind === 'tower' ? 0x3f3f46 : 0xea580c);
      pylonInst.setColorAt(idx, tint);
    });

    pylonInst.instanceMatrix.needsUpdate = true;
    if (pylonInst.instanceColor) pylonInst.instanceColor.needsUpdate = true;
    pylonInst.computeBoundingSphere();
    group.add(pylonInst);
  }

  return {
    group,
    gateGroups,
    gateRingMaterials,
    beaconMesh,
    guideLineMesh,
    waterHandle,
    skyColorHex: atmo.sky,
    setRacingLineVisible: (visible: boolean) => {
      if (guideLineMesh) guideLineMesh.visible = visible;
    },
    setWaterVisible: (visible: boolean) => {
      if (waterHandle) waterHandle.mesh.visible = visible;
    },
    updateEffects: (elapsedSec: number, cameraPos: THREE.Vector3) => {
      if (waterHandle && waterHandle.mesh.visible) {
        waterHandle.update(elapsedSec, cameraPos);
      }
    },
    updateActiveGate: (activeIdx: number, elapsedSec: number) => {
      const pulse = 2.0 + Math.sin(elapsedSec * 6.0) * 0.65;
      gateRingMaterials.forEach((mat, idx) => {
        if (idx === activeIdx) {
          mat.color.setHex(0xf59e0b);
          mat.emissive.setHex(0xf59e0b);
          mat.emissiveIntensity = pulse;
        } else if (idx === (activeIdx + 1) % gateRingMaterials.length) {
          mat.color.setHex(0x06b6d4);
          mat.emissive.setHex(0x06b6d4);
          mat.emissiveIntensity = 1.15;
        } else {
          mat.color.setHex(0x52525b);
          mat.emissive.setHex(0x18181b);
          mat.emissiveIntensity = 0.25;
        }
      });

      const activeGate = track.gates[activeIdx];
      if (activeGate) {
        beaconMesh.position.set(
          activeGate.position[0],
          activeGate.position[1] + 38,
          activeGate.position[2]
        );
        beaconMesh.visible = true;
      } else {
        beaconMesh.visible = false;
      }
    },
    dispose: () => {
      waterHandle?.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
