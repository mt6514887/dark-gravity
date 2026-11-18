export type GameMode = 'campaign' | 'survival' | 'training' | 'boss';

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';

export type FpsLimit = 30 | 45 | 60;

export type TouchControlsMode = 'always' | 'auto' | 'off';

export type ScreenState = 'menu' | 'loading' | 'playing' | 'standby';

export type PlayPhase = 'active' | 'paused' | 'victory' | 'gameover';

export type WeaponId = 'pulse' | 'scatter' | 'rail';

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  shortName: string;
  damage: number;
  fireRate: number; // shots per second
  magSize: number;
  reserveMax: number;
  reloadTime: number; // seconds
  spread: number;
  adsSpread: number;
  pellets: number;
  projectileSpeed: number;
  color: number;
  hexColor: string;
  range: number;
  zoomFov: number;
  recoil: number;
}

export interface GameSettings {
  quality: GraphicsQuality;
  fpsLimit: FpsLimit;
  sensitivity: number; // 0.3 to 2.5
  masterVolume: number; // 0 to 1
  musicVolume: number; // 0 to 1
  sfxVolume: number; // 0 to 1
  touchControls: TouchControlsMode;
  invertY: boolean;
}

export interface MissionConfig {
  id: number;
  code: string;
  title: string;
  subtitle: string;
  environment: string;
  briefing: string;
  objectiveLabel: string;
  gravityScale: number;
  accentHex: string;
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  floorTheme: 'station' | 'factory' | 'lab' | 'alien' | 'core';
  targetCount: number;
  hasBoss: boolean;
}

export interface RadarBlip {
  dx: number; // normalized -1..1 relative to player look
  dz: number;
  type: 'enemy' | 'boss' | 'objective' | 'pickup';
}

export interface HudSnapshot {
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  weaponId: WeaponId;
  weaponName: string;
  ammoInMag: number;
  magSize: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  isAiming: boolean;
  isCrouching: boolean;
  isSprinting: boolean;
  gravityCooldown: number; // 0 = ready, >0 seconds remaining
  gravityMaxCooldown: number;
  score: number;
  kills: number;
  wave: number;
  objectiveTitle: string;
  objectiveProgress: number;
  objectiveTotal: number;
  phase: PlayPhase;
  elapsedSeconds: number;
  hitMarkerTimer: number;
  killMarkerTimer: number;
  damageFlash: number;
  damageAngle: number; // radians relative to look
  statusBanner: string;
  bossName: string | null;
  bossHealth: number;
  bossMaxHealth: number;
  fps: number;
  radarBlips: RadarBlip[];
  pointerLocked: boolean;
  accuracy: number;
}

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  pulse: {
    id: 'pulse',
    name: 'VX-9 Pulse Rifle',
    shortName: 'VX-9 PULSE',
    damage: 24,
    fireRate: 8.5,
    magSize: 32,
    reserveMax: 192,
    reloadTime: 1.35,
    spread: 0.018,
    adsSpread: 0.004,
    pellets: 1,
    projectileSpeed: 95,
    color: 0x38bdf8,
    hexColor: '#38bdf8',
    range: 140,
    zoomFov: 56,
    recoil: 0.022,
  },
  scatter: {
    id: 'scatter',
    name: 'Helios Flak Cannon',
    shortName: 'HELIOS FLAK',
    damage: 16,
    fireRate: 1.5,
    magSize: 8,
    reserveMax: 48,
    reloadTime: 1.65,
    spread: 0.075,
    adsSpread: 0.042,
    pellets: 7,
    projectileSpeed: 80,
    color: 0xf59e0b,
    hexColor: '#f59e0b',
    range: 75,
    zoomFov: 62,
    recoil: 0.065,
  },
  rail: {
    id: 'rail',
    name: 'Valkyrie Rail Lance',
    shortName: 'VALKYRIE RAIL',
    damage: 95,
    fireRate: 1.15,
    magSize: 6,
    reserveMax: 30,
    reloadTime: 1.85,
    spread: 0.006,
    adsSpread: 0.0008,
    pellets: 1,
    projectileSpeed: 165,
    color: 0xef4444,
    hexColor: '#ef4444',
    range: 200,
    zoomFov: 40,
    recoil: 0.085,
  },
};

export const MISSIONS: MissionConfig[] = [
  {
    id: 1,
    code: 'M-01',
    title: 'Abandoned Space Station',
    subtitle: 'Orbital Sector 7G · Low Gravity',
    environment: 'Orbital Dock & Airlocks',
    briefing:
      'Station Aegis-9 went dark after a rogue gravity surge. Use low-gravity corridors and lift pads to activate 3 Auxiliary Power Relays while clearing hostile Sentinel Drones.',
    objectiveLabel: 'Activate Power Relays',
    gravityScale: 0.68,
    accentHex: '#38bdf8',
    skyColor: 0x050914,
    fogColor: 0x070d1c,
    fogDensity: 0.012,
    floorTheme: 'station',
    targetCount: 3,
    hasBoss: false,
  },
  {
    id: 2,
    code: 'M-02',
    title: 'Dark Industrial Factory',
    subtitle: 'Titan Foundry Complex · Heavy Armor',
    environment: 'Smelter Catwalks & Ore Vats',
    briefing:
      'Automated assembly lines are pumping out Titan Battle Mechs. Detonate volatile fuel cells and overload 3 Smelter Conduits across the molten catwalks.',
    objectiveLabel: 'Overload Smelter Conduits',
    gravityScale: 1.0,
    accentHex: '#f59e0b',
    skyColor: 0x100b08,
    fogColor: 0x160f0b,
    fogDensity: 0.014,
    floorTheme: 'factory',
    targetCount: 3,
    hasBoss: false,
  },
  {
    id: 3,
    code: 'M-03',
    title: 'Underground Research Laboratory',
    subtitle: 'Sub-Level Bio-Vault · Containment Breach',
    environment: 'Cryo Chambers & Test Bays',
    briefing:
      'Xeno Stalker specimens have breached cryo-containment beneath the facility. Recover 3 encrypted Gravity Data Cores before total lockdown.',
    objectiveLabel: 'Recover Gravity Data Cores',
    gravityScale: 0.95,
    accentHex: '#22d3ee',
    skyColor: 0x040b12,
    fogColor: 0x061019,
    fogDensity: 0.016,
    floorTheme: 'lab',
    targetCount: 3,
    hasBoss: false,
  },
  {
    id: 4,
    code: 'M-04',
    title: 'Alien Planet',
    subtitle: 'Kepler-442 Basalt Rift · Xeno Swarm',
    environment: 'Crystalline Canyon & Monoliths',
    briefing:
      'Hostile alien hives are amplifying dark gravity anomalies from crystalline spires. Shatter 3 Xeno Hive Resonators under hostile planetary fire.',
    objectiveLabel: 'Destroy Hive Resonators',
    gravityScale: 0.85,
    accentHex: '#f97316',
    skyColor: 0x12091c,
    fogColor: 0x170d24,
    fogDensity: 0.013,
    floorTheme: 'alien',
    targetCount: 3,
    hasBoss: false,
  },
  {
    id: 5,
    code: 'M-05',
    title: 'Dark Gravity Core',
    subtitle: 'Singularity Reactor · Final Assault',
    environment: 'Zero-G Reactor Ring & Boss',
    briefing:
      'Reach the heart of the Dark Gravity Core. Overload the 2 outer Shield Pylons and destroy the Omega Gravity Warden guarding the singularity.',
    objectiveLabel: 'Destroy Shield Pylons & Boss',
    gravityScale: 0.72,
    accentHex: '#ef4444',
    skyColor: 0x060410,
    fogColor: 0x0a0618,
    fogDensity: 0.011,
    floorTheme: 'core',
    targetCount: 2,
    hasBoss: true,
  },
];

export const DEFAULT_SETTINGS: GameSettings = {
  quality: 'high',
  fpsLimit: 60,
  sensitivity: 1.0,
  masterVolume: 0.75,
  musicVolume: 0.55,
  sfxVolume: 0.85,
  touchControls: 'always',
  invertY: false,
};
