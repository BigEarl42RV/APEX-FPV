import * as THREE from 'three';
import type { DroneCustomization, DroneFrameId } from '../types/game';
import { createCarbonFiberTextures } from './proceduralTextures';

export interface DroneModelHandles {
  root: THREE.Group;
  propHubs: THREE.Group[];
  propBlurDiscs: THREE.Mesh[];
  materials: {
    canopy: THREE.MeshPhysicalMaterial;
    accent: THREE.MeshStandardMaterial;
    prop: THREE.MeshStandardMaterial;
    led: THREE.MeshStandardMaterial;
    blurDisc: THREE.MeshBasicMaterial;
  };
  dispose: () => void;
}

/**
 * Builds a composite 9-part procedural 3D FPV racing quadcopter `THREE.Group`:
 * 1. Beveled X-frame carbon chassis plate + 4 diagonal motor arms (ExtrudeGeometry)
 * 2. Aerodynamic top race canopy (ExtrudeGeometry with bevel)
 * 3. 4x Machined aluminum motor bells (LatheGeometry) + copper stator cores
 * 4. 4x Tri-blade pitched racing propellers + motion-blur prop discs
 * 5. Optional Cinewhoop aerodynamic prop ducts (for Kestrel 35)
 * 6. Underslung / top-mounted 6S LiPo battery pack + strap
 * 7. FPV Camera cage + optical glass lens (MeshPhysicalMaterial)
 * 8. SMA VTX stubby antenna (LatheGeometry)
 * 9. Programmable arm LED light bars
 */
export function buildProceduralDroneModel(
  frameId: DroneFrameId,
  customization: DroneCustomization,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): DroneModelHandles {
  const root = new THREE.Group();
  const { map: carbonMap, bumpMap: carbonBump } =
    createCarbonFiberTextures(maxAnisotropy);

  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const materialsToDispose: THREE.Material[] = [];

  const scaleFactor = frameId === 'helios-7' ? 1.28 : frameId === 'kestrel-35' ? 0.88 : 1.0;
  const armReach = 0.145 * scaleFactor;

  // Materials with calibrated PBR contrast (varied roughness & metalness >= 0.25)
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: carbonMap,
    bumpMap: carbonBump,
    bumpScale: 0.004,
    roughness: 0.42,
    metalness: 0.25,
  });
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
    propMat,
    blurDiscMat,
    ledMat,
    batteryMat,
    glassLensMat
  );

  // 1. Beveled Carbon Bottom Plate (ExtrudeGeometry)
  const plateShape = new THREE.Shape();
  const w = 0.058 * scaleFactor;
  const l = 0.11 * scaleFactor;
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

  // 4 Carbon X-Arms + Motor Pods
  const armAngles = [
    Math.PI * 0.25,
    -Math.PI * 0.25,
    Math.PI * 0.75,
    -Math.PI * 0.75,
  ];
  const armLength = armReach * 1.414;
  const armGeo = new THREE.BoxGeometry(0.022 * scaleFactor, 0.009, armLength);
  const ledStripGeo = new THREE.BoxGeometry(0.014 * scaleFactor, 0.004, armLength * 0.52);
  geometriesToDispose.push(armGeo, ledStripGeo);

  // Machined Motor Bell (LatheGeometry)
  const bellPoints = [
    new THREE.Vector2(0.001, 0),
    new THREE.Vector2(0.02 * scaleFactor, 0),
    new THREE.Vector2(0.021 * scaleFactor, 0.014 * scaleFactor),
    new THREE.Vector2(0.017 * scaleFactor, 0.019 * scaleFactor),
    new THREE.Vector2(0.005 * scaleFactor, 0.021 * scaleFactor),
    new THREE.Vector2(0.004 * scaleFactor, 0.028 * scaleFactor),
    new THREE.Vector2(0.0, 0.028 * scaleFactor),
  ];
  const motorBellGeo = new THREE.LatheGeometry(bellPoints, 20);
  const statorGeo = new THREE.CylinderGeometry(
    0.016 * scaleFactor,
    0.016 * scaleFactor,
    0.012 * scaleFactor,
    16
  );
  geometriesToDispose.push(motorBellGeo, statorGeo);

  // Duct ring for Cinewhoop frame
  const ductGeo =
    frameId === 'kestrel-35'
      ? new THREE.TorusGeometry(0.098 * scaleFactor, 0.009, 10, 28)
      : null;
  if (ductGeo) {
    ductGeo.rotateX(Math.PI / 2);
    geometriesToDispose.push(ductGeo);
  }

  // Tri-blade propeller shape
  const bladeGeo = new THREE.BoxGeometry(0.016 * scaleFactor, 0.0025, 0.075 * scaleFactor);
  bladeGeo.translate(0, 0, 0.042 * scaleFactor);
  const blurDiscGeo = new THREE.CircleGeometry(0.085 * scaleFactor, 24);
  blurDiscGeo.rotateX(-Math.PI / 2);
  geometriesToDispose.push(bladeGeo, blurDiscGeo);

  const propHubs: THREE.Group[] = [];
  const propBlurDiscs: THREE.Mesh[] = [];

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
    hub.position.set(mx, 0.041 * scaleFactor, mz);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(bladeGeo, propMat);
      blade.rotation.y = (b * Math.PI * 2) / 3;
      blade.rotation.x = idx % 2 === 0 ? 0.24 : -0.24;
      hub.add(blade);
    }
    root.add(hub);
    propHubs.push(hub);

    const disc = new THREE.Mesh(blurDiscGeo, blurDiscMat);
    disc.position.set(mx, 0.042 * scaleFactor, mz);
    root.add(disc);
    propBlurDiscs.push(disc);
  });

  // 2. Aerodynamic Canopy (ExtrudeGeometry)
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
  canopy.position.y = 0.056 * scaleFactor;
  canopy.castShadow = true;
  root.add(canopy);

  // 6. 6S LiPo Battery Pack (top-mounted racing strap)
  const battGeo = new THREE.BoxGeometry(
    0.048 * scaleFactor,
    0.036 * scaleFactor,
    0.098 * scaleFactor
  );
  geometriesToDispose.push(battGeo);
  const battery = new THREE.Mesh(battGeo, batteryMat);
  battery.position.set(0, -0.015 * scaleFactor, 0.005);
  battery.castShadow = true;
  root.add(battery);

  // 7. FPV Camera Cage + Optical Glass Lens
  const camHousingGeo = new THREE.BoxGeometry(
    0.034 * scaleFactor,
    0.032 * scaleFactor,
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
  camGroup.position.set(0, 0.046 * scaleFactor, -0.072 * scaleFactor);
  camGroup.rotation.x = THREE.MathUtils.degToRad(customization.cameraTiltDeg);
  const camHousing = new THREE.Mesh(camHousingGeo, accentMat);
  const lensBarrel = new THREE.Mesh(lensBarrelGeo, accentMat);
  lensBarrel.position.z = -0.016 * scaleFactor;
  const lensGlass = new THREE.Mesh(lensGlassGeo, glassLensMat);
  lensGlass.position.z = -0.022 * scaleFactor;
  camGroup.add(camHousing, lensBarrel, lensGlass);
  root.add(camGroup);

  // 8. VTX Stubby Antenna (LatheGeometry)
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
  const antenna = new THREE.Mesh(antGeo, accentMat);
  antenna.position.set(0.018 * scaleFactor, 0.035 * scaleFactor, 0.085 * scaleFactor);
  antenna.rotation.x = 0.42;
  root.add(antenna);

  return {
    root,
    propHubs,
    propBlurDiscs,
    materials: {
      canopy: canopyMat,
      accent: accentMat,
      prop: propMat,
      led: ledMat,
      blurDisc: blurDiscMat,
    },
    dispose: () => {
      geometriesToDispose.forEach((g) => g.dispose());
      materialsToDispose.forEach((m) => m.dispose());
      carbonMap.dispose();
      carbonBump.dispose();
    },
  };
}
