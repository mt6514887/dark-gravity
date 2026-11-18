import * as THREE from 'three';
import { GameMode, MISSIONS, MissionConfig } from '../types/game';
import { TextureBundle } from './textures';

export interface BoxCollider {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  isPlatform?: boolean; // walkable top surface
}

export interface EnemySpawnDef {
  kind: 'drone' | 'mech' | 'stalker' | 'boss';
  x: number;
  y: number;
  z: number;
  patrolOffset?: [number, number];
}

export interface ObjectiveDef {
  id: string;
  x: number;
  y: number;
  z: number;
  mode: 'interact' | 'destroy';
}

export interface LevelBlueprint {
  title: string;
  subtitle: string;
  objectiveLabel: string;
  gravityScale: number;
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  accentColor: number;
  playerStart: THREE.Vector3;
  playerYaw: number;
  colliders: BoxCollider[];
  gravityPads: THREE.Vector3[];
  barrels: THREE.Vector3[];
  pickups: { type: 'health' | 'armor' | 'ammo'; pos: THREE.Vector3 }[];
  objectives: ObjectiveDef[];
  enemies: EnemySpawnDef[];
  animatedObjects: { mesh: THREE.Object3D; speed: number; axis: 'x' | 'y' | 'z' }[];
}

export function buildLevel(
  scene: THREE.Scene,
  mode: GameMode,
  missionId: number,
  textures: TextureBundle
): LevelBlueprint {
  const mission: MissionConfig =
    MISSIONS.find((m) => m.id === missionId) || MISSIONS[0];

  const colliders: BoxCollider[] = [];
  const gravityPads: THREE.Vector3[] = [];
  const barrels: THREE.Vector3[] = [];
  const pickups: { type: 'health' | 'armor' | 'ammo'; pos: THREE.Vector3 }[] = [];
  const objectives: ObjectiveDef[] = [];
  const enemies: EnemySpawnDef[] = [];
  const animatedObjects: { mesh: THREE.Object3D; speed: number; axis: 'x' | 'y' | 'z' }[] = [];

  // Determine theme parameters based on mode
  let floorTheme = mission.floorTheme;
  let skyColor = mission.skyColor;
  let fogColor = mission.fogColor;
  let fogDensity = mission.fogDensity;
  let gravityScale = mission.gravityScale;
  let title = mission.title;
  let subtitle = mission.subtitle;
  let objectiveLabel = mission.objectiveLabel;
  let accentColor = new THREE.Color(mission.accentHex).getHex();

  if (mode === 'survival') {
    floorTheme = 'factory';
    skyColor = 0x090d16;
    fogColor = 0x0c1220;
    fogDensity = 0.012;
    gravityScale = 0.92;
    title = 'Survival Arena';
    subtitle = 'Endless Hostile Waves';
    objectiveLabel = 'Survive Enemy Waves';
    accentColor = 0xf59e0b;
  } else if (mode === 'training') {
    floorTheme = 'lab';
    skyColor = 0x07101c;
    fogColor = 0x091524;
    fogDensity = 0.01;
    gravityScale = 0.9;
    title = 'Tactical Training Facility';
    subtitle = 'Weapons & Gravity Mobility Course';
    objectiveLabel = 'Destroy Training Drones';
    accentColor = 0x38bdf8;
  } else if (mode === 'boss') {
    floorTheme = 'core';
    skyColor = 0x070412;
    fogColor = 0x0d0720;
    fogDensity = 0.01;
    gravityScale = 0.78;
    title = 'Boss Battle: Omega Warden';
    subtitle = 'Dark Gravity Citadel';
    objectiveLabel = 'Destroy Omega Gravity Warden';
    accentColor = 0xef4444;
  }

  scene.background = new THREE.Color(skyColor);
  scene.fog = new THREE.FogExp2(fogColor, fogDensity);

  // Lighting rig (Warm/Cool contrast + hemisphere fill)
  const hemi = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.75);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(
    floorTheme === 'factory' || floorTheme === 'alien' ? 0xffedd5 : 0xe0f2fe,
    1.65
  );
  keyLight.position.set(22, 38, 18);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 2;
  keyLight.shadow.camera.far = 110;
  const d = 44;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(accentColor, 0.85);
  rimLight.position.set(-28, 16, -24);
  scene.add(rimLight);

  // Select floor texture
  const floorTex =
    floorTheme === 'station'
      ? textures.stationFloor
      : floorTheme === 'factory'
      ? textures.factoryFloor
      : floorTheme === 'lab'
      ? textures.labFloor
      : floorTheme === 'alien'
      ? textures.alienFloor
      : textures.coreFloor;

  const arenaHalf = 42;
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: floorTheme === 'alien' ? 0.85 : 0.42,
    metalness: floorTheme === 'alien' ? 0.12 : 0.65,
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(arenaHalf * 2 + 40, arenaHalf * 2 + 40),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Shared materials
  const wallMat = new THREE.MeshStandardMaterial({
    map: textures.wallMetal,
    roughness: 0.48,
    metalness: 0.72,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    map: textures.hazardTrim,
    roughness: 0.5,
    metalness: 0.4,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x161f2c,
    roughness: 0.35,
    metalness: 0.85,
  });
  const neonMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 2.0,
  });

  // Helper to place solid box block + collider
  const addBlock = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    dSize: number,
    mat: THREE.Material = wallMat,
    isPlatform = false
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, dSize), mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: y,
      maxY: y + h,
      minZ: z - dSize / 2,
      maxZ: z + dSize / 2,
      isPlatform,
    });
    return mesh;
  };

  // Perimeter boundary walls (or alien cliffs for Mission 4)
  if (floorTheme === 'alien') {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x2a1f3d,
      roughness: 0.9,
      metalness: 0.1,
    });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0.3,
    });
    // Natural rocky perimeter ring + glowing crystals
    for (let i = 0; i < 32; i++) {
      const ang = (i / 32) * Math.PI * 2;
      const rx = Math.cos(ang) * arenaHalf;
      const rz = Math.sin(ang) * arenaHalf;
      const bw = 11;
      const bh = 9 + (i % 3) * 3;
      const cliff = new THREE.Mesh(new THREE.DodecahedronGeometry(bw * 0.65, 0), rockMat);
      cliff.position.set(rx, bh * 0.35, rz);
      cliff.scale.set(1, bh / 7, 1);
      cliff.castShadow = true;
      cliff.receiveShadow = true;
      scene.add(cliff);

      colliders.push({
        minX: rx - 4.5,
        maxX: rx + 4.5,
        minY: 0,
        maxY: bh,
        minZ: rz - 4.5,
        maxZ: rz + 4.5,
      });

      if (i % 4 === 0) {
        const spire = new THREE.Mesh(new THREE.ConeGeometry(1.1, 6.5, 5), crystalMat);
        spire.position.set(rx * 0.88, 3.2, rz * 0.88);
        spire.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.18;
        scene.add(spire);
      }
    }
  } else {
    // Sci-fi armored perimeter walls with glowing neon strips
    const wallH = 11;
    const thickness = 3;
    addBlock(0, 0, -arenaHalf, arenaHalf * 2 + thickness, wallH, thickness, wallMat);
    addBlock(0, 0, arenaHalf, arenaHalf * 2 + thickness, wallH, thickness, wallMat);
    addBlock(-arenaHalf, 0, 0, thickness, wallH, arenaHalf * 2, wallMat);
    addBlock(arenaHalf, 0, 0, thickness, wallH, arenaHalf * 2, wallMat);

    // Glowing architectural wall light strips
    const stripGeo = new THREE.BoxGeometry(arenaHalf * 1.8, 0.28, 0.25);
    const sNorth = new THREE.Mesh(stripGeo, neonMat);
    sNorth.position.set(0, 4.5, -arenaHalf + 1.55);
    scene.add(sNorth);
    const sSouth = new THREE.Mesh(stripGeo, neonMat);
    sSouth.position.set(0, 4.5, arenaHalf - 1.55);
    scene.add(sSouth);
  }

  // Starfield / sky dome particles for space station & core & alien night sky
  if (floorTheme === 'station' || floorTheme === 'core' || floorTheme === 'alien') {
    const starCount = 450;
    const posArr = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45;
      const r = 130 + Math.random() * 40;
      posArr[i * 3] = Math.cos(theta) * Math.cos(phi) * r;
      posArr[i * 3 + 1] = Math.sin(phi) * r + 15;
      posArr[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const starMat = new THREE.PointsMaterial({
      color: floorTheme === 'alien' ? 0xfdba74 : 0xbae6fd,
      size: 0.9,
      transparent: true,
      opacity: 0.85,
    });
    scene.add(new THREE.Points(starGeo, starMat));
  }

  // Build unique interior geometry, elevated catwalks, cover, enemies, and objectives per mode/mission
  const playerStart = new THREE.Vector3(0, 0, 28);
  const playerYaw = 0;

  if (mode === 'training') {
    // Firing range lanes + elevated gravity course + explosive barrels
    addBlock(-14, 0, 6, 8, 2.4, 2.2, trimMat, true);
    addBlock(14, 0, 6, 8, 2.4, 2.2, trimMat, true);
    addBlock(0, 0, 12, 6, 1.5, 1.8, darkMetalMat, true);

    // Elevated sniper bridge
    addBlock(0, 3.6, -24, 26, 0.7, 7, darkMetalMat, true);
    gravityPads.push(new THREE.Vector3(-16, 0, -24), new THREE.Vector3(16, 0, -24));

    // Range partitions
    [-12, 12].forEach((x) => {
      addBlock(x, 0, -8, 1.5, 4, 12, wallMat);
    });

    // Volatile barrels for target practice
    barrels.push(
      new THREE.Vector3(-6, 0, -4),
      new THREE.Vector3(6, 0, -4),
      new THREE.Vector3(0, 0, -14)
    );

    // Training drones
    enemies.push(
      { kind: 'drone', x: -8, y: 0, z: -12, patrolOffset: [6, 0] },
      { kind: 'drone', x: 8, y: 0, z: -12, patrolOffset: [-6, 0] },
      { kind: 'drone', x: 0, y: 0, z: -20, patrolOffset: [8, 0] },
      { kind: 'mech', x: -18, y: 0, z: -16 },
      { kind: 'mech', x: 18, y: 0, z: -16 },
      { kind: 'drone', x: 0, y: 4.3, z: -24, patrolOffset: [8, 0] }
    );

    pickups.push(
      { type: 'ammo', pos: new THREE.Vector3(-5, 0, 20) },
      { type: 'health', pos: new THREE.Vector3(5, 0, 20) },
      { type: 'armor', pos: new THREE.Vector3(0, 0, 16) }
    );
  } else if (mode === 'survival') {
    // Symmetrical multi-tier industrial combat arena
    addBlock(0, 3.8, 0, 14, 0.8, 14, darkMetalMat, true); // Center elevated hub
    addBlock(-22, 0, -16, 8, 4.5, 8, wallMat, true);
    addBlock(22, 0, -16, 8, 4.5, 8, wallMat, true);
    addBlock(-22, 0, 16, 8, 4.5, 8, wallMat, true);
    addBlock(22, 0, 16, 8, 4.5, 8, wallMat, true);

    // Low tactical cover walls
    addBlock(-10, 0, 12, 6, 1.8, 1.8, trimMat, true);
    addBlock(10, 0, 12, 6, 1.8, 1.8, trimMat, true);
    addBlock(-10, 0, -12, 6, 1.8, 1.8, trimMat, true);
    addBlock(10, 0, -12, 6, 1.8, 1.8, trimMat, true);

    gravityPads.push(
      new THREE.Vector3(0, 0, 10),
      new THREE.Vector3(0, 0, -10),
      new THREE.Vector3(-28, 0, 0),
      new THREE.Vector3(28, 0, 0)
    );

    barrels.push(
      new THREE.Vector3(-14, 0, 0),
      new THREE.Vector3(14, 0, 0),
      new THREE.Vector3(0, 0, -24),
      new THREE.Vector3(0, 0, 22)
    );

    pickups.push(
      { type: 'health', pos: new THREE.Vector3(-18, 0, 0) },
      { type: 'armor', pos: new THREE.Vector3(18, 0, 0) },
      { type: 'ammo', pos: new THREE.Vector3(0, 4.6, 0) },
      { type: 'ammo', pos: new THREE.Vector3(0, 0, 20) }
    );

    // Wave 1 initial spawns (GameEngine spawns escalating waves automatically)
    enemies.push(
      { kind: 'drone', x: -16, y: 0, z: -24, patrolOffset: [8, 4] },
      { kind: 'drone', x: 16, y: 0, z: -24, patrolOffset: [-8, 4] },
      { kind: 'mech', x: 0, y: 0, z: -28 },
      { kind: 'stalker', x: -24, y: 0, z: -6 }
    );
  } else if (mode === 'boss' || missionId === 5) {
    // Dark Gravity Core / Boss Citadel
    // Giant rotating singularity rings above center
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.5,
      metalness: 0.9,
      roughness: 0.15,
    });
    const singularity = new THREE.Mesh(new THREE.OctahedronGeometry(3.2, 1), coreMat);
    singularity.position.set(0, 15, -12);
    scene.add(singularity);
    animatedObjects.push({ mesh: singularity, speed: 0.8, axis: 'y' });

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 1.8,
    });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.22, 10, 36), ringMat);
    ring1.position.set(0, 15, -12);
    scene.add(ring1);
    animatedObjects.push({ mesh: ring1, speed: 1.1, axis: 'x' });

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.18, 10, 36), coreMat);
    ring2.position.set(0, 15, -12);
    scene.add(ring2);
    animatedObjects.push({ mesh: ring2, speed: -0.7, axis: 'z' });

    // Protective cover pillars around boss chamber
    [
      [-16, 8],
      [16, 8],
      [-20, -10],
      [20, -10],
      [-10, 18],
      [10, 18],
    ].forEach(([px, pz]) => {
      addBlock(px, 0, pz, 3.6, 5.5, 3.6, wallMat);
    });

    // Side sniper catwalks
    addBlock(-29, 4.2, -4, 7, 0.7, 22, darkMetalMat, true);
    addBlock(29, 4.2, -4, 7, 0.7, 22, darkMetalMat, true);
    gravityPads.push(new THREE.Vector3(-29, 0, 12), new THREE.Vector3(29, 0, 12));

    barrels.push(
      new THREE.Vector3(-12, 0, -4),
      new THREE.Vector3(12, 0, -4),
      new THREE.Vector3(-8, 0, 10),
      new THREE.Vector3(8, 0, 10)
    );

    pickups.push(
      { type: 'health', pos: new THREE.Vector3(-24, 0, 18) },
      { type: 'armor', pos: new THREE.Vector3(24, 0, 18) },
      { type: 'ammo', pos: new THREE.Vector3(-29, 4.9, -4) },
      { type: 'ammo', pos: new THREE.Vector3(29, 4.9, -4) }
    );

    if (mode === 'campaign' && missionId === 5) {
      objectives.push(
        { id: 'pylon-1', x: -29, y: 4.9, z: -10, mode: 'destroy' },
        { id: 'pylon-2', x: 29, y: 4.9, z: -10, mode: 'destroy' }
      );
    }

    enemies.push(
      { kind: 'boss', x: 0, y: 0, z: -16 },
      { kind: 'drone', x: -16, y: 0, z: -20, patrolOffset: [6, 0] },
      { kind: 'drone', x: 16, y: 0, z: -20, patrolOffset: [-6, 0] }
    );
  } else if (missionId === 1) {
    // Mission 1: Abandoned Space Station (Corridors, airlock bay, low-G lift platforms)
    addBlock(-12, 0, 8, 2.5, 6, 18, wallMat);
    addBlock(12, 0, 8, 2.5, 6, 18, wallMat);
    addBlock(-24, 0, -8, 12, 5, 3, wallMat);
    addBlock(24, 0, -8, 12, 5, 3, wallMat);

    // Central raised command bridge
    addBlock(0, 3.8, -14, 18, 0.7, 10, darkMetalMat, true);
    gravityPads.push(new THREE.Vector3(0, 0, -4), new THREE.Vector3(-26, 0, -18));

    // Cover crates
    addBlock(-6, 0, 14, 2.4, 1.6, 2.4, trimMat, true);
    addBlock(6, 0, 14, 2.4, 1.6, 2.4, trimMat, true);

    barrels.push(
      new THREE.Vector3(-18, 0, 2),
      new THREE.Vector3(18, 0, 2),
      new THREE.Vector3(0, 0, -24)
    );

    pickups.push(
      { type: 'health', pos: new THREE.Vector3(-26, 0, 14) },
      { type: 'armor', pos: new THREE.Vector3(26, 0, 14) },
      { type: 'ammo', pos: new THREE.Vector3(0, 4.5, -14) }
    );

    objectives.push(
      { id: 'relay-1', x: -28, y: 0, z: -26, mode: 'interact' },
      { id: 'relay-2', x: 0, y: 4.5, z: -14, mode: 'interact' },
      { id: 'relay-3', x: 28, y: 0, z: -26, mode: 'interact' }
    );

    enemies.push(
      { kind: 'drone', x: -6, y: 0, z: 4, patrolOffset: [8, 0] },
      { kind: 'drone', x: 6, y: 0, z: -6, patrolOffset: [-8, 0] },
      { kind: 'drone', x: -24, y: 0, z: -20, patrolOffset: [5, 5] },
      { kind: 'mech', x: 24, y: 0, z: -20 },
      { kind: 'mech', x: 0, y: 0, z: -28 }
    );
  } else if (missionId === 2) {
    // Mission 2: Dark Industrial Factory (Foundry vats, catwalks, crane beams)
    const lavaMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 2.0,
      roughness: 0.4,
    });
    // Glowing smelter troughs
    [-16, 16].forEach((x) => {
      const trough = new THREE.Mesh(new THREE.BoxGeometry(7, 0.15, 28), lavaMat);
      trough.position.set(x, 0.05, -4);
      scene.add(trough);
    });

    // Overhead steel catwalk bridges
    addBlock(0, 3.6, -4, 38, 0.7, 5, darkMetalMat, true);
    addBlock(-26, 0, 4, 8, 3.6, 8, trimMat, true);
    addBlock(26, 0, -14, 8, 3.6, 8, trimMat, true);
    gravityPads.push(new THREE.Vector3(-26, 0, -12), new THREE.Vector3(26, 0, 12));

    // Heavy factory pillars
    [-8, 8].forEach((x) => {
      addBlock(x, 0, 12, 3.2, 7, 3.2, wallMat);
      addBlock(x, 0, -20, 3.2, 7, 3.2, wallMat);
    });

    barrels.push(
      new THREE.Vector3(-4, 0, 4),
      new THREE.Vector3(4, 0, 4),
      new THREE.Vector3(0, 4.3, -4),
      new THREE.Vector3(-24, 0, -22),
      new THREE.Vector3(24, 0, -22)
    );

    pickups.push(
      { type: 'armor', pos: new THREE.Vector3(0, 0, 14) },
      { type: 'health', pos: new THREE.Vector3(-28, 0, 20) },
      { type: 'ammo', pos: new THREE.Vector3(28, 0, 20) }
    );

    objectives.push(
      { id: 'conduit-1', x: -28, y: 0, z: -26, mode: 'destroy' },
      { id: 'conduit-2', x: 0, y: 4.3, z: -4, mode: 'destroy' },
      { id: 'conduit-3', x: 28, y: 0, z: -26, mode: 'destroy' }
    );

    enemies.push(
      { kind: 'mech', x: -6, y: 0, z: 2, patrolOffset: [6, 0] },
      { kind: 'mech', x: 6, y: 0, z: -12, patrolOffset: [-6, 0] },
      { kind: 'drone', x: -24, y: 0, z: -18, patrolOffset: [0, 8] },
      { kind: 'drone', x: 24, y: 0, z: -18, patrolOffset: [0, 8] },
      { kind: 'mech', x: 0, y: 0, z: -28 },
      { kind: 'drone', x: 0, y: 4.3, z: -4, patrolOffset: [10, 0] }
    );
  } else if (missionId === 3) {
    // Mission 3: Underground Research Laboratory (Cryo tanks & containment corridors)
    const cryoGlassMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0891b2,
      emissiveIntensity: 1.1,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
    });
    // Cryo-containment chambers
    [
      [-16, -6],
      [16, -6],
      [-16, 12],
      [16, 12],
    ].forEach(([cx, cz]) => {
      addBlock(cx, 0, cz, 5, 1.1, 5, darkMetalMat, true);
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 4.6, 16), cryoGlassMat);
      cyl.position.set(cx, 3.4, cz);
      scene.add(cyl);
      colliders.push({
        minX: cx - 1.8,
        maxX: cx + 1.8,
        minY: 1.1,
        maxY: 6.0,
        minZ: cz - 1.8,
        maxZ: cz + 1.8,
      });
    });

    // Lab dividing walls with doorways
    addBlock(-16, 0, -22, 18, 6.5, 2.5, wallMat);
    addBlock(16, 0, -22, 18, 6.5, 2.5, wallMat);
    gravityPads.push(new THREE.Vector3(0, 0, 2));

    barrels.push(
      new THREE.Vector3(-8, 0, -10),
      new THREE.Vector3(8, 0, -10),
      new THREE.Vector3(0, 0, -28)
    );

    pickups.push(
      { type: 'health', pos: new THREE.Vector3(0, 0, 14) },
      { type: 'armor', pos: new THREE.Vector3(-28, 0, 0) },
      { type: 'ammo', pos: new THREE.Vector3(28, 0, 0) }
    );

    objectives.push(
      { id: 'core-1', x: -28, y: 0, z: -28, mode: 'interact' },
      { id: 'core-2', x: 0, y: 0, z: -30, mode: 'interact' },
      { id: 'core-3', x: 28, y: 0, z: -28, mode: 'interact' }
    );

    enemies.push(
      { kind: 'stalker', x: -10, y: 0, z: 4, patrolOffset: [4, 4] },
      { kind: 'stalker', x: 10, y: 0, z: 2, patrolOffset: [-4, 4] },
      { kind: 'drone', x: 0, y: 0, z: -12, patrolOffset: [10, 0] },
      { kind: 'stalker', x: -22, y: 0, z: -26 },
      { kind: 'stalker', x: 22, y: 0, z: -26 },
      { kind: 'mech', x: 0, y: 0, z: -28 }
    );
  } else {
    // Mission 4: Alien Planet (Crystalline monoliths, canyon boulders, hive resonators)
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x2d2240,
      roughness: 0.88,
      metalness: 0.12,
    });
    const alienCrystal = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xf97316,
      emissiveIntensity: 1.9,
    });

    [
      [-12, 8, 4],
      [12, 10, 4],
      [-18, -10, 5],
      [18, -10, 5],
      [0, -4, 4.5],
    ].forEach(([bx, bz, size]) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(size * 0.65, 0), rockMat);
      rock.position.set(bx, size * 0.4, bz);
      rock.castShadow = true;
      rock.receiveShadow = true;
      scene.add(rock);
      colliders.push({
        minX: bx - size * 0.5,
        maxX: bx + size * 0.5,
        minY: 0,
        maxY: size,
        minZ: bz - size * 0.5,
        maxZ: bz + size * 0.5,
      });

      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.65, 3.2, 5), alienCrystal);
      shard.position.set(bx, size * 0.85, bz);
      scene.add(shard);
    });

    gravityPads.push(new THREE.Vector3(-24, 0, 12), new THREE.Vector3(24, 0, 12));

    barrels.push(
      new THREE.Vector3(-6, 0, 0),
      new THREE.Vector3(6, 0, 0),
      new THREE.Vector3(0, 0, -18)
    );

    pickups.push(
      { type: 'health', pos: new THREE.Vector3(-12, 0, 18) },
      { type: 'armor', pos: new THREE.Vector3(12, 0, 18) },
      { type: 'ammo', pos: new THREE.Vector3(0, 0, 10) }
    );

    objectives.push(
      { id: 'hive-1', x: -26, y: 0, z: -24, mode: 'destroy' },
      { id: 'hive-2', x: 0, y: 0, z: -28, mode: 'destroy' },
      { id: 'hive-3', x: 26, y: 0, z: -24, mode: 'destroy' }
    );

    enemies.push(
      { kind: 'stalker', x: -8, y: 0, z: 2, patrolOffset: [4, -4] },
      { kind: 'stalker', x: 8, y: 0, z: 2, patrolOffset: [-4, -4] },
      { kind: 'mech', x: -20, y: 0, z: -18 },
      { kind: 'mech', x: 20, y: 0, z: -18 },
      { kind: 'stalker', x: -12, y: 0, z: -24 },
      { kind: 'stalker', x: 12, y: 0, z: -24 },
      { kind: 'drone', x: 0, y: 0, z: -14, patrolOffset: [10, 0] }
    );
  }

  return {
    title,
    subtitle,
    objectiveLabel,
    gravityScale,
    skyColor,
    fogColor,
    fogDensity,
    accentColor,
    playerStart,
    playerYaw,
    colliders,
    gravityPads,
    barrels,
    pickups,
    objectives,
    enemies,
    animatedObjects,
  };
}
