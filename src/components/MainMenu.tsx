import React, { useState } from 'react';
import {
  Play,
  Map,
  Shield,
  Crosshair,
  Skull,
  Settings,
  Power,
  Smartphone,
  X,
  Check,
  ChevronRight,
} from 'lucide-react';
import { GameMode, MISSIONS } from '../types/game';
import { soundEngine } from '../audio/SoundEngine';
import { MenuScene3D } from './MenuScene3D';

interface MainMenuProps {
  unlockedMission: number;
  selectedMission: number;
  onStartMode: (mode: GameMode, missionId: number) => void;
  onOpenSettings: () => void;
  onExit: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  unlockedMission,
  selectedMission,
  onStartMode,
  onOpenSettings,
  onExit,
}) => {
  const [showCampaign, setShowCampaign] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [activeMissionId, setActiveMissionId] = useState(selectedMission);

  const selectedMissionObj =
    MISSIONS.find((m) => m.id === activeMissionId) || MISSIONS[0];

  const handleAction = (cb: () => void, pitch = 680) => {
    soundEngine.unlock();
    soundEngine.setMusicMood('menu');
    soundEngine.playMenuClick(pitch);
    cb();
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MenuScene3D />

      {/* Measured dark contrast gradient scrim for crisp legibility */}
      <div
        className="fixed inset-0 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(5,9,18,0.92) 0%, rgba(5,9,18,0.68) 46%, rgba(5,9,18,0.28) 100%)',
        }}
      />

      {/* Foreground Menu Content */}
      <div className="relative z-20 flex h-full w-full flex-col justify-between p-5 sm:p-8 lg:p-10">
        {/* Top Row: Brand Title + Quick Android Guide Button */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-tech tracking-widest text-cyan-400">
              <span>TACTICAL 3D SCI-FI FPS</span>
              <span aria-hidden="true">·</span>
              <span>ANDROID &amp; DESKTOP</span>
            </div>

            <h1 className="mt-1 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[0.14em] leading-none">
              <span className="dg-title-metal block">DARK</span>
              <span className="block">
                <span className="dg-title-metal">GRA</span>
                <span className="dg-title-cyan-v relative inline-block">
                  V
                  <span
                    className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-amber-400"
                    aria-hidden="true"
                  />
                </span>
                <span className="dg-title-metal">ITY</span>
              </span>
            </h1>
          </div>

          <button
            type="button"
            onClick={() => handleAction(() => setShowAndroidGuide(true), 600)}
            className="flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-slate-950/80 px-3.5 py-2 text-xs font-display font-semibold tracking-wider text-cyan-200 hover:bg-slate-900 transition whitespace-nowrap shrink-0"
          >
            <Smartphone className="h-4 w-4 text-cyan-400" />
            <span>ANDROID APK INFO</span>
          </button>
        </div>

        {/* Main Left Navigation Column + Right Subtle Reference Art Showcase */}
        <div className="my-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <nav
            aria-label="Main Menu"
            className="w-full max-w-xs sm:max-w-sm space-y-2"
          >
            {/* Primary PLAY CTA */}
            <button
              type="button"
              onClick={() =>
                handleAction(() => onStartMode('campaign', selectedMission), 780)
              }
              className="group flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 px-5 py-3.5 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.38)] hover:brightness-110 active:scale-[0.99] transition"
            >
              <span className="flex items-center gap-3 font-display text-lg font-bold tracking-wider">
                <Play className="h-5 w-5 fill-current" />
                PLAY
              </span>
              <span className="font-mono-tech text-xs font-bold opacity-85">
                M-0{selectedMission}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAction(() => setShowCampaign(true), 640)}
                className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-slate-950/80 px-4 py-2.5 font-display text-sm font-semibold tracking-wider text-slate-100 hover:border-cyan-400/50 hover:bg-slate-900 transition"
              >
                <Map className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>CAMPAIGN</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction(() => onStartMode('survival', 2), 680)}
                className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-slate-950/80 px-4 py-2.5 font-display text-sm font-semibold tracking-wider text-slate-100 hover:border-amber-400/50 hover:bg-slate-900 transition"
              >
                <Shield className="h-4 w-4 text-amber-400 shrink-0" />
                <span>SURVIVAL</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction(() => onStartMode('training', 3), 620)}
                className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-slate-950/80 px-4 py-2.5 font-display text-sm font-semibold tracking-wider text-slate-100 hover:border-sky-400/50 hover:bg-slate-900 transition"
              >
                <Crosshair className="h-4 w-4 text-sky-400 shrink-0" />
                <span>TRAINING</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction(() => onStartMode('boss', 5), 740)}
                className="flex items-center gap-2.5 rounded-xl border border-red-500/35 bg-red-950/45 px-4 py-2.5 font-display text-sm font-semibold tracking-wider text-red-100 hover:border-red-400 hover:bg-red-900/55 transition"
              >
                <Skull className="h-4 w-4 text-red-400 shrink-0" />
                <span>BOSS BATTLE</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleAction(onOpenSettings, 580)}
                className="flex items-center gap-2.5 rounded-xl border border-white/12 bg-slate-950/75 px-4 py-2.5 font-display text-sm font-semibold tracking-wider text-slate-300 hover:text-white hover:bg-slate-900 transition"
              >
                <Settings className="h-4 w-4 text-slate-400 shrink-0" />
                <span>SETTINGS</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction(onExit, 420)}
                className="flex items-center gap-2.5 rounded-xl border border-white/12 bg-slate-950/75 px-4 py-2.5 font-display text-sm font-semibold tracking-wider text-slate-300 hover:text-red-300 hover:border-red-500/40 transition"
              >
                <Power className="h-4 w-4 text-slate-400 shrink-0" />
                <span>EXIT</span>
              </button>
            </div>
          </nav>

          {/* Key visual card referencing uploaded concept art */}
          <div className="hidden md:block w-72 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/80 shadow-xl">
            <img
              src="/assets/aistudio/header_b91f73fa.jpg"
              alt="Dark Gravity visual concept art"
              className="h-36 w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="px-3.5 py-2.5">
              <div className="text-[11px] font-mono-tech text-amber-400">
                5 CAMPAIGN SECTORS · 3 ENERGY WEAPONS
              </div>
              <div className="mt-0.5 text-xs text-slate-300">
                Gravity Pulse · Lift Pads · Omega Warden Boss
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Quiet Hint */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            Touchscreen Landscape Ready · Desktop WASD + Mouse Supported
          </span>
          <span className="font-mono-tech text-slate-500">
            WebGL2 Three.js Engine
          </span>
        </div>
      </div>

      {/* CAMPAIGN MISSION SELECT MODAL */}
      {showCampaign && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="dg-scroll max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-cyan-500/30 bg-[#090f1b] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="font-display text-xl font-bold tracking-wider text-white">
                  CAMPAIGN MISSIONS
                </h2>
                <p className="text-xs text-slate-400">
                  Select any sector to deploy immediately
                </p>
              </div>
              <button
                type="button"
                aria-label="Close Campaign Select"
                onClick={() => setShowCampaign(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-slate-900 text-slate-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                {MISSIONS.map((m) => {
                  const isSelected = m.id === activeMissionId;
                  const isCleared = m.id < unlockedMission;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playMenuClick(640);
                        setActiveMissionId(m.id);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500/15 text-white'
                          : 'border-white/10 bg-slate-900/75 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[11px] font-mono-tech">
                          <span style={{ color: m.accentHex }}>{m.code}</span>
                          {isCleared && (
                            <span className="flex items-center gap-0.5 text-emerald-400">
                              <Check className="h-3 w-3" /> CLEARED
                            </span>
                          )}
                        </div>
                        <div className="truncate font-display text-sm font-bold">
                          {m.title}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                    </button>
                  );
                })}
              </div>

              {/* Selected Mission Briefing */}
              <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-900/60 p-4">
                <div>
                  <div
                    className="font-mono-tech text-xs font-bold"
                    style={{ color: selectedMissionObj.accentHex }}
                  >
                    {selectedMissionObj.code} · {selectedMissionObj.subtitle}
                  </div>
                  <h3 className="mt-1 font-display text-xl font-bold text-white">
                    {selectedMissionObj.title}
                  </h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                    {selectedMissionObj.briefing}
                  </p>

                  <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-xs font-mono-tech text-slate-400">
                    <div>
                      ENVIRONMENT:{' '}
                      <span className="text-slate-200">
                        {selectedMissionObj.environment}
                      </span>
                    </div>
                    <div>
                      GRAVITY:{' '}
                      <span className="text-cyan-300">
                        {selectedMissionObj.gravityScale.toFixed(2)}G
                      </span>
                    </div>
                    <div>
                      PRIMARY OBJECTIVE:{' '}
                      <span className="text-amber-300">
                        {selectedMissionObj.objectiveLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playMenuClick(780);
                    setShowCampaign(false);
                    onStartMode('campaign', selectedMissionObj.id);
                  }}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 font-display text-sm font-bold tracking-wider text-slate-950 hover:bg-cyan-400 transition"
                >
                  <Play className="h-4 w-4 fill-current" /> DEPLOY TO SECTOR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANDROID APK / INSTALL INFORMATION MODAL */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="dg-scroll max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-cyan-500/30 bg-[#090f1b] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-cyan-400" />
                <h2 className="font-display text-lg font-bold tracking-wider text-white">
                  PLAY ON ANDROID / BUILD APK
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAndroidGuide(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-slate-900 text-slate-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs leading-relaxed text-slate-300">
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-amber-200">
                This cloud preview environment runs as a WebGL web application and does not include the Android SDK / Gradle toolchain to compile a signed binary <span className="font-mono-tech">.apk</span> directly inside the browser sandbox.
              </div>

              <div>
                <h3 className="font-display text-sm font-bold text-cyan-300">
                  1. Instant Android Fullscreen Install (No PC Needed)
                </h3>
                <p className="mt-1 text-slate-300">
                  Open the Shared App URL in <strong>Chrome on Android</strong>, tap the browser menu (⋮), and choose <strong>Add to Home Screen / Install App</strong>. It launches in fullscreen landscape with native touch controls.
                </p>
              </div>

              <div>
                <h3 className="font-display text-sm font-bold text-cyan-300">
                  2. Package a Real Signed .APK Locally (Capacitor)
                </h3>
                <p className="mt-1 text-slate-300">
                  Download/export this project source and run these commands on a machine with Node.js + Android Studio:
                </p>
                <pre className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-slate-950 p-3 font-mono-tech text-[11px] text-sky-300">
{`npm install
npm run build
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "DARK GRAVITY" com.darkgravity.fps --web-dir=dist
npx cap add android
npx cap sync
npx cap open android  # Build -> Generate Signed APK`}
                </pre>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAndroidGuide(false)}
                className="rounded-xl bg-cyan-500 px-5 py-2 font-display text-xs font-bold tracking-wider text-slate-950 hover:bg-cyan-400"
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
