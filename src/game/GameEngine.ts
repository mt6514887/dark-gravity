import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../audio/SoundEngine';
import {
  GameMode,
  GameSettings,
  HudSnapshot,
  PlayPhase,
  RadarBlip,
  WEAPONS,
  WeaponId,
} from '../types/game';
import { BoxCollider, buildLevel, LevelBlueprint } from './levels';
import {
  AnimatedModelParts,
  createBattleMechModel,
  createGravityPadModel,
  createObjectiveConsoleModel,
  createOmegaBossModel,
  createPickupModel,
  createSentinelDroneModel,
  createVolatileBarrelModel,
  createWeaponViewModel,
  createXenoStalkerModel,
} from './models';
import { createProceduralTextures, TextureBundle } from './textures';

// Pre-allocated math helpers for zero GC in render loop
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();

interface PooledProjectile {
  active: boolean;
  fromPlayer: boolean;
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  damage: number;
  life: number;
  maxLife: number;
  radius: number;
}

interface PooledParticle {
  active: boolean;
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scaleStart: number;
  scaleEnd: number;
  gravity: number;
}

interface EnemyEntity {
  id: number;
  kind: 'drone' | 'mech' | 'stalker' | 'boss';
  group: THREE.Group;
  parts: AnimatedModelParts;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  height: number;
  fireCooldown: number;
  patrolOrigin: THREE.Vector3;
  patrolTarget: THREE.Vector3;
  state: 'patrol' | 'chase' | 'attack';
  hitFlashTimer: number;
  staggerTimer: number;
  bossSummonedPhase2?: boolean;
  alive: boolean;
}

interface BarrelEntity {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  hp: number;
  alive: boolean;
}

interface PickupEntity {
  type: 'health' | 'armor' | 'ammo';
  mesh: THREE.Group;
  pos: THREE.Vector3;
  active: boolean;
  respawnTimer: number;
}

interface ObjectiveEntity {
  id: string;
  mode: 'interact' | 'destroy';
  group: THREE.Group;
  core: THREE.Mesh;
  pos: THREE.Vector3;
  hp: number;
  completed: boolean;
}

export interface MobileInputState {
  moveX: number; // -1..1
  moveY: number; // -1..1 (forward positive)
  isFiring: boolean;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private textures: TextureBundle;
  private settings: GameSettings;

  private mode: GameMode;
  private missionId: number;
  private blueprint!: LevelBlueprint;

  private frameId = 0;
  private disposed = false;
  private lastTimestamp = 0;
  private accumulatorMs = 0;
  private fpsSamples = 0;
  private fpsTimer = 0;
  private currentFps = 60;
  private hudSyncTimer = 0;

  // Player state
  private playerPos = new THREE.Vector3(0, 0, 28);
  private playerVel = new THREE.Vector3();
  private yaw = 0;
  private pitch = 0;
  private onGround = true;
  private isCrouching = false;
  private isAiming = false;
  private isSprinting = false;
  private eyeHeight = 1.72;
  private health = 100;
  private maxHealth = 100;
  private armor = 60;
  private maxArmor = 100;
  private gravityCooldown = 0;
  private readonly gravityMaxCooldown = 7.0;

  // Weapons
  private weaponIds: WeaponId[] = ['pulse', 'scatter', 'rail'];
  private activeWeaponIdx = 0;
  private weaponAmmo: Record<WeaponId, { mag: number; reserve: number }> = {
    pulse: { mag: 32, reserve: 160 },
    scatter: { mag: 8, reserve: 32 },
    rail: { mag: 6, reserve: 24 },
  };
  private weaponModels: Partial<Record<WeaponId, { group: THREE.Group; parts: AnimatedModelParts }>> = {};
  private weaponMount = new THREE.Group();
  private fireTimer = 0;
  private reloadTimer = 0;
  private isReloading = false;
  private recoilOffset = 0;
  private muzzleFlashTimer = 0;
  private walkBobPhase = 0;

  // Shockwave visual
  private gravityWaveMesh: THREE.Mesh;
  private gravityWaveTimer = 0;

  // Pools & Entities
  private projectiles: PooledProjectile[] = [];
  private particles: PooledParticle[] = [];
  private enemies: EnemyEntity[] = [];
  private barrels: BarrelEntity[] = [];
  private pickups: PickupEntity[] = [];
  private objectives: ObjectiveEntity[] = [];
  private gravityPads: { pos: THREE.Vector3; ring: THREE.Mesh }[] = [];
  private nextEnemyId = 1;

  // Match Progression
  private phase: PlayPhase = 'active';
  private score = 0;
  private kills = 0;
  private wave = 1;
  private survivalSpawnTimer = 0;
  private elapsedSeconds = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private hitMarkerTimer = 0;
  private killMarkerTimer = 0;
  private damageFlash = 0;
  private damageAngle = 0;
  private statusBanner = '';
  private statusBannerTimer = 0;
  private waveTransitionLock = false;

  // Input states
  private keys: Record<string, boolean> = {};
  private mouseFiring = false;
  private pointerLocked = false;
  public mobileInput: MobileInputState = { moveX: 0, moveY: 0, isFiring: false };

  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onProgress: (pct: number, label: string) => void;

  // Bound event listeners
  private boundResize: () => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundPointerLockChange: () => void;
  private boundContextMenu: (e: MouseEvent) => void;
  private boundContextLost: (e: Event) => void;

  constructor(opts: {
    container: HTMLElement;
    mode: GameMode;
    missionId: number;
    settings: GameSettings;
    onHudUpdate: (snapshot: HudSnapshot) => void;
    onProgress: (pct: number, label: string) => void;
  }) {
    this.container = opts.container;
    this.mode = opts.mode;
    this.missionId = opts.missionId;
    this.settings = { ...opts.settings };
    this.onHudUpdate = opts.onHudUpdate;
    this.onProgress = opts.onProgress;

    this.onProgress(15, 'Initializing WebGL2 Renderer');

    // Software WebGL detection per Three.js skill
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && this.settings.quality !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(containerWidth(this.container), containerHeight(this.container));
    this.applyGraphicsSettings(this.settings);

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      72,
      containerWidth(this.container) / Math.max(1, containerHeight(this.container)),
      0.1,
      260
    );
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    // Studio IBL Environment Map (RoomEnvironment)
    this.onProgress(35, 'Generating Studio Reflections & PBR Textures');
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);

    // Weapon viewmodel mount attached to camera
    this.camera.add(this.weaponMount);
    this.weaponIds.forEach((wId) => {
      const vm = createWeaponViewModel(wId, this.textures);
      vm.group.visible = wId === this.getActiveWeaponId();
      this.weaponMount.add(vm.group);
      this.weaponModels[wId] = vm;
    });

    // Gravity shockwave torus
    this.gravityWaveMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.14, 10, 32),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      })
    );
    this.gravityWaveMesh.rotation.x = Math.PI / 2;
    this.gravityWaveMesh.visible = false;
    this.scene.add(this.gravityWaveMesh);

    this.onProgress(60, 'Constructing 3D Level & Enemy Squadrons');
    this.initPools();
    this.loadLevel();

    this.onProgress(85, 'Pre-warming WebGL Shaders');
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind events
    this.boundResize = () => this.handleResize();
    this.boundKeyDown = (e) => this.handleKeyDown(e);
    this.boundKeyUp = (e) => this.handleKeyUp(e);
    this.boundMouseMove = (e) => this.handleMouseMove(e);
    this.boundMouseDown = (e) => this.handleMouseDown(e);
    this.boundMouseUp = (e) => this.handleMouseUp(e);
    this.boundPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
      this.emitHud();
    };
    this.boundContextMenu = (e) => e.preventDefault();
    this.boundContextLost = (e) => {
      e.preventDefault();
      this.setPhase('paused');
    };

    window.addEventListener('resize', this.boundResize);
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('mousemove', this.boundMouseMove);
    this.renderer.domElement.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mouseup', this.boundMouseUp);
    document.addEventListener('pointerlockchange', this.boundPointerLockChange);
    this.renderer.domElement.addEventListener('contextmenu', this.boundContextMenu);
    this.renderer.domElement.addEventListener('webglcontextlost', this.boundContextLost);

    this.onProgress(100, 'Deployment Ready');
    this.showBanner(`${this.blueprint.title} — ${this.blueprint.objectiveLabel}`, 3.5);
    soundEngine.setMusicMood(this.mode === 'boss' || this.missionId === 5 ? 'boss' : 'combat');

    this.lastTimestamp = performance.now();
    this.emitHud();
    this.tick();
  }

  private initPools(): void {
    const boltGeo = new THREE.OctahedronGeometry(0.18, 0);
    boltGeo.scale(0.65, 0.65, 2.4);

    for (let i = 0; i < 90; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const mesh = new THREE.Mesh(boltGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.projectiles.push({
        active: false,
        fromPlayer: true,
        mesh,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        damage: 20,
        life: 0,
        maxLife: 2,
        radius: 0.28,
      });
    }

    const pGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    for (let i = 0; i < 140; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(pGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({
        active: false,
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.6,
        scaleStart: 1,
        scaleEnd: 0.1,
        gravity: 9.8,
      });
    }
  }

  private loadLevel(): void {
    this.blueprint = buildLevel(this.scene, this.mode, this.missionId, this.textures);
    this.playerPos.copy(this.blueprint.playerStart);
    this.yaw = this.blueprint.playerYaw;
    this.pitch = 0;
    this.playerVel.set(0, 0, 0);

    // Spawn Gravity Pads
    this.blueprint.gravityPads.forEach((pos) => {
      const pad = createGravityPadModel(this.textures);
      pad.group.position.copy(pos);
      this.scene.add(pad.group);
      this.gravityPads.push({ pos: pos.clone(), ring: pad.ring });
    });

    // Spawn Volatile Barrels
    this.blueprint.barrels.forEach((pos) => {
      const mesh = createVolatileBarrelModel(this.textures);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.barrels.push({ mesh, pos: pos.clone(), hp: 35, alive: true });
    });

    // Spawn Pickups
    this.blueprint.pickups.forEach((p) => {
      const mesh = createPickupModel(p.type);
      mesh.position.copy(p.pos);
      this.scene.add(mesh);
      this.pickups.push({
        type: p.type,
        mesh,
        pos: p.pos.clone(),
        active: true,
        respawnTimer: 0,
      });
    });

    // Spawn Objectives
    this.blueprint.objectives.forEach((o) => {
      const { group, core } = createObjectiveConsoleModel(this.blueprint.accentColor);
      group.position.set(o.x, o.y, o.z);
      this.scene.add(group);
      this.objectives.push({
        id: o.id,
        mode: o.mode,
        group,
        core,
        pos: new THREE.Vector3(o.x, o.y, o.z),
        hp: 110,
        completed: false,
      });
    });

    // Spawn Enemies
    this.blueprint.enemies.forEach((e) => {
      this.spawnEnemy(e.kind, e.x, e.y, e.z, e.patrolOffset);
    });
  }

  private spawnEnemy(
    kind: 'drone' | 'mech' | 'stalker' | 'boss',
    x: number,
    y: number,
    z: number,
    patrolOffset?: [number, number]
  ): void {
    const built =
      kind === 'drone'
        ? createSentinelDroneModel(this.textures)
        : kind === 'mech'
        ? createBattleMechModel(this.textures)
        : kind === 'stalker'
        ? createXenoStalkerModel(this.textures)
        : createOmegaBossModel(this.textures);

    built.group.position.set(x, y, z);
    this.scene.add(built.group);

    const waveBoost = this.mode === 'survival' ? 1 + (this.wave - 1) * 0.16 : 1;
    const maxHp =
      kind === 'drone'
        ? Math.round(75 * waveBoost)
        : kind === 'mech'
        ? Math.round(165 * waveBoost)
        : kind === 'stalker'
        ? Math.round(115 * waveBoost)
        : 1450;

    const speed =
      kind === 'drone' ? 6.2 : kind === 'mech' ? 4.1 : kind === 'stalker' ? 8.2 : 2.6;
    const radius = kind === 'boss' ? 3.2 : kind === 'mech' ? 0.95 : 0.75;
    const height = kind === 'boss' ? 5.8 : kind === 'mech' ? 2.5 : 2.1;

    const origin = new THREE.Vector3(x, y, z);
    const target = patrolOffset
      ? new THREE.Vector3(x + patrolOffset[0], y, z + patrolOffset[1])
      : origin.clone();

    this.enemies.push({
      id: this.nextEnemyId++,
      kind,
      group: built.group,
      parts: built.parts,
      pos: origin.clone(),
      vel: new THREE.Vector3(),
      hp: maxHp,
      maxHp,
      speed,
      radius,
      height,
      fireCooldown: 1.0 + Math.random() * 1.4,
      patrolOrigin: origin,
      patrolTarget: target,
      state: 'patrol',
      hitFlashTimer: 0,
      staggerTimer: 0,
      alive: true,
    });
  }

  public applyGraphicsSettings(newSettings: GameSettings): void {
    this.settings = { ...newSettings };
    const q = this.settings.quality;

    let ratio = 1;
    if (!this.isSoftwareGl) {
      const dpr = window.devicePixelRatio || 1;
      if (q === 'low') ratio = 0.65;
      else if (q === 'medium') ratio = Math.min(dpr, 1.0);
      else if (q === 'high') ratio = Math.min(dpr, 1.35);
      else ratio = Math.min(dpr, 2.0);
    }
    this.renderer.setPixelRatio(ratio);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && q !== 'low';
    soundEngine.setVolumes(
      this.settings.masterVolume,
      this.settings.musicVolume,
      this.settings.sfxVolume
    );
  }

  public getActiveWeaponId(): WeaponId {
    return this.weaponIds[this.activeWeaponIdx];
  }

  // Public action controls (callable by both Mobile HUD buttons and Keyboard)
  public rotateLook(deltaX: number, deltaY: number): void {
    if (this.phase !== 'active') return;
    const sens = 0.0028 * this.settings.sensitivity * (this.isAiming ? 0.62 : 1.0);
    this.yaw -= deltaX * sens;
    const ySign = this.settings.invertY ? 1 : -1;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch + deltaY * sens * ySign,
      -Math.PI / 2.15,
      Math.PI / 2.15
    );
  }

  public triggerJump(): void {
    if (this.phase !== 'active') return;
    if (this.onGround) {
      this.isCrouching = false;
      this.playerVel.y = 9.4;
      this.onGround = false;
    }
  }

  public toggleCrouch(): void {
    if (this.phase !== 'active') return;
    this.isCrouching = !this.isCrouching;
  }

  public toggleAim(force?: boolean): void {
    if (this.phase !== 'active') return;
    this.isAiming = typeof force === 'boolean' ? force : !this.isAiming;
  }

  public triggerReload(): void {
    if (this.phase !== 'active' || this.isReloading) return;
    const wId = this.getActiveWeaponId();
    const spec = WEAPONS[wId];
    const ammo = this.weaponAmmo[wId];
    if (ammo.mag >= spec.magSize || ammo.reserve <= 0) return;
    this.isReloading = true;
    this.reloadTimer = spec.reloadTime;
    soundEngine.playReload();
  }

  public switchWeapon(targetIdx?: number): void {
    if (this.phase !== 'active') return;
    const nextIdx =
      typeof targetIdx === 'number'
        ? targetIdx % this.weaponIds.length
        : (this.activeWeaponIdx + 1) % this.weaponIds.length;
    if (nextIdx === this.activeWeaponIdx) return;

    this.activeWeaponIdx = nextIdx;
    this.isReloading = false;
    this.reloadTimer = 0;
    const activeId = this.getActiveWeaponId();
    this.weaponIds.forEach((id) => {
      const vm = this.weaponModels[id];
      if (vm) vm.group.visible = id === activeId;
    });
    soundEngine.playMenuClick(520);
    this.emitHud();
  }

  public triggerGravityPulse(): void {
    if (this.phase !== 'active' || this.gravityCooldown > 0) return;
    this.gravityCooldown = this.gravityMaxCooldown;
    soundEngine.playGravityPulse();

    // Activate expanding cyan shockwave torus
    this.gravityWaveTimer = 0.45;
    this.gravityWaveMesh.visible = true;
    this.gravityWaveMesh.position.set(this.playerPos.x, this.playerPos.y + 1.0, this.playerPos.z);
    this.gravityWaveMesh.scale.set(1, 1, 1);

    // Blast nearby enemies & vaporize enemy projectiles within 14m
    const radius = 14;
    for (const p of this.projectiles) {
      if (p.active && !p.fromPlayer && p.pos.distanceTo(this.playerPos) < radius) {
        p.active = false;
        p.mesh.visible = false;
        this.spawnBurst(p.pos, 0x38bdf8, 5, 6);
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dist = enemy.pos.distanceTo(this.playerPos);
      if (dist < radius) {
        _vecA.subVectors(enemy.pos, this.playerPos);
        _vecA.y = 0;
        if (_vecA.lengthSq() < 0.01) _vecA.set(0, 0, -1);
        _vecA.normalize();

        const pushForce = enemy.kind === 'boss' ? 4 : 15;
        enemy.vel.x = _vecA.x * pushForce;
        enemy.vel.z = _vecA.z * pushForce;
        enemy.vel.y = enemy.kind === 'boss' ? 0 : 9.5;
        enemy.staggerTimer = enemy.kind === 'boss' ? 0.5 : 1.6;
        this.damageEnemy(enemy, 45);
      }
    }
    this.showBanner('GRAVITY PULSE DISCHARGED', 1.5);
  }

  public setPhase(phase: PlayPhase): void {
    this.phase = phase;
    if (phase !== 'active' && document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
    this.emitHud();
  }

  public requestDesktopPointerLock(): void {
    if (this.phase === 'active' && this.renderer.domElement.requestPointerLock) {
      try {
        this.renderer.domElement.requestPointerLock();
      } catch {
        // Ignore on unsupported mobile webviews
      }
    }
  }

  private showBanner(text: string, duration = 2.5): void {
    this.statusBanner = text;
    this.statusBannerTimer = duration;
  }

  private handleResize(): void {
    if (this.disposed) return;
    const w = containerWidth(this.container);
    const h = Math.max(1, containerHeight(this.container));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.keys[e.code] = true;
    if (e.code === 'Escape') {
      if (this.phase === 'active') this.setPhase('paused');
      else if (this.phase === 'paused') this.setPhase('active');
      return;
    }
    if (this.phase !== 'active') return;
    if (e.code === 'Space') this.triggerJump();
    else if (e.code === 'KeyC') this.toggleCrouch();
    else if (e.code === 'KeyR') this.triggerReload();
    else if (e.code === 'KeyQ') this.switchWeapon();
    else if (e.code === 'Digit1') this.switchWeapon(0);
    else if (e.code === 'Digit2') this.switchWeapon(1);
    else if (e.code === 'Digit3') this.switchWeapon(2);
    else if (e.code === 'KeyG') this.triggerGravityPulse();
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys[e.code] = false;
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.pointerLocked || this.phase !== 'active') return;
    this.rotateLook(e.movementX, e.movementY);
  }

  private handleMouseDown(e: MouseEvent): void {
    soundEngine.unlock();
    if (this.phase !== 'active') return;
    if (e.button === 0) {
      this.mouseFiring = true;
      if (!this.pointerLocked && !('ontouchstart' in window)) {
        this.requestDesktopPointerLock();
      }
    } else if (e.button === 2) {
      this.toggleAim(true);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 0) this.mouseFiring = false;
    else if (e.button === 2) this.toggleAim(false);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDtMs = now - this.lastTimestamp;
    this.lastTimestamp = now;

    // Frame rate cap enforcement (unless software WebGL which uses afterDraw pacing)
    if (!this.isSoftwareGl && this.settings.fpsLimit < 60) {
      const targetMs = 1000 / this.settings.fpsLimit;
      this.accumulatorMs += rawDtMs;
      if (this.accumulatorMs < targetMs * 0.92) {
        this.frameId = requestAnimationFrame(this.tick);
        return;
      }
      this.accumulatorMs = 0;
    }

    const dt = Math.min(rawDtMs / 1000, 0.05);

    // FPS counter
    this.fpsSamples++;
    this.fpsTimer += rawDtMs / 1000;
    if (this.fpsTimer >= 0.5) {
      this.currentFps = Math.round(this.fpsSamples / this.fpsTimer);
      this.fpsSamples = 0;
      this.fpsTimer = 0;
    }

    if (this.phase === 'active') {
      this.updateGame(dt);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateGame(dt: number): void {
    this.elapsedSeconds += dt;
    if (this.hitMarkerTimer > 0) this.hitMarkerTimer = Math.max(0, this.hitMarkerTimer - dt);
    if (this.killMarkerTimer > 0) this.killMarkerTimer = Math.max(0, this.killMarkerTimer - dt);
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt * 1.8);
    if (this.gravityCooldown > 0) this.gravityCooldown = Math.max(0, this.gravityCooldown - dt);
    if (this.statusBannerTimer > 0) {
      this.statusBannerTimer = Math.max(0, this.statusBannerTimer - dt);
      if (this.statusBannerTimer === 0) this.statusBanner = '';
    }

    // Animate environment objects (singularity rings, gravity pad rings, pickups, objectives)
    for (const anim of this.blueprint.animatedObjects) {
      anim.mesh.rotation[anim.axis] += anim.speed * dt;
    }
    for (const pad of this.gravityPads) {
      pad.ring.rotation.z += 2.2 * dt;
      pad.ring.position.y = 0.75 + Math.sin(this.elapsedSeconds * 4) * 0.22;
    }
    for (const obj of this.objectives) {
      if (!obj.completed) {
        obj.core.rotation.y += 1.8 * dt;
        obj.core.position.y = 2.35 + Math.sin(this.elapsedSeconds * 3) * 0.16;
      }
    }

    // Update Gravity Pulse ring visual
    if (this.gravityWaveTimer > 0) {
      this.gravityWaveTimer -= dt;
      const prog = 1 - this.gravityWaveTimer / 0.45;
      const scale = 1 + prog * 13;
      this.gravityWaveMesh.scale.set(scale, scale, 1);
      (this.gravityWaveMesh.material as THREE.MeshBasicMaterial).opacity = (1 - prog) * 0.85;
      if (this.gravityWaveTimer <= 0) this.gravityWaveMesh.visible = false;
    }

    this.updatePlayerMovement(dt);
    this.updateWeapons(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updatePickupsAndObjectives(dt);
    this.updateParticles(dt);
    this.checkModeProgression(dt);

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.05) {
      this.hudSyncTimer = 0;
      this.emitHud();
    }
  }

  private updatePlayerMovement(dt: number): void {
    // Combine keyboard + mobile virtual joystick
    let inputX =
      (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) -
      (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0) +
      this.mobileInput.moveX;
    let inputZ =
      (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) -
      (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0) +
      this.mobileInput.moveY;

    const inputMag = Math.hypot(inputX, inputZ);
    if (inputMag > 1) {
      inputX /= inputMag;
      inputZ /= inputMag;
    }

    this.isSprinting =
      !this.isCrouching &&
      !this.isAiming &&
      ((!!this.keys['ShiftLeft'] && inputMag > 0.1) || inputMag > 0.85);

    const baseSpeed = this.isCrouching ? 4.4 : this.isAiming ? 5.2 : this.isSprinting ? 11.4 : 8.2;

    _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const targetVx = (_forward.x * inputZ + _right.x * inputX) * baseSpeed;
    const targetVz = (_forward.z * inputZ + _right.z * inputX) * baseSpeed;

    const accel = this.onGround ? 14 : 5;
    this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, targetVx, accel, dt);
    this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, targetVz, accel, dt);

    // Gravity
    const gravity = 22.0 * this.blueprint.gravityScale;
    this.playerVel.y -= gravity * dt;

    // Horizontal move with AABB sliding
    const pRadius = 0.55;
    const playerH = this.isCrouching ? 1.2 : 1.9;

    this.playerPos.x += this.playerVel.x * dt;
    this.resolveHorizontalCollisions(pRadius, playerH, 'x');

    this.playerPos.z += this.playerVel.z * dt;
    this.resolveHorizontalCollisions(pRadius, playerH, 'z');

    // Vertical movement & platform landing
    const prevY = this.playerPos.y;
    this.playerPos.y += this.playerVel.y * dt;
    this.onGround = false;

    if (this.playerPos.y <= 0) {
      this.playerPos.y = 0;
      this.playerVel.y = 0;
      this.onGround = true;
    }

    for (const c of this.blueprint.colliders) {
      if (!c.isPlatform) continue;
      if (
        this.playerPos.x + pRadius > c.minX &&
        this.playerPos.x - pRadius < c.maxX &&
        this.playerPos.z + pRadius > c.minZ &&
        this.playerPos.z - pRadius < c.maxZ
      ) {
        if (prevY >= c.maxY - 0.25 && this.playerPos.y <= c.maxY && this.playerVel.y <= 0) {
          this.playerPos.y = c.maxY;
          this.playerVel.y = 0;
          this.onGround = true;
        }
      }
    }

    // Clamp to arena outer limits
    this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, -39.5, 39.5);
    this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, -39.5, 39.5);

    // Check Gravity Lift Pads
    for (const pad of this.gravityPads) {
      const dx = this.playerPos.x - pad.pos.x;
      const dz = this.playerPos.z - pad.pos.z;
      if (dx * dx + dz * dz < 2.25 && Math.abs(this.playerPos.y - pad.pos.y) < 1.2) {
        if (this.playerVel.y < 12) {
          this.playerVel.y = 15.5;
          this.onGround = false;
          soundEngine.playGravityLift();
          this.spawnBurst(pad.pos, 0x38bdf8, 8, 5);
        }
      }
    }

    // Smooth camera eye height & FOV ADS zoom
    const targetEye = this.isCrouching ? 1.05 : 1.72;
    this.eyeHeight = THREE.MathUtils.damp(this.eyeHeight, targetEye, 12, dt);

    const speed2d = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (this.onGround && speed2d > 0.6) {
      this.walkBobPhase += dt * (this.isSprinting ? 13 : 9);
    }

    const bobY = this.onGround ? Math.sin(this.walkBobPhase) * 0.035 * Math.min(1, speed2d / 6) : 0;
    this.camera.position.set(this.playerPos.x, this.playerPos.y + this.eyeHeight + bobY, this.playerPos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

    const wSpec = WEAPONS[this.getActiveWeaponId()];
    const targetFov = this.isAiming ? wSpec.zoomFov : this.isSprinting ? 78 : 72;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 12, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private resolveHorizontalCollisions(radius: number, height: number, axis: 'x' | 'z'): void {
    for (const c of this.blueprint.colliders) {
      if (this.playerPos.y + height <= c.minY + 0.05 || this.playerPos.y >= c.maxY - 0.15) {
        continue;
      }
      if (
        this.playerPos.x + radius > c.minX &&
        this.playerPos.x - radius < c.maxX &&
        this.playerPos.z + radius > c.minZ &&
        this.playerPos.z - radius < c.maxZ
      ) {
        if (axis === 'x') {
          if (this.playerVel.x > 0) this.playerPos.x = c.minX - radius;
          else if (this.playerVel.x < 0) this.playerPos.x = c.maxX + radius;
          this.playerVel.x = 0;
        } else {
          if (this.playerVel.z > 0) this.playerPos.z = c.minZ - radius;
          else if (this.playerVel.z < 0) this.playerPos.z = c.maxZ + radius;
          this.playerVel.z = 0;
        }
      }
    }
  }

  private updateWeapons(dt: number): void {
    const wId = this.getActiveWeaponId();
    const spec = WEAPONS[wId];
    const ammo = this.weaponAmmo[wId];

    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.muzzleFlashTimer > 0) this.muzzleFlashTimer -= dt;

    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const needed = spec.magSize - ammo.mag;
        const load = Math.min(needed, ammo.reserve);
        ammo.mag += load;
        ammo.reserve -= load;
        this.isReloading = false;
      }
    }

    const wantsFire = this.mouseFiring || this.mobileInput.isFiring;
    if (wantsFire && !this.isReloading && this.fireTimer <= 0) {
      if (ammo.mag > 0) {
        this.fireWeapon();
      } else if (ammo.reserve > 0) {
        this.triggerReload();
      }
    }

    // Animate weapon viewmodel position (ADS centering, bob, recoil, reload tilt)
    this.recoilOffset = THREE.MathUtils.damp(this.recoilOffset, 0, 14, dt);
    const targetX = this.isAiming ? 0.0 : 0.24;
    const targetY = this.isReloading ? -0.34 : this.isAiming ? -0.15 : -0.2;
    const targetZ = -0.36 + this.recoilOffset;

    const swayX = Math.cos(this.walkBobPhase * 0.5) * (this.isAiming ? 0.003 : 0.012);
    const swayY = Math.abs(Math.sin(this.walkBobPhase * 0.5)) * (this.isAiming ? 0.003 : 0.012);

    this.weaponMount.position.x = THREE.MathUtils.damp(this.weaponMount.position.x, targetX + swayX, 14, dt);
    this.weaponMount.position.y = THREE.MathUtils.damp(this.weaponMount.position.y, targetY - swayY, 14, dt);
    this.weaponMount.position.z = THREE.MathUtils.damp(this.weaponMount.position.z, targetZ, 18, dt);
    this.weaponMount.rotation.x = this.isReloading ? -0.45 : this.recoilOffset * 1.6;

    const vm = this.weaponModels[wId];
    if (vm?.parts.muzzleFlash) {
      vm.parts.muzzleFlash.material.opacity = this.muzzleFlashTimer > 0 ? 0.95 : 0;
    }
  }

  private fireWeapon(): void {
    const wId = this.getActiveWeaponId();
    const spec = WEAPONS[wId];
    const ammo = this.weaponAmmo[wId];

    ammo.mag--;
    this.fireTimer = 1 / spec.fireRate;
    this.recoilOffset = spec.recoil;
    this.muzzleFlashTimer = 0.055;
    this.shotsFired++;

    soundEngine.playWeaponFire(wId);

    // Subtle upward camera kick
    this.pitch = Math.min(Math.PI / 2.2, this.pitch + spec.recoil * 0.22);

    const spread = this.isAiming ? spec.adsSpread : spec.spread;
    const vm = this.weaponModels[wId];
    const muzzleWorld = _vecA;
    if (vm?.parts.muzzlePoint) {
      vm.parts.muzzlePoint.getWorldPosition(muzzleWorld);
    } else {
      muzzleWorld.copy(this.camera.position);
    }

    // Center camera aim direction
    this.camera.getWorldDirection(_vecB);

    for (let i = 0; i < spec.pellets; i++) {
      _vecC.copy(_vecB);
      _vecC.x += (Math.random() - 0.5) * spread * 2;
      _vecC.y += (Math.random() - 0.5) * spread * 2;
      _vecC.z += (Math.random() - 0.5) * spread * 2;
      _vecC.normalize();

      this.spawnProjectile(
        true,
        muzzleWorld,
        _vecC,
        spec.projectileSpeed,
        spec.damage,
        spec.color,
        wId === 'rail' ? 1.4 : 1.0
      );
    }
  }

  private spawnProjectile(
    fromPlayer: boolean,
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    speed: number,
    damage: number,
    color: number,
    scale = 1
  ): void {
    const p = this.projectiles.find((item) => !item.active);
    if (!p) return;
    p.active = true;
    p.fromPlayer = fromPlayer;
    p.pos.copy(origin);
    p.vel.copy(dir).multiplyScalar(speed);
    p.damage = damage;
    p.life = 0;
    p.maxLife = fromPlayer ? 1.8 : 3.2;
    p.radius = fromPlayer ? 0.35 : 0.45;

    p.mesh.position.copy(origin);
    p.mesh.scale.set(scale, scale, scale * (fromPlayer ? 1.4 : 1.6));
    _vecA.copy(origin).add(dir);
    p.mesh.lookAt(_vecA);
    (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    p.mesh.visible = true;
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);

      // Wall collision check
      let hitWall = false;
      if (p.pos.y <= 0.05) hitWall = true;
      else {
        for (const c of this.blueprint.colliders) {
          if (
            p.pos.x >= c.minX &&
            p.pos.x <= c.maxX &&
            p.pos.y >= c.minY &&
            p.pos.y <= c.maxY &&
            p.pos.z >= c.minZ &&
            p.pos.z <= c.maxZ
          ) {
            hitWall = true;
            break;
          }
        }
      }

      if (hitWall) {
        this.spawnBurst(p.pos, p.fromPlayer ? 0x38bdf8 : 0xef4444, 4, 5);
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      if (p.fromPlayer) {
        // Check enemies
        let hitTarget = false;
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const dx = p.pos.x - e.pos.x;
          const dz = p.pos.z - e.pos.z;
          const distXZ = Math.hypot(dx, dz);
          if (distXZ <= e.radius + p.radius && p.pos.y >= e.pos.y - 0.2 && p.pos.y <= e.pos.y + e.height + 0.3) {
            // Headshot / core bonus
            const isCrit = p.pos.y > e.pos.y + e.height * 0.65;
            this.damageEnemy(e, isCrit ? Math.round(p.damage * 1.4) : p.damage);
            this.shotsHit++;
            this.spawnBurst(p.pos, 0xf59e0b, 6, 7);
            hitTarget = true;
            break;
          }
        }

        // Check volatile barrels
        if (!hitTarget) {
          for (const b of this.barrels) {
            if (!b.alive) continue;
            if (p.pos.distanceTo(b.pos.clone().setY(b.pos.y + 0.7)) < 0.95) {
              b.hp -= p.damage;
              this.spawnBurst(p.pos, 0xf97316, 4, 6);
              if (b.hp <= 0) this.detonateBarrel(b);
              hitTarget = true;
              break;
            }
          }
        }

        // Check destructible objectives
        if (!hitTarget) {
          for (const o of this.objectives) {
            if (o.completed || o.mode !== 'destroy') continue;
            const dx = p.pos.x - o.pos.x;
            const dz = p.pos.z - o.pos.z;
            if (Math.hypot(dx, dz) < 1.3 && p.pos.y >= o.pos.y && p.pos.y <= o.pos.y + 3.0) {
              o.hp -= p.damage;
              this.hitMarkerTimer = 0.12;
              this.spawnBurst(p.pos, this.blueprint.accentColor, 5, 6);
              if (o.hp <= 0) this.completeObjective(o);
              hitTarget = true;
              break;
            }
          }
        }

        if (hitTarget) {
          p.active = false;
          p.mesh.visible = false;
        }
      } else {
        // Enemy projectile vs Player
        const dx = p.pos.x - this.playerPos.x;
        const dz = p.pos.z - this.playerPos.z;
        const playerTop = this.playerPos.y + (this.isCrouching ? 1.25 : 1.9);
        if (Math.hypot(dx, dz) < 0.75 && p.pos.y >= this.playerPos.y && p.pos.y <= playerTop) {
          this.damagePlayer(p.damage, p.pos);
          this.spawnBurst(p.pos, 0xef4444, 5, 6);
          p.active = false;
          p.mesh.visible = false;
        }
      }
    }
  }

  private detonateBarrel(b: BarrelEntity): void {
    b.alive = false;
    b.mesh.visible = false;
    soundEngine.playExplosion(1.3);
    const center = _vecA.set(b.pos.x, b.pos.y + 0.8, b.pos.z);
    this.spawnBurst(center, 0xf97316, 22, 14);
    this.spawnBurst(center, 0xfef08a, 10, 9);

    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dist = e.pos.distanceTo(b.pos);
      if (dist < 9.5) {
        const dmg = Math.round(160 * (1 - dist / 10.5));
        this.damageEnemy(e, dmg);
      }
    }
  }

  private damageEnemy(e: EnemyEntity, amount: number): void {
    e.hp -= amount;
    e.hitFlashTimer = 0.12;
    e.state = 'attack';
    this.hitMarkerTimer = 0.14;

    if (e.hp <= 0) {
      e.alive = false;
      e.group.visible = false;
      this.kills++;
      this.killMarkerTimer = 0.24;
      this.score += e.kind === 'boss' ? 1500 : e.kind === 'mech' ? 250 : 120;
      soundEngine.playHitMarker(true);
      soundEngine.playExplosion(e.kind === 'boss' ? 2.0 : 0.9);
      const center = _vecA.set(e.pos.x, e.pos.y + e.height * 0.5, e.pos.z);
      this.spawnBurst(center, e.kind === 'stalker' ? 0xf97316 : 0xef4444, e.kind === 'boss' ? 32 : 16, 12);
    } else {
      soundEngine.playHitMarker(false);
    }
  }

  private damagePlayer(amount: number, sourcePos: THREE.Vector3): void {
    if (this.phase !== 'active') return;
    soundEngine.playPlayerHurt();
    this.damageFlash = 1.0;

    // Directional damage angle relative to player look
    const angToSource = Math.atan2(sourcePos.x - this.playerPos.x, sourcePos.z - this.playerPos.z);
    this.damageAngle = angToSource - this.yaw;

    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, Math.ceil(amount * 0.65));
      this.armor -= absorbed;
      this.health -= amount - absorbed;
    } else {
      this.health -= amount;
    }

    if (this.health <= 0) {
      this.health = 0;
      this.setPhase('gameover');
    }
  }

  private updateEnemies(dt: number): void {
    for (const e of this.enemies) {
      if (!e.alive) continue;

      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= dt;
        e.parts.eyeMaterials?.forEach((m) => m.emissive.setHex(e.hitFlashTimer > 0 ? 0xffffff : e.kind === 'stalker' ? 0xf97316 : 0xef4444));
      }

      // Spinners / limb animations
      e.parts.spinners?.forEach((s) => {
        s.rotation.z += 2.6 * dt;
      });

      // Stagger / gravity pulse lift physics
      if (e.staggerTimer > 0) {
        e.staggerTimer -= dt;
        e.vel.y -= 18 * dt;
        e.pos.addScaledVector(e.vel, dt);
        if (e.pos.y < 0) {
          e.pos.y = 0;
          e.vel.y = 0;
        }
        e.pos.x = THREE.MathUtils.clamp(e.pos.x, -38, 38);
        e.pos.z = THREE.MathUtils.clamp(e.pos.z, -38, 38);
        e.group.position.copy(e.pos);
        continue;
      }

      const distToPlayer = e.pos.distanceTo(this.playerPos);

      // AI state transitions
      if (distToPlayer < 46) {
        if (e.state === 'patrol' && distToPlayer < 32) {
          e.state = 'chase';
          soundEngine.playRobotServo();
        }
        if (distToPlayer < (e.kind === 'stalker' ? 3.4 : 26)) {
          e.state = 'attack';
        } else if (e.state === 'attack' && distToPlayer > 30) {
          e.state = 'chase';
        }
      }

      // Boss phase 2 reinforcement summon at 50% HP
      if (e.kind === 'boss' && !e.bossSummonedPhase2 && e.hp < e.maxHp * 0.5) {
        e.bossSummonedPhase2 = true;
        this.showBanner('OMEGA WARDEN SHIELD SURGE — DRONES DEPLOYED!', 3.0);
        this.spawnEnemy('drone', e.pos.x - 6, 0, e.pos.z + 4);
        this.spawnEnemy('drone', e.pos.x + 6, 0, e.pos.z + 4);
      }

      // Face target
      const targetPos = e.state === 'patrol' ? e.patrolTarget : this.playerPos;
      const dx = targetPos.x - e.pos.x;
      const dz = targetPos.z - e.pos.z;
      const horizDist = Math.hypot(dx, dz);
      const targetYaw = Math.atan2(dx, dz);
      e.group.rotation.y = targetYaw;

      // Movement
      const shouldMove =
        e.state === 'patrol' ||
        (e.state === 'chase' && horizDist > 4.5) ||
        (e.kind === 'stalker' && horizDist > 2.2) ||
        (e.state === 'attack' && e.kind === 'drone' && horizDist > 9);

      if (shouldMove && horizDist > 0.4) {
        const moveSpd = e.state === 'patrol' ? e.speed * 0.45 : e.speed;
        const nx = (dx / horizDist) * moveSpd;
        const nz = (dz / horizDist) * moveSpd;
        e.pos.x = THREE.MathUtils.clamp(e.pos.x + nx * dt, -38, 38);
        e.pos.z = THREE.MathUtils.clamp(e.pos.z + nz * dt, -38, 38);

        // Limb walk cycle
        e.parts.limbs?.forEach((limb, idx) => {
          limb.rotation.x = Math.sin(this.elapsedSeconds * 8 + idx * Math.PI) * 0.38;
        });
      } else if (e.state === 'patrol' && horizDist <= 0.6) {
        // Swap patrol waypoints
        const tmp = e.patrolTarget.clone();
        e.patrolTarget.copy(e.patrolOrigin);
        e.patrolOrigin.copy(tmp);
      }

      // Hover bob for Sentinel Drone
      if (e.kind === 'drone') {
        e.group.position.set(e.pos.x, e.pos.y + Math.sin(this.elapsedSeconds * 3.5 + e.id) * 0.22, e.pos.z);
      } else {
        e.group.position.copy(e.pos);
      }

      // Attack logic
      e.fireCooldown -= dt;
      if (e.state === 'attack' && e.fireCooldown <= 0) {
        if (e.kind === 'stalker') {
          if (distToPlayer < 3.6) {
            this.damagePlayer(16, e.pos);
            e.fireCooldown = 1.1;
          } else {
            // Acid/bio plasma spit at medium range
            e.fireCooldown = 1.9;
            this.fireEnemyProjectile(e, 0xf97316, 28, 10, 0);
          }
        } else if (e.kind === 'boss') {
          e.fireCooldown = e.hp < e.maxHp * 0.5 ? 1.1 : 1.55;
          // 3-bolt red diamond fan volley (inspired by reference image!)
          [-0.14, 0, 0.14].forEach((offset) => {
            this.fireEnemyProjectile(e, 0xef4444, 34, 15, offset);
          });
        } else {
          e.fireCooldown = e.kind === 'mech' ? 1.45 : 1.75;
          this.fireEnemyProjectile(e, 0xef4444, 30, e.kind === 'mech' ? 13 : 9, 0);
        }
      }
    }
  }

  private fireEnemyProjectile(
    e: EnemyEntity,
    color: number,
    speed: number,
    damage: number,
    yawSpread: number
  ): void {
    const origin = _vecA.set(e.pos.x, e.pos.y + e.height * 0.72, e.pos.z);
    const target = _vecB.set(this.playerPos.x, this.playerPos.y + 1.25, this.playerPos.z);
    const dir = _vecC.subVectors(target, origin).normalize();

    if (yawSpread !== 0) {
      const cos = Math.cos(yawSpread);
      const sin = Math.sin(yawSpread);
      const nx = dir.x * cos - dir.z * sin;
      const nz = dir.x * sin + dir.z * cos;
      dir.x = nx;
      dir.z = nz;
    }

    soundEngine.playEnemyShot(e.kind === 'boss');
    this.spawnProjectile(false, origin, dir, speed, damage, color, e.kind === 'boss' ? 1.5 : 1.0);
  }

  private updatePickupsAndObjectives(dt: number): void {
    for (const p of this.pickups) {
      if (!p.active) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.active = true;
          p.mesh.visible = true;
        }
        continue;
      }

      p.mesh.rotation.y += 1.6 * dt;
      if (this.playerPos.distanceTo(p.pos) < 1.8) {
        let used = false;
        if (p.type === 'health' && this.health < this.maxHealth) {
          this.health = Math.min(this.maxHealth, this.health + 35);
          used = true;
          this.showBanner('+35 HEALTH RESTORED', 1.4);
        } else if (p.type === 'armor' && this.armor < this.maxArmor) {
          this.armor = Math.min(this.maxArmor, this.armor + 40);
          used = true;
          this.showBanner('+40 ARMOR PLATING', 1.4);
        } else if (p.type === 'ammo') {
          this.weaponAmmo.pulse.reserve = Math.min(WEAPONS.pulse.reserveMax, this.weaponAmmo.pulse.reserve + 64);
          this.weaponAmmo.scatter.reserve = Math.min(WEAPONS.scatter.reserveMax, this.weaponAmmo.scatter.reserve + 16);
          this.weaponAmmo.rail.reserve = Math.min(WEAPONS.rail.reserveMax, this.weaponAmmo.rail.reserve + 12);
          used = true;
          this.showBanner('AMMO RESUPPLY COLLECTED', 1.4);
        }
        if (used) {
          soundEngine.playPickup();
          p.active = false;
          p.mesh.visible = false;
          p.respawnTimer = 18;
        }
      }
    }

    for (const o of this.objectives) {
      if (o.completed) continue;
      if (o.mode === 'interact' && this.playerPos.distanceTo(o.pos) < 2.6) {
        this.completeObjective(o);
      }
    }
  }

  private completeObjective(o: ObjectiveEntity): void {
    if (o.completed) return;
    o.completed = true;
    o.core.visible = false;
    this.score += 300;
    soundEngine.playPickup();
    this.spawnBurst(o.pos.clone().setY(o.pos.y + 2), this.blueprint.accentColor, 18, 10);
    const doneCount = this.objectives.filter((item) => item.completed).length;
    this.showBanner(`OBJECTIVE UPDATED (${doneCount}/${this.objectives.length})`, 2.2);
  }

  private checkModeProgression(dt: number): void {
    const aliveEnemies = this.enemies.filter((e) => e.alive);

    if (this.mode === 'campaign') {
      const allObjDone = this.objectives.every((o) => o.completed);
      const bossAlive = aliveEnemies.some((e) => e.kind === 'boss');

      if (this.missionId === 5) {
        if (allObjDone && !bossAlive) {
          soundEngine.playMissionComplete();
          this.setPhase('victory');
        }
      } else if (allObjDone && aliveEnemies.length === 0) {
        soundEngine.playMissionComplete();
        this.setPhase('victory');
      } else if (allObjDone && aliveEnemies.length > 0 && this.statusBannerTimer === 0) {
        // Nudge player subtly once objectives are complete
        // Wait: only update objective title via HUD
      }
    } else if (this.mode === 'boss') {
      const bossAlive = aliveEnemies.some((e) => e.kind === 'boss');
      if (!bossAlive) {
        soundEngine.playMissionComplete();
        this.setPhase('victory');
      }
    } else if (this.mode === 'survival') {
      if (aliveEnemies.length === 0 && !this.waveTransitionLock) {
        this.waveTransitionLock = true;
        this.survivalSpawnTimer = 2.5;
        this.showBanner(`WAVE ${this.wave} CLEARED! PREPARING WAVE ${this.wave + 1}`, 2.4);
        soundEngine.playPickup();
      }
      if (this.waveTransitionLock) {
        this.survivalSpawnTimer -= dt;
        if (this.survivalSpawnTimer <= 0) {
          this.waveTransitionLock = false;
          this.wave++;
          this.health = Math.min(this.maxHealth, this.health + 20);
          const count = 3 + this.wave * 2;
          for (let i = 0; i < count; i++) {
            const ang = (i / count) * Math.PI * 2;
            const r = 26 + Math.random() * 8;
            const kind = i % 4 === 0 ? 'mech' : i % 3 === 0 ? 'stalker' : 'drone';
            this.spawnEnemy(kind, Math.cos(ang) * r, 0, Math.sin(ang) * r);
          }
          if (this.wave % 3 === 0) {
            this.spawnEnemy('boss', 0, 0, -28);
            this.showBanner(`BOSS WAVE ${this.wave}: OMEGA WARDEN INBOUND!`, 3.0);
          } else {
            this.showBanner(`WAVE ${this.wave} ENGAGED`, 2.0);
          }
        }
      }
    } else if (this.mode === 'training') {
      // Respawn training targets after clearing all so player can practice endlessly
      if (aliveEnemies.length === 0) {
        this.survivalSpawnTimer += dt;
        if (this.survivalSpawnTimer > 2.0) {
          this.survivalSpawnTimer = 0;
          this.showBanner('TRAINING TARGETS RESET', 2.0);
          this.blueprint.enemies.forEach((e) => {
            this.spawnEnemy(e.kind, e.x, e.y, e.z, e.patrolOffset);
          });
        }
      }
    }
  }

  private spawnBurst(pos: THREE.Vector3, color: number, count: number, speed: number): void {
    let spawned = 0;
    for (const pt of this.particles) {
      if (pt.active) continue;
      pt.active = true;
      pt.life = 0;
      pt.maxLife = 0.35 + Math.random() * 0.35;
      pt.scaleStart = 0.7 + Math.random() * 0.7;
      pt.scaleEnd = 0.05;
      pt.gravity = 12;
      pt.mesh.position.copy(pos);
      pt.vel.set(
        (Math.random() - 0.5) * speed * 2,
        Math.random() * speed * 1.1,
        (Math.random() - 0.5) * speed * 2
      );
      (pt.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      (pt.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
      pt.mesh.visible = true;
      spawned++;
      if (spawned >= count) break;
    }
  }

  private updateParticles(dt: number): void {
    for (const pt of this.particles) {
      if (!pt.active) continue;
      pt.life += dt;
      if (pt.life >= pt.maxLife) {
        pt.active = false;
        pt.mesh.visible = false;
        continue;
      }
      const t = pt.life / pt.maxLife;
      pt.vel.y -= pt.gravity * dt;
      pt.mesh.position.addScaledVector(pt.vel, dt);
      const s = THREE.MathUtils.lerp(pt.scaleStart, pt.scaleEnd, t);
      pt.mesh.scale.setScalar(s);
      (pt.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t;
    }
  }

  private emitHud(): void {
    const wId = this.getActiveWeaponId();
    const spec = WEAPONS[wId];
    const ammo = this.weaponAmmo[wId];

    // Radar blips within 42m
    const radarBlips: RadarBlip[] = [];
    const cosY = Math.cos(-this.yaw);
    const sinY = Math.sin(-this.yaw);
    const radarRange = 42;

    for (const e of this.enemies) {
      if (!e.alive) continue;
      const rx = e.pos.x - this.playerPos.x;
      const rz = e.pos.z - this.playerPos.z;
      const lx = (rx * cosY - rz * sinY) / radarRange;
      const lz = (rx * sinY + rz * cosY) / radarRange;
      if (lx * lx + lz * lz <= 1.0) {
        radarBlips.push({ dx: lx, dz: lz, type: e.kind === 'boss' ? 'boss' : 'enemy' });
      }
    }

    for (const o of this.objectives) {
      if (o.completed) continue;
      const rx = o.pos.x - this.playerPos.x;
      const rz = o.pos.z - this.playerPos.z;
      let lx = (rx * cosY - rz * sinY) / radarRange;
      let lz = (rx * sinY + rz * cosY) / radarRange;
      const mag = Math.hypot(lx, lz);
      if (mag > 0.92) {
        lx = (lx / mag) * 0.92;
        lz = (lz / mag) * 0.92;
      }
      radarBlips.push({ dx: lx, dz: lz, type: 'objective' });
    }

    const boss = this.enemies.find((e) => e.alive && e.kind === 'boss');
    const objDone = this.objectives.filter((o) => o.completed).length;

    let objTitle = this.blueprint.objectiveLabel;
    if (this.mode === 'campaign' && this.objectives.length > 0 && objDone >= this.objectives.length) {
      objTitle = this.missionId === 5 ? 'Destroy Omega Gravity Warden' : 'Eliminate Remaining Hostiles';
    }

    this.onHudUpdate({
      health: Math.ceil(this.health),
      maxHealth: this.maxHealth,
      armor: Math.ceil(this.armor),
      maxArmor: this.maxArmor,
      weaponId: wId,
      weaponName: spec.name,
      ammoInMag: ammo.mag,
      magSize: spec.magSize,
      reserveAmmo: ammo.reserve,
      isReloading: this.isReloading,
      reloadProgress: this.isReloading ? 1 - this.reloadTimer / spec.reloadTime : 0,
      isAiming: this.isAiming,
      isCrouching: this.isCrouching,
      isSprinting: this.isSprinting,
      gravityCooldown: this.gravityCooldown,
      gravityMaxCooldown: this.gravityMaxCooldown,
      score: this.score,
      kills: this.kills,
      wave: this.wave,
      objectiveTitle: objTitle,
      objectiveProgress:
        this.mode === 'survival'
          ? this.kills
          : this.mode === 'training'
          ? this.kills
          : objDone,
      objectiveTotal:
        this.mode === 'campaign' && this.objectives.length > 0 ? this.objectives.length : 0,
      phase: this.phase,
      elapsedSeconds: this.elapsedSeconds,
      hitMarkerTimer: this.hitMarkerTimer,
      killMarkerTimer: this.killMarkerTimer,
      damageFlash: this.damageFlash,
      damageAngle: this.damageAngle,
      statusBanner: this.statusBanner,
      bossName: boss ? 'OMEGA GRAVITY WARDEN' : null,
      bossHealth: boss ? Math.max(0, Math.ceil(boss.hp)) : 0,
      bossMaxHealth: boss ? boss.maxHp : 1,
      fps: this.currentFps,
      radarBlips,
      pointerLocked: this.pointerLocked,
      accuracy: this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 100,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    soundEngine.setMusicMood('silent');

    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }

    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('mousemove', this.boundMouseMove);
    this.renderer.domElement.removeEventListener('mousedown', this.boundMouseDown);
    window.removeEventListener('mouseup', this.boundMouseUp);
    document.removeEventListener('pointerlockchange', this.boundPointerLockChange);
    this.renderer.domElement.removeEventListener('contextmenu', this.boundContextMenu);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.boundContextLost);

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });

    this.textures.dispose();
    this.renderer.dispose();
    this.container.innerHTML = '';
  }
}

function containerWidth(el: HTMLElement): number {
  return el.clientWidth || window.innerWidth;
}

function containerHeight(el: HTMLElement): number {
  return el.clientHeight || window.innerHeight;
}
