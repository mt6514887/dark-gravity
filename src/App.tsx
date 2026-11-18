import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/SoundEngine';
import { GameHUD } from './components/GameHUD';
import { LoadingScreen } from './components/LoadingScreen';
import { MainMenu } from './components/MainMenu';
import { MobileControls } from './components/MobileControls';
import { SettingsModal } from './components/SettingsModal';
import { GameEngine } from './game/GameEngine';
import {
  DEFAULT_SETTINGS,
  GameMode,
  GameSettings,
  HudSnapshot,
  MISSIONS,
  ScreenState,
} from './types/game';

const SETTINGS_STORAGE_KEY = 'dark_gravity_settings_v1';
const PROGRESS_STORAGE_KEY = 'dark_gravity_unlocked_mission_v1';

const INITIAL_HUD: HudSnapshot = {
  health: 100,
  maxHealth: 100,
  armor: 60,
  maxArmor: 100,
  weaponId: 'pulse',
  weaponName: 'VX-9 Pulse Rifle',
  ammoInMag: 32,
  magSize: 32,
  reserveAmmo: 160,
  isReloading: false,
  reloadProgress: 0,
  isAiming: false,
  isCrouching: false,
  isSprinting: false,
  gravityCooldown: 0,
  gravityMaxCooldown: 7,
  score: 0,
  kills: 0,
  wave: 1,
  objectiveTitle: 'Deploying...',
  objectiveProgress: 0,
  objectiveTotal: 0,
  phase: 'active',
  elapsedSeconds: 0,
  hitMarkerTimer: 0,
  killMarkerTimer: 0,
  damageFlash: 0,
  damageAngle: 0,
  statusBanner: '',
  bossName: null,
  bossHealth: 0,
  bossMaxHealth: 1,
  fps: 60,
  radarBlips: [],
  pointerLocked: false,
  accuracy: 100,
};

function loadSavedSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadUnlockedMission(): number {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    const parsed = raw ? parseInt(raw, 10) : 1;
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= MISSIONS.length
      ? parsed
      : 1;
  } catch {
    return 1;
  }
}

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('menu');
  const [mode, setMode] = useState<GameMode>('campaign');
  const [missionId, setMissionId] = useState<number>(() => loadUnlockedMission());
  const [unlockedMission, setUnlockedMission] = useState<number>(() =>
    loadUnlockedMission()
  );
  const [settings, setSettings] = useState<GameSettings>(() => loadSavedSettings());
  const [showSettings, setShowSettings] = useState(false);

  const [loadProgress, setLoadProgress] = useState(0);
  const [loadLabel, setLoadLabel] = useState('Initializing');
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [sessionNonce, setSessionNonce] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const settingsRef = useRef<GameSettings>(settings);
  settingsRef.current = settings;

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Persist settings and sync engine/audio
  const handleSettingsChange = useCallback((next: GameSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
    soundEngine.setVolumes(next.masterVolume, next.musicVolume, next.sfxVolume);
    engineRef.current?.applyGraphicsSettings(next);
  }, []);

  // Mount / tear down GameEngine when entering 'loading' -> 'playing'
  useEffect(() => {
    if (screen !== 'loading' && screen !== 'playing') {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
      return;
    }

    const container = canvasMountRef.current;
    if (!container) return;

    setLoadProgress(10);
    setLoadLabel('Preparing 3D Sector');

    // Defer instantiation 1 frame so LoadingScreen paints immediately
    const timer = window.setTimeout(() => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }

      const engine = new GameEngine({
        container,
        mode,
        missionId,
        settings: settingsRef.current,
        onHudUpdate: (snapshot) => {
          setHud(snapshot);
          if (
            snapshot.phase === 'victory' &&
            mode === 'campaign' &&
            missionId >= unlockedMission &&
            missionId < MISSIONS.length
          ) {
            const nextUnlock = missionId + 1;
            setUnlockedMission(nextUnlock);
            try {
              localStorage.setItem(PROGRESS_STORAGE_KEY, String(nextUnlock));
            } catch {
              // ignore
            }
          }
        },
        onProgress: (pct, label) => {
          setLoadProgress(pct);
          setLoadLabel(label);
        },
      });
      engineRef.current = engine;
      setScreen('playing');
    }, 80);

    return () => {
      window.clearTimeout(timer);
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionNonce]);

  const startMode = useCallback((nextMode: GameMode, nextMissionId: number) => {
    soundEngine.unlock();
    setMode(nextMode);
    setMissionId(nextMissionId);
    setHud(INITIAL_HUD);
    setScreen('loading');
    setSessionNonce((n) => n + 1);
  }, []);

  const handleRestart = useCallback(() => {
    soundEngine.playMenuClick(720);
    setHud(INITIAL_HUD);
    setScreen('loading');
    setSessionNonce((n) => n + 1);
  }, []);

  const handleNextMission = useCallback(() => {
    const nextId = Math.min(MISSIONS.length, missionId + 1);
    startMode('campaign', nextId);
  }, [missionId, startMode]);

  const handleQuitToMenu = useCallback(() => {
    soundEngine.playMenuClick(500);
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }
    setScreen('menu');
    soundEngine.setMusicMood('menu');
  }, []);

  const currentMissionTitle =
    mode === 'survival'
      ? 'Survival Arena'
      : mode === 'training'
      ? 'Tactical Training Facility'
      : mode === 'boss'
      ? 'Boss Battle: Omega Warden'
      : MISSIONS.find((m) => m.id === missionId)?.title || 'Mission';

  const showTouchHud =
    settings.touchControls === 'always' ||
    (settings.touchControls === 'auto' && isTouchDevice);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#06090f]">
      {/* Dedicated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className={`fixed inset-0 z-0 ${
          screen === 'playing' || screen === 'loading' ? 'block' : 'hidden'
        }`}
      />

      {/* Main Menu */}
      {screen === 'menu' && (
        <MainMenu
          unlockedMission={unlockedMission}
          selectedMission={missionId}
          onStartMode={startMode}
          onOpenSettings={() => setShowSettings(true)}
          onExit={() => {
            soundEngine.setMusicMood('silent');
            setScreen('standby');
          }}
        />
      )}

      {/* Loading Screen */}
      {screen === 'loading' && (
        <LoadingScreen
          progress={loadProgress}
          label={loadLabel}
          missionTitle={currentMissionTitle}
        />
      )}

      {/* Active Gameplay HUD & Touch Controls */}
      {screen === 'playing' && (
        <>
          <GameHUD
            hud={hud}
            mode={mode}
            missionId={missionId}
            onResume={() => engineRef.current?.setPhase('active')}
            onRestart={handleRestart}
            onNextMission={handleNextMission}
            onOpenSettings={() => setShowSettings(true)}
            onQuitToMenu={handleQuitToMenu}
          />
          {hud.phase === 'active' && showTouchHud && (
            <MobileControls
              engineRef={engineRef}
              hud={hud}
              onPause={() => engineRef.current?.setPhase('paused')}
            />
          )}
        </>
      )}

      {/* Exit Standby Screen */}
      {screen === 'standby' && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#05080f] p-6 text-center">
          <h2 className="font-display text-3xl font-bold tracking-[0.2em] text-slate-200">
            DARK GRAVITY
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            Session suspended. Ready to re-engage when you are.
          </p>
          <button
            type="button"
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playMenuClick(720);
              soundEngine.setMusicMood('menu');
              setScreen('menu');
            }}
            className="mt-6 rounded-xl bg-cyan-500 px-6 py-3 font-display text-sm font-bold tracking-wider text-slate-950 hover:bg-cyan-400 transition"
          >
            RETURN TO COMMAND MENU
          </button>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
