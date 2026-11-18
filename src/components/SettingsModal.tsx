import React from 'react';
import { X, Sliders, Volume2, Smartphone } from 'lucide-react';
import {
  FpsLimit,
  GameSettings,
  GraphicsQuality,
  TouchControlsMode,
} from '../types/game';
import { soundEngine } from '../audio/SoundEngine';

interface SettingsModalProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onChange,
  onClose,
}) => {
  const qualities: GraphicsQuality[] = ['low', 'medium', 'high', 'ultra'];
  const fpsOptions: FpsLimit[] = [30, 45, 60];
  const touchModes: TouchControlsMode[] = ['always', 'auto', 'off'];

  const update = <K extends keyof GameSettings>(key: K, val: GameSettings[K]) => {
    soundEngine.playMenuClick(640);
    onChange({ ...settings, [key]: val });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div className="dg-scroll max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-cyan-500/30 bg-[#0a101c] p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-cyan-400" />
            <h2 className="font-display text-xl font-bold tracking-wider text-white">
              SYSTEM SETTINGS
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close Settings"
            onClick={() => {
              soundEngine.playMenuClick(520);
              onClose();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-slate-900 text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-5 text-sm">
          {/* Graphics Quality */}
          <div>
            <label className="block font-display text-xs font-semibold tracking-wider text-slate-300">
              GRAPHICS QUALITY (ANDROID OPTIMIZATION)
            </label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {qualities.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => update('quality', q)}
                  className={`rounded-lg border py-2 font-display text-xs font-bold uppercase transition ${
                    settings.quality === q
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                      : 'border-white/10 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* FPS Cap */}
          <div>
            <label className="block font-display text-xs font-semibold tracking-wider text-slate-300">
              TARGET FRAME RATE
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {fpsOptions.map((fps) => (
                <button
                  key={fps}
                  type="button"
                  onClick={() => update('fpsLimit', fps)}
                  className={`rounded-lg border py-2 font-mono-tech text-xs font-bold transition ${
                    settings.fpsLimit === fps
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                      : 'border-white/10 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {fps} FPS
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Controls & Sensitivity */}
          <div className="space-y-3 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 text-xs font-display font-semibold tracking-wider text-cyan-300">
              <Smartphone className="h-4 w-4" />
              <span>CONTROLS & TOUCHSCREEN</span>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>Touch HUD Controls</span>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {touchModes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => update('touchControls', m)}
                    className={`rounded-lg border py-1.5 font-display text-xs font-semibold uppercase transition ${
                      settings.touchControls === m
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                        : 'border-white/10 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {m === 'always' ? 'Show Always' : m === 'auto' ? 'Touch Auto' : 'Hidden'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>Camera Look Sensitivity</span>
                <span className="font-mono-tech text-cyan-300">
                  {settings.sensitivity.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={settings.sensitivity}
                onChange={(e) => update('sensitivity', parseFloat(e.target.value))}
                className="mt-1.5 w-full accent-cyan-400"
              />
            </div>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Invert Vertical Look Axis</span>
              <input
                type="checkbox"
                checked={settings.invertY}
                onChange={(e) => update('invertY', e.target.checked)}
                className="h-4 w-4 accent-cyan-400"
              />
            </label>
          </div>

          {/* Audio Controls */}
          <div className="space-y-3 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 text-xs font-display font-semibold tracking-wider text-amber-300">
              <Volume2 className="h-4 w-4" />
              <span>AUDIO MIXER</span>
            </div>

            {[
              { key: 'masterVolume' as const, label: 'Master Volume' },
              { key: 'musicVolume' as const, label: 'Music Volume' },
              { key: 'sfxVolume' as const, label: 'Weapons & SFX Volume' },
            ].map((item) => (
              <div key={item.key}>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{item.label}</span>
                  <span className="font-mono-tech text-amber-300">
                    {Math.round(settings[item.key] * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings[item.key]}
                  onChange={(e) => update(item.key, parseFloat(e.target.value))}
                  className="mt-1 w-full accent-amber-400"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => {
              soundEngine.playMenuClick(720);
              onClose();
            }}
            className="rounded-xl bg-cyan-500 px-6 py-2.5 font-display text-sm font-bold tracking-wider text-slate-950 hover:bg-cyan-400 transition"
          >
            SAVE & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
