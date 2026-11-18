import * as THREE from 'three';
import { WeaponId } from '../types/game';
import { TextureBundle } from './textures';

export interface AnimatedModelParts {
  spinners?: THREE.Object3D[];
  limbs?: THREE.Object3D[];
  eyeMaterials?: THREE.MeshStandardMaterial[];
  muzzlePoint?: THREE.Object3D;
  muzzleFlash?: THREE.Sprite;
  shieldRing?: THREE.Object3D;
}

export function createWeaponViewModel(
  weaponId: WeaponId,
  textures: TextureBundle
): { group: THREE.Group; parts: AnimatedModelParts } {
  const group = new THREE.Group();
  const parts: AnimatedModelParts = {};

  const gunmetal = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.28,
  });
  const mattePolymer = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.2,
    roughness: 0.72,
  });
  const brushedSteel = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.9,
    roughness: 0.2,
  });

  const accentColor =
    weaponId === 'pulse' ? 0x38bdf8 : weaponId === 'scatter' ? 0xf59e0b : 0xef4444;

  const glowMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 2.2,
    metalness: 0.1,
    roughness: 0.2,
  });

  if (weaponId === 'pulse') {
    // Primary receiver
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.56), gunmetal);
    body.position.set(0, 0, -0.1);
    group.add(body);

    // Polymer lower handguard & grip
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.36), mattePolymer);
    lower.position.set(0, -0.09, -0.06);
    group.add(lower);

    // Shrouded dual barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.42, 10), brushedSteel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.48);
    group.add(barrel);

    // Side plasma rails
    [-0.058, 0.058].forEach((x) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.032, 0.46), glowMat);
      rail.position.set(x, 0.02, -0.2);
      group.add(rail);
    });

    // Holographic optic frame + reticle glass
    const opticBase = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.055, 0.1), mattePolymer);
    opticBase.position.set(0, 0.095, -0.04);
    group.add(opticBase);

    const opticGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.045, 0.035),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      })
    );
    opticGlass.position.set(0, 0.1, -0.04);
    group.add(opticGlass);
  } else if (weaponId === 'scatter') {
    // Heavy wide receiver
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.48), gunmetal);
    body.position.set(0, -0.01, -0.1);
    group.add(body);

    // Amber hazard shroud
    const shroud = new THREE.Mesh(
      new THREE.BoxGeometry(0.165, 0.09, 0.32),
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.5,
        roughness: 0.42,
      })
    );
    shroud.position.set(0, 0.03, -0.18);
    group.add(shroud);

    // Twin heavy barrels
    [-0.036, 0.036].forEach((x) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.4, 10), brushedSteel);
      b.rotation.x = Math.PI / 2;
      b.position.set(x, 0.025, -0.44);
      group.add(b);
    });

    // Heat vent core
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 12), glowMat);
    core.rotation.x = Math.PI / 2;
    core.position.set(0, -0.03, -0.32);
    group.add(core);
  } else {
    // Valkyrie Rail Lance: sleek long accelerator rails
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.62), mattePolymer);
    body.position.set(0, 0, -0.12);
    group.add(body);

    // Upper & lower accelerator prongs
    [-0.04, 0.05].forEach((y) => {
      const prong = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.032, 0.62), brushedSteel);
      prong.position.set(0, y, -0.44);
      group.add(prong);
    });

    // Central crimson capacitor rod
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.58, 8), glowMat);
    rod.rotation.x = Math.PI / 2;
    rod.position.set(0, 0.005, -0.44);
    group.add(rod);

    // Precision scope tube
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.24, 12), gunmetal);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.1, -0.08);
    group.add(scope);

    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.024, 12), glowMat);
    lens.position.set(0, 0.1, 0.041);
    group.add(lens);
  }

  // Muzzle point & additive muzzle flash sprite
  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.02, weaponId === 'rail' ? -0.76 : -0.68);
  group.add(muzzlePoint);

  const flashTex =
    weaponId === 'pulse'
      ? textures.glowCyan
      : weaponId === 'scatter'
      ? textures.glowOrange
      : textures.glowRed;
  const flashMat = new THREE.SpriteMaterial({
    map: flashTex,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const muzzleFlash = new THREE.Sprite(flashMat);
  muzzleFlash.scale.set(0.45, 0.45, 1);
  muzzlePoint.add(muzzleFlash);

  parts.muzzlePoint = muzzlePoint;
  parts.muzzleFlash = muzzleFlash;
  return { group, parts };
}

export function createSentinelDroneModel(textures: TextureBundle): {
  group: THREE.Group;
  parts: AnimatedModelParts;
} {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x283548,
    metalness: 0.85,
    roughness: 0.25,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.3,
    roughness: 0.65,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 2.4,
    roughness: 0.2,
  });
  const thrusterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 2.0,
  });

  // Core chassis (hover center at y=1.55)
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), hullMat);
  core.position.y = 1.55;
  core.castShadow = true;
  group.add(core);

  // Rotating gyro ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 8, 20), trimMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.55;
  group.add(ring);

  // Twin side weapon nacelles
  [-0.68, 0.68].forEach((x) => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.56), hullMat);
    pod.position.set(x, 1.52, 0.05);
    pod.castShadow = true;
    group.add(pod);

    const exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 8), thrusterMat);
    exhaust.rotation.x = -Math.PI / 2;
    exhaust.position.set(x, 1.52, -0.34);
    group.add(exhaust);
  });

  // Front targeting eye + glow halo
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), eyeMat);
  eye.position.set(0, 1.58, 0.4);
  group.add(eye);

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glowRed,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  halo.scale.set(0.95, 0.95, 1);
  halo.position.set(0, 1.58, 0.5);
  group.add(halo);

  // Top sensor mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.4, 8), trimMat);
  mast.position.set(0, 2.15, -0.08);
  group.add(mast);

  return {
    group,
    parts: {
      spinners: [ring],
      eyeMaterials: [eyeMat],
    },
  };
}

export function createBattleMechModel(textures: TextureBundle): {
  group: THREE.Group;
  parts: AnimatedModelParts;
} {
  const group = new THREE.Group();
  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.8,
    roughness: 0.3,
  });
  const darkJointMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.35,
    roughness: 0.7,
  });
  const accentArmor = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.45,
    roughness: 0.45,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 2.3,
  });

  // Grounded legs (bottom at y = 0)
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.34, 0.95, 0);
  const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.95, 0.32), armorMat);
  lThigh.position.y = -0.475;
  lThigh.castShadow = true;
  leftLeg.add(lThigh);
  const lFoot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.48), darkJointMat);
  lFoot.position.set(0, -0.87, 0.06);
  leftLeg.add(lFoot);
  group.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.34, 0.95, 0);
  const rThigh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.95, 0.32), armorMat);
  rThigh.position.y = -0.475;
  rThigh.castShadow = true;
  rightLeg.add(rThigh);
  const rFoot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.48), darkJointMat);
  rFoot.position.set(0, -0.87, 0.06);
  rightLeg.add(rFoot);
  group.add(rightLeg);

  // Pelvis & torso
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.28, 0.5), darkJointMat);
  pelvis.position.y = 1.08;
  group.add(pelvis);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.92, 0.72), armorMat);
  torso.position.y = 1.66;
  torso.castShadow = true;
  group.add(torso);

  // Glowing chest reactor core
  const chestCore = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 12), coreMat);
  chestCore.rotation.x = Math.PI / 2;
  chestCore.position.set(0, 1.66, 0.35);
  group.add(chestCore);

  // Shoulder cannon arms
  [-0.78, 0.78].forEach((x) => {
    const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.44, 0.62), accentArmor);
    pauldron.position.set(x, 1.94, 0.05);
    pauldron.castShadow = true;
    group.add(pauldron);

    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.72, 10), darkJointMat);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.set(x, 1.72, 0.32);
    group.add(cannon);
  });

  // Armored head + glowing red sensor visor
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.46), armorMat);
  head.position.set(0, 2.3, 0.04);
  group.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.08), coreMat);
  visor.position.set(0, 2.32, 0.26);
  group.add(visor);

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glowOrange,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  halo.scale.set(1.1, 1.1, 1);
  halo.position.set(0, 1.66, 0.45);
  group.add(halo);

  return {
    group,
    parts: {
      limbs: [leftLeg, rightLeg],
      eyeMaterials: [coreMat],
    },
  };
}

export function createXenoStalkerModel(textures: TextureBundle): {
  group: THREE.Group;
  parts: AnimatedModelParts;
} {
  const group = new THREE.Group();
  const chitinMat = new THREE.MeshStandardMaterial({
    color: 0x2e1a36,
    metalness: 0.25,
    roughness: 0.55,
  });
  const clawMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.6,
    roughness: 0.3,
  });
  const bioMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xf97316,
    emissiveIntensity: 2.2,
  });

  // Hunched alien thorax
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.85, 6, 12), chitinMat);
  body.rotation.x = Math.PI / 2.4;
  body.position.set(0, 0.95, 0);
  body.castShadow = true;
  group.add(body);

  // Dorsal glowing spines
  for (let i = 0; i < 3; i++) {
    const spine = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.34, 6), bioMat);
    spine.rotation.x = -0.5;
    spine.position.set(0, 1.28 - i * 0.12, -0.15 - i * 0.24);
    group.add(spine);
  }

  // Head + twin glowing eyes
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.58, 7), chitinMat);
  head.rotation.x = Math.PI / 2;
  head.position.set(0, 1.12, 0.62);
  group.add(head);

  [-0.12, 0.12].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), bioMat);
    eye.position.set(x, 1.18, 0.72);
    group.add(eye);
  });

  // Articulated legs / scythe arms
  const limbs: THREE.Object3D[] = [];
  [-0.4, 0.4].forEach((x) => {
    const arm = new THREE.Group();
    arm.position.set(x, 0.95, 0.34);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.82, 0.18), clawMat);
    blade.position.set(0, -0.35, 0.18);
    blade.rotation.x = -0.35;
    arm.add(blade);
    group.add(arm);
    limbs.push(arm);

    const leg = new THREE.Group();
    leg.position.set(x * 0.85, 0.72, -0.24);
    const legMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.72, 0.18), chitinMat);
    legMesh.position.y = -0.36;
    leg.add(legMesh);
    group.add(leg);
    limbs.push(leg);
  });

  const aura = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glowOrange,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  aura.scale.set(1.2, 1.2, 1);
  aura.position.set(0, 1.1, 0.4);
  group.add(aura);

  return {
    group,
    parts: {
      limbs,
      eyeMaterials: [bioMat],
    },
  };
}

export function createOmegaBossModel(textures: TextureBundle): {
  group: THREE.Group;
  parts: AnimatedModelParts;
} {
  const group = new THREE.Group();
  const darkSteel = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.88,
    roughness: 0.24,
  });
  const trimSteel = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.92,
    roughness: 0.18,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.4,
    roughness: 0.45,
  });
  const redCoreMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 2.8,
  });
  const cyanCoreMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 2.2,
  });

  // 4 Massive Spider-Fortress Struts (inspired by reference image giant mech/turret)
  const limbs: THREE.Object3D[] = [];
  const legAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  legAngles.forEach((ang) => {
    const legRoot = new THREE.Group();
    const lx = Math.cos(ang) * 2.2;
    const lz = Math.sin(ang) * 2.2;
    legRoot.position.set(lx, 2.2, lz);
    legRoot.rotation.y = -ang;

    const upper = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.65), darkSteel);
    upper.position.set(0.6, 0.1, 0);
    upper.rotation.z = -0.35;
    upper.castShadow = true;
    legRoot.add(upper);

    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.35, 0.68), trimSteel);
    lower.position.set(1.25, -1.02, 0);
    lower.castShadow = true;
    legRoot.add(lower);

    const footGlow = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.2, 0.8), cyanCoreMat);
    footGlow.position.set(1.25, -2.1, 0);
    legRoot.add(footGlow);

    group.add(legRoot);
    limbs.push(legRoot);
  });

  // Central fortress hull
  const baseHull = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.7, 1.9, 8), darkSteel);
  baseHull.position.y = 2.6;
  baseHull.castShadow = true;
  group.add(baseHull);

  // Hazard collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 0.32, 8), hazardMat);
  collar.position.y = 1.75;
  group.add(collar);

  // Upper turret housing
  const turret = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.85, 2.9), darkSteel);
  turret.position.y = 4.25;
  turret.castShadow = true;
  group.add(turret);

  // Twin quad-rocket / plasma cannon pods (reference image red square array pods!)
  [-2.05, 2.05].forEach((x) => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.1, 1.7), trimSteel);
    pod.position.set(x, 4.35, 0.35);
    pod.castShadow = true;
    group.add(pod);

    // 2x2 glowing red emitter barrels
    [-0.22, 0.22].forEach((bx) => {
      [-0.22, 0.22].forEach((by) => {
        const emitter = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.16), redCoreMat);
        emitter.position.set(x + bx, 4.35 + by, 1.22);
        group.add(emitter);
      });
    });
  });

  // Central crimson radar spire & core eye
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.55, 1.35, 8), trimSteel);
  spire.position.set(0, 5.7, -0.2);
  group.add(spire);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), redCoreMat);
  beacon.position.set(0, 6.45, -0.2);
  group.add(beacon);

  const mainEye = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 0.3), redCoreMat);
  mainEye.position.set(0, 4.3, 1.48);
  group.add(mainEye);

  // Rotating cyan gravity shield ring
  const shieldRing = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.09, 10, 32), cyanCoreMat);
  shieldRing.rotation.x = Math.PI / 2;
  shieldRing.position.y = 3.2;
  group.add(shieldRing);

  const bossHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glowRed,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  bossHalo.scale.set(4.5, 4.5, 1);
  bossHalo.position.set(0, 4.3, 1.75);
  group.add(bossHalo);

  return {
    group,
    parts: {
      limbs,
      spinners: [shieldRing],
      shieldRing,
      eyeMaterials: [redCoreMat],
    },
  };
}

export function createGravityPadModel(textures: TextureBundle): {
  group: THREE.Group;
  ring: THREE.Mesh;
} {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.3,
  });
  const cyanMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 2.2,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.75, 0.22, 16), baseMat);
  base.position.y = 0.11;
  group.add(base);

  const padDisk = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.26, 16), cyanMat);
  padDisk.position.y = 0.13;
  group.add(padDisk);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.06, 8, 24), cyanMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.85;
  group.add(ring);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glowCyan,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.scale.set(3.2, 3.2, 1);
  glow.position.y = 0.6;
  group.add(glow);

  return { group, ring };
}

export function createVolatileBarrelModel(textures: TextureBundle): THREE.Group {
  const group = new THREE.Group();
  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    metalness: 0.65,
    roughness: 0.38,
  });
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf97316,
    emissiveIntensity: 1.6,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.25,
  });

  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.35, 14), barrelMat);
  cyl.position.y = 0.675;
  cyl.castShadow = true;
  group.add(cyl);

  [0.35, 1.0].forEach((y) => {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.12, 14), bandMat);
    band.position.y = y;
    group.add(band);
  });

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.1, 14), capMat);
  cap.position.y = 1.35;
  group.add(cap);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.glowOrange,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.scale.set(1.5, 1.5, 1);
  glow.position.y = 0.7;
  group.add(glow);

  return group;
}

export function createPickupModel(type: 'health' | 'armor' | 'ammo'): THREE.Group {
  const group = new THREE.Group();
  const color = type === 'health' ? 0x10b981 : type === 'armor' ? 0x38bdf8 : 0xf59e0b;
  const caseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.75,
    roughness: 0.3,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 2.0,
  });

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.42, 0.48), caseMat);
  box.position.y = 0.45;
  group.add(box);

  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.1, 0.5), glowMat);
  strip.position.y = 0.45;
  group.add(strip);

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), glowMat);
  crystal.position.y = 0.85;
  group.add(crystal);

  return group;
}

export function createObjectiveConsoleModel(accentColor: number): {
  group: THREE.Group;
  core: THREE.Mesh;
} {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.28,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 2.2,
  });

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 0.45, 8), frameMat);
  pedestal.position.y = 0.225;
  pedestal.castShadow = true;
  group.add(pedestal);

  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.5, 0.65), frameMat);
  pillar.position.y = 1.15;
  pillar.castShadow = true;
  group.add(pillar);

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.44, 0), accentMat);
  core.position.y = 2.35;
  group.add(core);

  const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 8, 20), accentMat);
  haloRing.rotation.x = Math.PI / 2;
  haloRing.position.y = 2.35;
  group.add(haloRing);

  return { group, core };
}
