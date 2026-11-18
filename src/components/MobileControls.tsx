import React, { useRef, useState } from 'react';
import {
  Crosshair,
  Pause,
  RefreshCw,
  Repeat,
  ShieldAlert,
  ArrowUp,
  ChevronDown,
  Zap,
} from 'lucide-react';
import { GameEngine } from '../game/GameEngine';
import { HudSnapshot } from '../types/game';

interface MobileControlsProps {
  engineRef: React.MutableRefObject<GameEngine | null>;
  hud: HudSnapshot;
  onPause: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  engineRef,
  hud,
  onPause,
}) => {
  // Virtual joystick visual state
  const [joyActive, setJoyActive] = useState(false);
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0 });
  const joyTouchId = useRef<number | null>(null);
  const joyCenter = useRef({ x: 0, y: 0 });

  // Right-side look touch tracking
  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });

  // Fire button tracking (supports hold + drag aim!)
  const fireTouchId = useRef<number | null>(null);
  const lastFirePos = useRef({ x: 0, y: 0 });

  const joyRadius = 48;

  const handleJoyStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.changedTouches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    joyTouchId.current = touch.identifier;
    joyCenter.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setJoyActive(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleJoyMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyTouchId.current) {
        updateJoystick(t.clientX, t.clientY);
        break;
      }
    }
  };

  const handleJoyEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId.current) {
        joyTouchId.current = null;
        setJoyActive(false);
        setJoyKnob({ x: 0, y: 0 });
        if (engineRef.current) {
          engineRef.current.mobileInput.moveX = 0;
          engineRef.current.mobileInput.moveY = 0;
        }
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    let dx = clientX - joyCenter.current.x;
    let dy = clientY - joyCenter.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > joyRadius) {
      dx = (dx / dist) * joyRadius;
      dy = (dy / dist) * joyRadius;
    }
    setJoyKnob({ x: dx, y: dy });
    if (engineRef.current) {
      engineRef.current.mobileInput.moveX = dx / joyRadius;
      engineRef.current.mobileInput.moveY = -dy / joyRadius; // up is forward (+1)
    }
  };

  // Right-side touch-look pad
  const handleLookStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    if (!touch || lookTouchId.current !== null) return;
    lookTouchId.current = touch.identifier;
    lastLookPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookTouchId.current) {
        const dx = t.clientX - lastLookPos.current.x;
        const dy = t.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: t.clientX, y: t.clientY };
        engineRef.current?.rotateLook(dx * 1.45, dy * 1.45);
        break;
      }
    }
  };

  const handleLookEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null;
        break;
      }
    }
  };

  // Fire button handlers (also works via mouse/pointer for desktop testing!)
  const startFireTouch = (e: React.TouchEvent) => {
    e.stopPropagation();
    const t = e.changedTouches[0];
    if (!t) return;
    fireTouchId.current = t.identifier;
    lastFirePos.current = { x: t.clientX, y: t.clientY };
    if (engineRef.current) engineRef.current.mobileInput.isFiring = true;
  };

  const moveFireTouch = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === fireTouchId.current) {
        const dx = t.clientX - lastFirePos.current.x;
        const dy = t.clientY - lastFirePos.current.y;
        lastFirePos.current = { x: t.clientX, y: t.clientY };
        engineRef.current?.rotateLook(dx * 1.3, dy * 1.3);
        break;
      }
    }
  };

  const endFireTouch = (e: React.TouchEvent) => {
    e.stopPropagation();
    fireTouchId.current = null;
    if (engineRef.current) engineRef.current.mobileInput.isFiring = false;
  };

  const gravityReady = hud.gravityCooldown <= 0.05;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none">
      {/* Right-half touch-look surface */}
      <div
        className="absolute top-0 right-0 bottom-0 left-1/2 pointer-events-auto"
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
        onTouchCancel={handleLookEnd}
      />

      {/* Top-Right Pause Button */}
      <button
        type="button"
        aria-label="Pause Game"
        onClick={onPause}
        className="pointer-events-auto absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-slate-950/75 text-slate-100 active:scale-95 transition-transform"
      >
        <Pause className="h-5 w-5" />
      </button>

      {/* Left Virtual Movement Joystick */}
      <div
        className="pointer-events-auto absolute bottom-6 left-6 flex h-32 w-32 items-center justify-center rounded-full border-2 border-cyan-400/35 bg-slate-950/45"
        onTouchStart={handleJoyStart}
        onTouchMove={handleJoyMove}
        onTouchEnd={handleJoyEnd}
        onTouchCancel={handleJoyEnd}
      >
        <div className="h-20 w-20 rounded-full border border-white/10" />
        <div
          className={`absolute h-12 w-12 rounded-full border-2 transition-colors ${
            joyActive
              ? 'border-cyan-300 bg-cyan-400/45 shadow-[0_0_18px_rgba(56,189,248,0.65)]'
              : 'border-white/30 bg-slate-200/20'
          }`}
          style={{
            transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
          }}
        />
        <span className="absolute -bottom-5 text-[10px] font-display tracking-wider text-slate-400">
          MOVE
        </span>
      </div>

      {/* Left Secondary Fire Trigger (comfortable thumb claw option) */}
      <button
        type="button"
        aria-label="Switch Weapon"
        onClick={() => engineRef.current?.switchWeapon()}
        className="pointer-events-auto absolute bottom-40 left-7 flex h-12 px-3 items-center gap-1.5 rounded-xl border border-amber-400/35 bg-slate-950/70 text-amber-300 active:scale-95 transition-transform"
      >
        <Repeat className="h-4 w-4" />
        <span className="font-display text-xs font-semibold whitespace-nowrap">WEAPON</span>
      </button>

      {/* Right-side Action Cluster */}
      <div className="pointer-events-auto absolute bottom-5 right-5 flex items-end gap-3">
        {/* Utility Column: Crouch, Reload, Gravity Pulse */}
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            aria-label="Gravity Pulse Ability"
            onClick={() => engineRef.current?.triggerGravityPulse()}
            disabled={!gravityReady}
            className={`flex h-12 w-12 flex-col items-center justify-center rounded-xl border transition-transform active:scale-95 ${
              gravityReady
                ? 'border-cyan-400/60 bg-cyan-500/25 text-cyan-200 shadow-[0_0_14px_rgba(6,182,212,0.45)]'
                : 'border-white/10 bg-slate-950/65 text-slate-500'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span className="font-mono-tech text-[10px]">
              {gravityReady ? 'GRAV' : `${Math.ceil(hud.gravityCooldown)}s`}
            </span>
          </button>

          <button
            type="button"
            aria-label="Reload Weapon"
            onClick={() => engineRef.current?.triggerReload()}
            className="flex h-12 w-12 flex-col items-center justify-center rounded-xl border border-white/15 bg-slate-950/75 text-slate-200 active:scale-95 transition-transform"
          >
            <RefreshCw className={`h-4 w-4 ${hud.isReloading ? 'animate-spin text-amber-400' : ''}`} />
            <span className="text-[9px] font-display">RELOAD</span>
          </button>

          <button
            type="button"
            aria-label="Crouch"
            onClick={() => engineRef.current?.toggleCrouch()}
            className={`flex h-12 w-12 flex-col items-center justify-center rounded-xl border active:scale-95 transition-transform ${
              hud.isCrouching
                ? 'border-amber-400/70 bg-amber-500/25 text-amber-200'
                : 'border-white/15 bg-slate-950/75 text-slate-200'
            }`}
          >
            <ChevronDown className="h-4 w-4" />
            <span className="text-[9px] font-display">CROUCH</span>
          </button>
        </div>

        {/* Jump + Aim Column */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            aria-label="Aim Down Sights"
            onClick={() => engineRef.current?.toggleAim()}
            className={`flex h-13 w-13 flex-col items-center justify-center rounded-full border active:scale-95 transition-transform ${
              hud.isAiming
                ? 'border-cyan-300 bg-cyan-500/35 text-cyan-100 shadow-[0_0_16px_rgba(56,189,248,0.5)]'
                : 'border-white/20 bg-slate-950/75 text-slate-200'
            }`}
          >
            <Crosshair className="h-5 w-5" />
            <span className="text-[9px] font-display">AIM</span>
          </button>

          <button
            type="button"
            aria-label="Jump"
            onTouchStart={(e) => {
              e.stopPropagation();
              engineRef.current?.triggerJump();
            }}
            onClick={() => engineRef.current?.triggerJump()}
            className="flex h-14 w-14 flex-col items-center justify-center rounded-full border border-white/20 bg-slate-950/75 text-slate-100 active:scale-95 transition-transform"
          >
            <ArrowUp className="h-5 w-5" />
            <span className="text-[9px] font-display">JUMP</span>
          </button>
        </div>

        {/* Dedicated Primary FIRE Button */}
        <button
          type="button"
          aria-label="Fire Weapon"
          onTouchStart={startFireTouch}
          onTouchMove={moveFireTouch}
          onTouchEnd={endFireTouch}
          onTouchCancel={endFireTouch}
          onMouseDown={() => {
            if (engineRef.current) engineRef.current.mobileInput.isFiring = true;
          }}
          onMouseUp={() => {
            if (engineRef.current) engineRef.current.mobileInput.isFiring = false;
          }}
          onMouseLeave={() => {
            if (engineRef.current) engineRef.current.mobileInput.isFiring = false;
          }}
          className="flex h-22 w-22 flex-col items-center justify-center rounded-full border-2 border-red-400/75 bg-red-600/35 text-red-100 shadow-[0_0_24px_rgba(239,68,68,0.45)] active:scale-95 active:bg-red-500/55 transition-transform"
        >
          <ShieldAlert className="h-7 w-7" />
          <span className="font-display text-xs font-bold tracking-wider">FIRE</span>
        </button>
      </div>
    </div>
  );
};
