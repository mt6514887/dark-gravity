import React from 'react';
import { Play, RotateCcw, Settings, Home, Trophy, Skull } from 'lucide-react';
import { GameMode, HudSnapshot, MISSIONS, WEAPONS } from '../types/game';

interface GameHUDProps {
  hud: HudSnapshot;
  mode: GameMode;
  missionId: number;
  onResume: () => void;
  onRestart: () => void;
  onNextMission: () => void;
  onOpenSettings: () => void;
  onQuitToMenu: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  mode,
  missionId,
  onResume,
  onRestart,
  onNextMission,
  onOpenSettings,
  onQuitToMenu,
}) => {
  const weapon = WEAPONS[hud.weaponId];
  const hasNextMission = mode === 'campaign' && missionId < MISSIONS.length;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* Damage Red Vignette */}
      {hud.damageFlash > 0.02 && (
        <div
          className="absolute inset-0 transition-opacity duration-75"
          style={{
            opacity: hud.damageFlash * 0.65,
            background:
              'radial-gradient(circle at center, transparent 48%, rgba(239,68,68,0.75) 100%)',
          }}
        />
      )}

      {/* Top-Left: Radar Minimap & Objective */}
      <div className="absolute top-3 left-3 flex items-start gap-3">
        {/* Tactical Radar */}
        <div className="relative h-24 w-24 rounded-full border border-cyan-400/40 bg-slate-950/80 overflow-hidden">
          <div className="absolute inset-3 rounded-full border border-cyan-500/15" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-cyan-500/15" />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-cyan-500/15" />
          {/* Player Arrow */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rotate-45 border-t-2 border-l-2 border-cyan-300"
          />
          {/* Enemy / Objective Blips */}
          {hud.radarBlips.map((b, idx) => (
            <div
              key={idx}
              className={`absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                b.type === 'boss'
                  ? 'h-3 w-3 bg-red-500 ring-2 ring-amber-400'
                  : b.type === 'objective'
                  ? 'bg-cyan-400'
                  : 'bg-red-500'
              }`}
              style={{
                left: `${50 + b.dx * 44}%`,
                top: `${50 + b.dz * 44}%`,
              }}
            />
          ))}
        </div>

        {/* Objective & Wave Readout */}
        <div className="rounded-xl border border-white/12 bg-slate-950/80 px-3.5 py-2">
          <div className="flex items-center gap-2 text-[11px] font-display tracking-wider text-cyan-300">
            <span>{mode === 'survival' ? `WAVE ${hud.wave}` : mode.toUpperCase()}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tech text-slate-300">{formatTime(hud.elapsedSeconds)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tech text-amber-300">{hud.fps} FPS</span>
          </div>
          <div className="mt-0.5 text-sm font-semibold text-white">
            {hud.objectiveTitle}
            {hud.objectiveTotal > 0 && (
              <span className="ml-2 font-mono-tech text-cyan-300">
                {hud.objectiveProgress}/{hud.objectiveTotal}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400 font-mono-tech">
            <span>SCORE {hud.score}</span>
            <span>KILLS {hud.kills}</span>
          </div>
        </div>
      </div>

      {/* Top-Center Boss Health Bar */}
      {hud.bossName && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[min(420px,56vw)] rounded-xl border border-red-500/40 bg-slate-950/85 px-4 py-2">
          <div className="flex items-center justify-between text-xs font-display font-bold tracking-wider text-red-300">
            <span>{hud.bossName}</span>
            <span className="font-mono-tech">
              {hud.bossHealth} / {hud.bossMaxHealth}
            </span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 transition-all duration-150"
              style={{ width: `${(hud.bossHealth / Math.max(1, hud.bossMaxHealth)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Banner Notification */}
      {hud.statusBanner && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 rounded-lg border border-cyan-400/45 bg-slate-950/85 px-4 py-1.5 text-xs font-display font-semibold tracking-wider text-cyan-200 whitespace-nowrap">
          {hud.statusBanner}
        </div>
      )}

      {/* Center Dynamic Crosshair & Hitmarkers */}
      {hud.phase === 'active' && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <div
            className={`relative transition-transform duration-100 ${
              hud.isAiming ? 'scale-75' : hud.isSprinting ? 'scale-125' : 'scale-100'
            }`}
          >
            <div className="h-1 w-1 rounded-full bg-cyan-300" />
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-2 w-0.5 bg-white/80" />
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-2 w-0.5 bg-white/80" />
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-0.5 w-2 bg-white/80" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 h-0.5 w-2 bg-white/80" />
          </div>

          {hud.hitMarkerTimer > 0 && (
            <div
              className={`absolute h-6 w-6 rotate-45 ${
                hud.killMarkerTimer > 0 ? 'border-2 border-red-500' : 'border border-amber-300'
              }`}
            />
          )}
        </div>
      )}

      {/* Bottom-Center Health, Armor & Weapon Telemetry Bar (compact for mobile landscape!) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-4 rounded-xl border border-white/12 bg-slate-950/85 px-4 py-2">
        {/* Health & Armor */}
        <div className="w-36 space-y-1.5">
          <div>
            <div className="flex justify-between text-[11px] font-mono-tech">
              <span className="text-emerald-400 font-semibold">HP</span>
              <span className="text-white">{hud.health}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-emerald-400 transition-all duration-150"
                style={{ width: `${(hud.health / hud.maxHealth) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-mono-tech">
              <span className="text-cyan-400 font-semibold">ARMOR</span>
              <span className="text-white">{hud.armor}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-cyan-400 transition-all duration-150"
                style={{ width: `${(hud.armor / hud.maxArmor) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="h-9 w-px bg-white/15" />

        {/* Weapon & Ammo */}
        <div className="min-w-[125px] text-right">
          <div
            className="text-[11px] font-display font-bold tracking-wider truncate"
            style={{ color: weapon.hexColor }}
          >
            {weapon.shortName}
          </div>
          {hud.isReloading ? (
            <div className="mt-1">
              <div className="text-xs font-mono-tech text-amber-300">RELOADING...</div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${hud.reloadProgress * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="font-mono-tech text-xl font-bold leading-tight text-white">
              {hud.ammoInMag}
              <span className="text-xs font-normal text-slate-400"> / {hud.reserveAmmo}</span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Controls Hint (subtle, bottom-left above joystick only if pointer locked) */}
      {hud.pointerLocked && (
        <div className="hidden lg:block absolute top-3 right-16 rounded-lg border border-white/10 bg-slate-950/75 px-3 py-1.5 text-[11px] text-slate-300 font-mono-tech">
          WASD Move · LMB Fire · RMB Aim · R Reload · Q Switch · G Gravity Pulse · ESC Pause
        </div>
      )}

      {/* PAUSE OVERLAY */}
      {hud.phase === 'paused' && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-[#0b111e] p-6 shadow-2xl">
            <h2 className="font-display text-2xl font-bold tracking-wider text-white text-center">
              MISSION PAUSED
            </h2>
            <p className="mt-1 text-center text-xs text-slate-400">
              {hud.objectiveTitle} · Score {hud.score}
            </p>
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={onResume}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 font-display text-sm font-bold tracking-wider text-slate-950 hover:bg-cyan-400 transition"
              >
                <Play className="h-4 w-4 fill-current" /> RESUME MISSION
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-900 py-2.5 font-display text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
              >
                <RotateCcw className="h-4 w-4" /> RESTART
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-900 py-2.5 font-display text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
              >
                <Settings className="h-4 w-4" /> SETTINGS
              </button>
              <button
                type="button"
                onClick={onQuitToMenu}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/35 bg-red-950/40 py-2.5 font-display text-sm font-semibold text-red-300 hover:bg-red-900/50 transition"
              >
                <Home className="h-4 w-4" /> MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY OVERLAY */}
      {hud.phase === 'victory' && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="w-full max-w-md rounded-2xl border border-cyan-400/45 bg-[#0b111e] p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300">
              <Trophy className="h-6 w-6" />
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-wider text-white">
              MISSION ACCOMPLISHED
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Sector secured. Hostile forces neutralized.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-slate-900/80 p-3 font-mono-tech">
              <div>
                <div className="text-[10px] text-slate-400">SCORE</div>
                <div className="text-base font-bold text-cyan-300">{hud.score}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">KILLS</div>
                <div className="text-base font-bold text-white">{hud.kills}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">ACCURACY</div>
                <div className="text-base font-bold text-amber-300">{hud.accuracy}%</div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              {hasNextMission && (
                <button
                  type="button"
                  onClick={onNextMission}
                  className="w-full rounded-xl bg-cyan-500 py-3 font-display text-sm font-bold tracking-wider text-slate-950 hover:bg-cyan-400 transition"
                >
                  NEXT MISSION
                </button>
              )}
              <button
                type="button"
                onClick={onRestart}
                className="w-full rounded-xl border border-white/15 bg-slate-900 py-2.5 font-display text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
              >
                PLAY AGAIN
              </button>
              <button
                type="button"
                onClick={onQuitToMenu}
                className="w-full rounded-xl border border-white/15 bg-slate-900 py-2.5 font-display text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER OVERLAY */}
      {hud.phase === 'gameover' && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/45 bg-[#120b10] p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-400">
              <Skull className="h-6 w-6" />
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-wider text-red-100">
              CRITICAL FAILURE
            </h2>
            <p className="mt-1 text-xs text-red-200/70">
              Suit integrity lost in combat.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-slate-950/70 p-3 font-mono-tech">
              <div>
                <div className="text-[10px] text-slate-400">SCORE</div>
                <div className="text-base font-bold text-amber-300">{hud.score}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">KILLS</div>
                <div className="text-base font-bold text-white">{hud.kills}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">WAVE / TIME</div>
                <div className="text-base font-bold text-cyan-300">
                  {mode === 'survival' ? `W${hud.wave}` : formatTime(hud.elapsedSeconds)}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onRestart}
                className="w-full rounded-xl bg-red-500 py-3 font-display text-sm font-bold tracking-wider text-white hover:bg-red-400 transition"
              >
                REDEPLOY MISSION
              </button>
              <button
                type="button"
                onClick={onQuitToMenu}
                className="w-full rounded-xl border border-white/15 bg-slate-900 py-2.5 font-display text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
