/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import * as THREE from 'three';
import type {
  DroneCustomization,
  DroneFrameId,
  DroneVisualBlueprint,
  FrameFinish,
} from '../types/game';
import { getFactoryFrameBlueprint } from '../data/droneBuilder';
import { createCarbonFiberTextures } from './proceduralTextures';

export interface DroneModelHandles {
  root: THREE.Group;
  propHubs: THREE.Group[];
  propBlurDiscs: THREE.Mesh[];
  materials: {
    frame: THREE.MeshPhysicalMaterial;
    canopy: THREE.MeshPhysicalMaterial;
    accent: THREE.MeshStandardMaterial;
    prop: THREE.MeshStandardMaterial;
    led: THREE.MeshStandardMaterial;
    blurDisc: THREE.MeshBasicMaterial;
  };
  setFrameFinish: (finish: FrameFinish) => void;
  setCameraTilt: (deg: number) => void;
  setExploded: (amount: number) => void;
  dispose: () => void;
}

function applyFrameFinishToMat(
  mat: THREE.MeshPhysicalMaterial,
  finish: FrameFinish
): void {
  if (finish === 'gloss') {
    mat.roughness = 0.16;
    mat.metalness = 0.28;
    mat.clearcoat = 0.95;
    mat.clearcoatRoughness = 0.08;
  } else if (finish === 'metallic') {
    mat.roughness = 0.22;
    mat.metalness = 0.84;
    mat.clearcoat = 0.55;
    mat.clearcoatRoughness = 0.15;
  } else {
    mat.roughness = 0.55;
    mat.metalness = 0.2;
    mat.clearcoat = 0.08;
    mat.clearcoatRoughness = 0.4;
  }
  mat.needsUpdate = true;
}

/**
 * Builds a composite multi-part procedural 3D FPV racing quadcopter `THREE.Group`:
 * 1. Beveled carbon chassis plate (True-X, Stretched-X, Cinewhoop, or Deadcat) + 4 arms
 * 2. Central 20x20 / 30x30 FC + ESC PCB stack with anodized heatsink & brass standoffs
 * 3. 4x Machined aluminum motor bells (LatheGeometry) + copper stator cores (scaled by motor class)
 * 4. 4x Configurable 2-, 3-, or 5-blade pitched racing propellers + motion-blur prop discs
 * 5. Optional Cinewhoop aerodynamic prop ducts
 * 6. Aerodynamic top race canopy (ExtrudeGeometry with bevel)
 * 7. Scaled 4S / 6S / Li-Ion battery pack + strap
 * 8. FPV Camera unit (Micro Analog, HD O3, or Action 4K top rig) + optical glass lens
 * 9. VTX Antenna (Stubby, Lollipop dome, or Long-Range whip)
 * 10. Programmable arm LED light bars
 */
export function buildProceduralDroneModel(
  frameId: DroneFrameId,
  customization: DroneCustomization,
  maxAnisotropy: number,
  isSoftwareGl: boolean,
  blueprintOverride?: DroneVisualBlueprint
): DroneModelHandles {
  const bp = blueprintOverride ?? getFactoryFrameBlueprint(frameId);
  const root = new THREE.Group();
  const { map: carbonMap, bumpMap: carbonBump } =
    createCarbonFiberTextures(maxAnisotropy);

  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const materialsToDispose: THREE.Material[] = [];

  const scaleFactor = THREE.MathUtils.clamp(bp.armSpanM / 0.24, 0.78, 1.42);
  const armReach = 0.145 * scaleFactor;

  // Materials with calibrated PBR contrast
  const carbonMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(customization.frameColor ?? '#27272a'),
    map: carbonMap,
    bumpMap: carbonBump,
    bumpScale: 0.004,
    roughness: 0.55,
    metalness: 0.2,
    clearcoat: 0.08,
  });
  applyFrameFinishToMat(carbonMat, customization.frameFinish ?? 'matte');
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(customization.canopyColor),
    roughness: 0.22,
    metalness: 0.35,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(customization.armAccentColor),
    roughness: 0.28,
    metalness: 0.85,
  });
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xc26d38,
    roughness: 0.32,
    metalness: 0.92,
  });
  const pcbMat = new THREE.MeshStandardMaterial({
    color: 0x0f2e24,
    roughness: 0.45,
    metalness: 0.3,
  });
  const heatsinkMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(bp.heatsinkColor),
    roughness: 0.25,
    metalness: 0.88,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4a24c,
    roughness: 0.25,
    metalness: 0.92,
  });
  const propMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(customization.propColor),
    roughness: 0.35,
    metalness: 0.12,
    transparent: true,
    opacity: 0.92,
  });
  const blurDiscMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(customization.propColor),
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ledMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(customization.ledColor),
    emissive: new THREE.Color(customization.ledColor),
    emissiveIntensity: 2.2,
    roughness: 0.3,
    metalness: 0.1,
  });
  const batteryMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.72,
    metalness: 0.08,
  });
  const glassLensMat = new THREE.MeshPhysicalMaterial({
    color: 0x93c5fd,
    roughness: 0.05,
    metalness: 0.0,
    transmission: isSoftwareGl ? 0 : 0.88,
    transparent: true,
    opacity: isSoftwareGl ? 0.45 : 1,
    ior: 1.55,
    thickness: 0.05,
    clearcoat: 1.0,
  });

  materialsToDispose.push(
    carbonMat,
    canopyMat,
    accentMat,
    copperMat,
    pcbMat,
    heatsinkMat,
    brassMat,
    propMat,
    blurDiscMat,
    ledMat,
    batteryMat,
    glassLensMat
  );

  // 1. Beveled Carbon Bottom Plate (geometry varies by chassis style)
  const plateShape = new THREE.Shape();
  const w =
    (bp.geometryStyle === 'stretched-x' ? 0.048 : 0.058) * scaleFactor;
  const l =
    (bp.geometryStyle === 'stretched-x'
      ? 0.125
      : bp.geometryStyle === 'deadcat-lr'
        ? 0.132
        : 0.11) * scaleFactor;
  plateShape.moveTo(-w, -l * 0.75);
  plateShape.lineTo(-w * 0.65, -l);
  plateShape.lineTo(w * 0.65, -l);
  plateShape.lineTo(w, -l * 0.75);
  plateShape.lineTo(w, l * 0.75);
  plateShape.lineTo(w * 0.75, l);
  plateShape.lineTo(-w * 0.75, l);
  plateShape.lineTo(-w, l * 0.75);
  plateShape.closePath();

  const plateGeo = new THREE.ExtrudeGeometry(plateShape, {
    depth: 0.008,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 2,
  });
  plateGeo.rotateX(Math.PI / 2);
  geometriesToDispose.push(plateGeo);

  const bottomPlate = new THREE.Mesh(plateGeo, carbonMat);
  bottomPlate.position.y = 0.015;
  bottomPlate.castShadow = true;
  root.add(bottomPlate);

  // 2. Central FC + ESC PCB Stack (20x20 vs 30x30)
  const stackGroup = new THREE.Group();
  const stackBaseY = 0.022;
  stackGroup.position.y = stackBaseY;
  const stackSpan = bp.stackSize === '30x30' ? 0.046 : 0.032;
  const pcbGeo = new THREE.BoxGeometry(stackSpan, 0.0035, stackSpan);
  const heatsinkGeo = new THREE.BoxGeometry(
    stackSpan * 0.92,
    0.0045,
    stackSpan * 0.92
  );
  const standoffGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.018, 8);
  geometriesToDispose.push(pcbGeo, heatsinkGeo, standoffGeo);

  const escPcb = new THREE.Mesh(pcbGeo, pcbMat);
  const escHeatsink = new THREE.Mesh(heatsinkGeo, heatsinkMat);
  escHeatsink.position.y = 0.004;
  const fcPcb = new THREE.Mesh(pcbGeo, pcbMat);
  fcPcb.position.y = 0.012;
  stackGroup.add(escPcb, escHeatsink, fcPcb);

  const standoffOffset = stackSpan * 0.4;
  for (const sx of [-standoffOffset, standoffOffset]) {
    for (const sz of [-standoffOffset, standoffOffset]) {
      const standoff = new THREE.Mesh(standoffGeo, brassMat);
      standoff.position.set(sx, 0.008, sz);
      stackGroup.add(standoff);
    }
  }
  root.add(stackGroup);

  // 3. 4 Carbon Arms + Motor Pods + Props
  const armAngles =
    bp.geometryStyle === 'stretched-x'
      ? [Math.PI * 0.2, -Math.PI * 0.2, Math.PI * 0.8, -Math.PI * 0.8]
      : bp.geometryStyle === 'deadcat-lr'
        ? [Math.PI * 0.35, -Math.PI * 0.35, Math.PI * 0.78, -Math.PI * 0.78]
        : [Math.PI * 0.25, -Math.PI * 0.25, Math.PI * 0.75, -Math.PI * 0.75];

  const armLength = armReach * 1.414;
  const armGeo = new THREE.BoxGeometry(
    0.022 * scaleFactor * bp.armThicknessScale,
    0.009,
    armLength
  );
  const ledStripGeo = new THREE.BoxGeometry(
    0.014 * scaleFactor * bp.armThicknessScale,
    0.004,
    armLength * 0.52
  );
  geometriesToDispose.push(armGeo, ledStripGeo);

  const mScale = scaleFactor * bp.motorScale;
  const bellPoints = [
    new THREE.Vector2(0.001, 0),
    new THREE.Vector2(0.02 * mScale, 0),
    new THREE.Vector2(0.021 * mScale, 0.014 * mScale),
    new THREE.Vector2(0.017 * mScale, 0.019 * mScale),
    new THREE.Vector2(0.005 * mScale, 0.021 * mScale),
    new THREE.Vector2(0.004 * mScale, 0.028 * mScale),
    new THREE.Vector2(0.0, 0.028 * mScale),
  ];
  const motorBellGeo = new THREE.LatheGeometry(bellPoints, 20);
  const statorGeo = new THREE.CylinderGeometry(
    0.016 * mScale,
    0.016 * mScale,
    0.012 * mScale,
    16
  );
  geometriesToDispose.push(motorBellGeo, statorGeo);

  const ductGeo = bp.hasDucts
    ? new THREE.TorusGeometry(0.098 * scaleFactor, 0.009, 10, 28)
    : null;
  if (ductGeo) {
    ductGeo.rotateX(Math.PI / 2);
    geometriesToDispose.push(ductGeo);
  }

  const bladeWidth =
    bp.bladeCount === 5
      ? 0.013 * scaleFactor
      : bp.bladeCount === 2
        ? 0.019 * scaleFactor
        : 0.016 * scaleFactor;
  const bladeGeo = new THREE.BoxGeometry(
    bladeWidth,
    0.0025,
    0.075 * scaleFactor
  );
  bladeGeo.translate(0, 0, 0.042 * scaleFactor);
  const blurDiscGeo = new THREE.CircleGeometry(0.085 * scaleFactor, 24);
  blurDiscGeo.rotateX(-Math.PI / 2);
  geometriesToDispose.push(bladeGeo, blurDiscGeo);

  const propAssembly = new THREE.Group();
  root.add(propAssembly);
  const propHubs: THREE.Group[] = [];
  const propBlurDiscs: THREE.Mesh[] = [];

  const basePropY = 0.041 * scaleFactor;
  const baseBlurY = 0.042 * scaleFactor;

  armAngles.forEach((angle, idx) => {
    const mx = Math.sin(angle) * armReach;
    const mz = Math.cos(angle) * armReach;

    const arm = new THREE.Mesh(armGeo, carbonMat);
    arm.position.set(mx * 0.5, 0.01, mz * 0.5);
    arm.rotation.y = angle;
    arm.castShadow = true;
    root.add(arm);

    const ledBar = new THREE.Mesh(ledStripGeo, ledMat);
    ledBar.position.set(mx * 0.62, 0.004, mz * 0.62);
    ledBar.rotation.y = angle;
    root.add(ledBar);

    const stator = new THREE.Mesh(statorGeo, copperMat);
    stator.position.set(mx, 0.02, mz);
    root.add(stator);

    const bell = new THREE.Mesh(motorBellGeo, accentMat);
    bell.position.set(mx, 0.016, mz);
    bell.castShadow = true;
    root.add(bell);

    if (ductGeo) {
      const duct = new THREE.Mesh(ductGeo, canopyMat);
      duct.position.set(mx, 0.034, mz);
      root.add(duct);
    }

    const hub = new THREE.Group();
    hub.position.set(mx, basePropY, mz);
    for (let b = 0; b < bp.bladeCount; b++) {
      const blade = new THREE.Mesh(bladeGeo, propMat);
      blade.rotation.y = (b * Math.PI * 2) / bp.bladeCount;
      blade.rotation.x = idx % 2 === 0 ? 0.24 : -0.24;
      hub.add(blade);
    }
    propAssembly.add(hub);
    propHubs.push(hub);

    const disc = new THREE.Mesh(blurDiscGeo, blurDiscMat);
    disc.position.set(mx, baseBlurY, mz);
    propAssembly.add(disc);
    propBlurDiscs.push(disc);
  });

  // 4. Aerodynamic Canopy (ExtrudeGeometry)
  const canopyShape = new THREE.Shape();
  const cw = 0.042 * scaleFactor;
  const cl = 0.095 * scaleFactor;
  canopyShape.moveTo(0, -cl);
  canopyShape.quadraticCurveTo(cw, -cl * 0.6, cw * 0.9, cl * 0.7);
  canopyShape.lineTo(0, cl);
  canopyShape.lineTo(-cw * 0.9, cl * 0.7);
  canopyShape.quadraticCurveTo(-cw, -cl * 0.6, 0, -cl);

  const canopyGeo = new THREE.ExtrudeGeometry(canopyShape, {
    depth: 0.026 * scaleFactor,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.007,
    bevelSegments: 3,
  });
  canopyGeo.rotateX(Math.PI / 2);
  geometriesToDispose.push(canopyGeo);

  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  const canopyBaseY = 0.056 * scaleFactor;
  canopy.position.y = canopyBaseY;
  canopy.castShadow = true;
  root.add(canopy);

  // 5. Scaled LiPo / LiHV / Li-Ion Battery Pack
  const [bsx, bsy, bsz] = bp.batteryScale;
  const battGeo = new THREE.BoxGeometry(
    0.048 * scaleFactor * bsx,
    0.036 * scaleFactor * bsy,
    0.098 * scaleFactor * bsz
  );
  const strapGeo = new THREE.BoxGeometry(
    0.052 * scaleFactor * bsx,
    0.04 * scaleFactor * bsy,
    0.014 * scaleFactor
  );
  geometriesToDispose.push(battGeo, strapGeo);

  const batteryGroup = new THREE.Group();
  const batteryBaseY = -0.015 * scaleFactor;
  batteryGroup.position.set(0, batteryBaseY, 0.005);
  const battery = new THREE.Mesh(battGeo, batteryMat);
  battery.castShadow = true;
  const strap = new THREE.Mesh(strapGeo, canopyMat);
  batteryGroup.add(battery, strap);
  root.add(batteryGroup);

  // 6. FPV Camera Unit (Micro Analog, O3 Digital, or Action 4K)
  const camW =
    bp.camStyle === 'o3-digital' ? 0.042 * scaleFactor : 0.032 * scaleFactor;
  const camHousingGeo = new THREE.BoxGeometry(
    camW,
    0.031 * scaleFactor,
    0.034 * scaleFactor
  );
  const lensBarrelGeo = new THREE.CylinderGeometry(
    0.013 * scaleFactor,
    0.015 * scaleFactor,
    0.018 * scaleFactor,
    18
  );
  lensBarrelGeo.rotateX(Math.PI / 2);
  const lensGlassGeo = new THREE.SphereGeometry(0.012 * scaleFactor, 16, 12);
  geometriesToDispose.push(camHousingGeo, lensBarrelGeo, lensGlassGeo);

  const camGroup = new THREE.Group();
  const camBaseZ = -0.074 * scaleFactor;
  camGroup.position.set(0, 0.046 * scaleFactor, camBaseZ);
  camGroup.rotation.x = THREE.MathUtils.degToRad(customization.cameraTiltDeg);
  const camHousing = new THREE.Mesh(camHousingGeo, accentMat);
  const lensBarrel = new THREE.Mesh(lensBarrelGeo, accentMat);
  lensBarrel.position.z = -0.016 * scaleFactor;
  const lensGlass = new THREE.Mesh(lensGlassGeo, glassLensMat);
  lensGlass.position.z = -0.022 * scaleFactor;
  camGroup.add(camHousing, lensBarrel, lensGlass);

  if (bp.camStyle === 'action-4k') {
    const actionBodyGeo = new THREE.BoxGeometry(
      0.046 * scaleFactor,
      0.032 * scaleFactor,
      0.026 * scaleFactor
    );
    const actionLensGeo = new THREE.CylinderGeometry(
      0.012 * scaleFactor,
      0.012 * scaleFactor,
      0.012 * scaleFactor,
      16
    );
    actionLensGeo.rotateX(Math.PI / 2);
    geometriesToDispose.push(actionBodyGeo, actionLensGeo);

    const actionBody = new THREE.Mesh(actionBodyGeo, batteryMat);
    actionBody.position.set(0, 0.036 * scaleFactor, 0.008 * scaleFactor);
    const actionLens = new THREE.Mesh(actionLensGeo, glassLensMat);
    actionLens.position.set(0, 0.036 * scaleFactor, -0.008 * scaleFactor);
    camGroup.add(actionBody, actionLens);
  }
  root.add(camGroup);

  // 7. VTX Antenna (Stubby, Lollipop Dome, or Long-Range Whip)
  const antennaGroup = new THREE.Group();
  const antBaseZ = 0.088 * scaleFactor;
  antennaGroup.position.set(0.018 * scaleFactor, 0.035 * scaleFactor, antBaseZ);
  antennaGroup.rotation.x = 0.42;

  if (bp.antennaStyle === 'lollipop') {
    const mastGeo = new THREE.CylinderGeometry(0.0035, 0.004, 0.058, 12);
    mastGeo.translate(0, 0.029, 0);
    const domeGeo = new THREE.SphereGeometry(0.014, 16, 12);
    domeGeo.translate(0, 0.062, 0);
    geometriesToDispose.push(mastGeo, domeGeo);
    antennaGroup.add(
      new THREE.Mesh(mastGeo, accentMat),
      new THREE.Mesh(domeGeo, canopyMat)
    );
  } else if (bp.antennaStyle === 'long-range') {
    const whipPoints = [
      new THREE.Vector2(0.001, 0),
      new THREE.Vector2(0.005, 0),
      new THREE.Vector2(0.0035, 0.105),
      new THREE.Vector2(0.011, 0.115),
      new THREE.Vector2(0.011, 0.145),
      new THREE.Vector2(0.0, 0.149),
    ];
    const whipGeo = new THREE.LatheGeometry(whipPoints, 16);
    geometriesToDispose.push(whipGeo);
    antennaGroup.add(new THREE.Mesh(whipGeo, accentMat));
  } else {
    const antPoints = [
      new THREE.Vector2(0.001, 0),
      new THREE.Vector2(0.005, 0),
      new THREE.Vector2(0.004, 0.045),
      new THREE.Vector2(0.013, 0.055),
      new THREE.Vector2(0.013, 0.078),
      new THREE.Vector2(0.0, 0.082),
    ];
    const antGeo = new THREE.LatheGeometry(antPoints, 16);
    geometriesToDispose.push(antGeo);
    antennaGroup.add(new THREE.Mesh(antGeo, accentMat));
  }
  root.add(antennaGroup);

  const setExploded = (amount: number) => {
    const t = THREE.MathUtils.clamp(amount, 0, 1);
    stackGroup.position.y = stackBaseY + 0.044 * t;
    propAssembly.position.y = 0.072 * t;
    canopy.position.y = canopyBaseY + 0.105 * t;
    batteryGroup.position.y = batteryBaseY - 0.066 * t;
    camGroup.position.z = camBaseZ - 0.052 * t;
    antennaGroup.position.z = antBaseZ + 0.052 * t;
  };

  return {
    root,
    propHubs,
    propBlurDiscs,
    materials: {
      frame: carbonMat,
      canopy: canopyMat,
      accent: accentMat,
      prop: propMat,
      led: ledMat,
      blurDisc: blurDiscMat,
    },
    setFrameFinish: (finish: FrameFinish) => {
      applyFrameFinishToMat(carbonMat, finish);
    },
    setCameraTilt: (deg: number) => {
      camGroup.rotation.x = THREE.MathUtils.degToRad(deg);
    },
    setExploded,
    dispose: () => {
      geometriesToDispose.forEach((g) => g.dispose());
      materialsToDispose.forEach((m) => m.dispose());
      carbonMap.dispose();
      carbonBump.dispose();
    },
  };
}
