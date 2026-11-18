import React from 'react';

interface LoadingScreenProps {
  progress: number;
  label: string;
  missionTitle: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress,
  label,
  missionTitle,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060912] px-6">
      <div className="w-full max-w-md space-y-5 text-center">
        <div className="font-display text-3xl font-bold tracking-[0.18em]">
          <span className="dg-title-metal">DARK </span>
          <span className="dg-title-metal">GRA</span>
          <span className="dg-title-cyan-v">V</span>
          <span className="dg-title-metal">ITY</span>
        </div>

        <div className="rounded-2xl border border-cyan-500/25 bg-slate-950/90 p-5">
          <div className="text-xs font-display tracking-widest text-cyan-400 uppercase">
            Deploying Sector
          </div>
          <div className="mt-1 font-display text-lg font-bold text-white">
            {missionTitle}
          </div>

          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-amber-400 transition-all duration-200"
              style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs font-mono-tech text-slate-400">
            <span>{label}</span>
            <span className="text-cyan-300">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
