'use client';

import React, { useEffect, useState } from 'react';
import { CameraViewMode, ChallengeType, StuntResult, TelemetryData } from '../lib/types';
import { Camera, RotateCcw, SlidersHorizontal, Volume2, VolumeX, X, Share2, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

interface HUDProps {
  challenge: ChallengeType;
  onSelectChallenge: (c: ChallengeType) => void;
  viewMode: CameraViewMode;
  onToggleView: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenControls: () => void;
  onRestart: () => void;
  testCount: number;
  bestScore: number;
  telemetry: TelemetryData;
  result: StuntResult | null;
  onCloseResult: () => void;
  onTouchPress: (action: 'forward' | 'back' | 'lift' | 'boost' | 'ccw' | 'cw', pressed: boolean) => void;
}

export const HUD: React.FC<HUDProps> = ({
  challenge,
  onSelectChallenge,
  viewMode,
  onToggleView,
  soundEnabled,
  onToggleSound,
  onOpenControls,
  onRestart,
  testCount,
  bestScore,
  telemetry,
  result,
  onCloseResult,
  onTouchPress
}) => {
  const [shareText, setShareText] = useState('Share');

  // Trigger celebration confetti for high-scoring landings
  useEffect(() => {
    if (result && result.landed && result.score > 5000) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
    }
  }, [result]);

  const handleShare = async () => {
    if (!result) return;
    const msg = `I scored ${result.score.toLocaleString()} points in Tesla Roadster Web! Beat it:`;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Tesla Roadster Game', text: msg, url });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(`${msg} ${url}`);
      setShareText('Link Copied!');
      setTimeout(() => setShareText('Share'), 2500);
    } catch {
      setShareText('Copied');
    }
  };

  // Determine hint message based on flight mode
  let hint = 'Hold <kbd>▲</kbd> or <kbd>W</kbd> to accelerate';
  let subHint = 'Electric suction holds the Roadster to the track';

  if (telemetry.mode === 'drive') {
    if (challenge === 'ramp') {
      if (telemetry.suction) {
        hint = 'Climbing ramp: release <kbd>▲</kbd> anywhere to launch!';
        subHint = 'The car detaches with track speed and spin';
      } else {
        hint = 'Accelerate up the curve';
      }
    } else {
      hint = 'Boost over the 5 parked vehicles!';
      subHint = 'Press <kbd>SPACE</kbd> for Lift, <kbd>SHIFT</kbd> for Boost';
    }
  } else if (telemetry.mode === 'air') {
    hint = '<kbd>SPACE</kbd> Lift · <kbd>SHIFT</kbd> Boost · <kbd>A</kbd>/<kbd>D</kbd> Flip';
    subHint = 'Touchdown level (< 28°) and soft (< 7 m/s) on wheels';
  } else if (telemetry.mode === 'landed') {
    hint = 'Touchdown! Press <kbd>R</kbd> to launch again';
    subHint = '';
  } else if (telemetry.mode === 'crashed') {
    hint = 'Crashed! Press <kbd>R</kbd> to retry';
    subHint = '';
  }

  const fuelPct = Math.max(0, Math.min(1, telemetry.gas / (telemetry.gasMax || 600)));

  return (
    <div className="rdst-hud">
      {/* Top Header Bar */}
      <header className="rdst-top">
        <div className="rdst-stats">
          <div className="rdst-test-badge">
            <span className="rdst-label-small">TEST</span>
            <strong className="rdst-test-num">{testCount}</strong>
          </div>
          <div className="rdst-best-badge">
            {bestScore > 0 ? (
              <span>
                <Award size={12} className="inline mr-1 text-amber-400" />
                Best: <strong>{bestScore.toLocaleString()}</strong>
              </span>
            ) : (
              <span>No landing yet</span>
            )}
          </div>
        </div>

        {/* Stunt Segmented Switcher */}
        <div className="rdst-stunt-switcher" role="group" aria-label="Stunt Challenge">
          <button
            type="button"
            className={`rdst-seg-btn ${challenge === 'ramp' ? 'is-active' : ''}`}
            onClick={() => onSelectChallenge('ramp')}
          >
            Ramp
          </button>
          <button
            type="button"
            className={`rdst-seg-btn ${challenge === 'jump' ? 'is-active' : ''}`}
            onClick={() => onSelectChallenge('jump')}
          >
            Jump
          </button>
        </div>

        {/* Action Buttons */}
        <div className="rdst-actions">
          <button
            type="button"
            className="rdst-btn"
            onClick={onToggleView}
            title="Cycle Camera View (V)"
          >
            <Camera size={14} />
            <span className="rdst-btn-label">{viewMode} View</span>
          </button>

          <button
            type="button"
            className="rdst-btn is-icon"
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          <button
            type="button"
            className="rdst-btn is-icon"
            onClick={onOpenControls}
            title="Tuning & Parameters"
          >
            <SlidersHorizontal size={14} />
          </button>

          <button
            type="button"
            className="rdst-btn is-icon"
            onClick={onRestart}
            title="Restart Run (R)"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </header>

      {/* Flight Hint Banner */}
      {!result && (
        <div className="rdst-hint-container">
          <div className="rdst-hint-bubble" dangerouslySetInnerHTML={{ __html: hint }} />
          {subHint && <div className="rdst-sub-hint">{subHint}</div>}
        </div>
      )}

      {/* Telemetry Dashboard Readouts */}
      <div className="rdst-telemetry">
        <div className="rdst-gauge">
          <span className="rdst-gauge-label">Height</span>
          <div className="rdst-gauge-value">
            {telemetry.height.toFixed(1)} <em>m</em>
          </div>
        </div>

        <div className="rdst-gauge">
          <span className="rdst-gauge-label">Speed</span>
          <div className="rdst-gauge-value">
            {Math.round(telemetry.speed * 3.6)} <em>km/h</em>
          </div>
        </div>

        <div className="rdst-gauge is-desktop-only">
          <span className="rdst-gauge-label">G-Force</span>
          <div className="rdst-gauge-value">
            {telemetry.gForce.toFixed(1)} <em>g</em>
          </div>
        </div>

        <div className="rdst-gauge is-desktop-only">
          <span className="rdst-gauge-label">Attitude</span>
          <div className="rdst-gauge-value">
            {Math.round(telemetry.tilt)}°
          </div>
        </div>

        {/* Compressed Cold Gas Tank Bar */}
        <div className="rdst-gas-gauge">
          <div className="rdst-tank-track">
            <div
              className={`rdst-tank-liquid ${fuelPct < 0.2 ? 'is-low' : ''}`}
              style={{ transform: `scaleY(${fuelPct})` }}
            />
          </div>
          <div className="rdst-gauge-text">
            <span className="rdst-gauge-label">SpaceX Gas</span>
            <div className="rdst-gauge-value">
              {Math.round(telemetry.gas)} <em>L</em>
            </div>
          </div>
        </div>
      </div>

      {/* Touchpad Mobile Virtual Controls (Protected from screen cutting) */}
      <div className="rdst-touch-pad">
        {/* Left Thumb: Pitch / Flips */}
        <div className="rdst-touch-cluster left">
          <button
            type="button"
            className="rdst-touch-btn glyph"
            aria-label="Flip CCW"
            onPointerDown={(e) => { e.preventDefault(); onTouchPress('ccw', true); }}
            onPointerUp={() => onTouchPress('ccw', false)}
            onPointerCancel={() => onTouchPress('ccw', false)}
          >
            ↺
          </button>
          <button
            type="button"
            className="rdst-touch-btn glyph"
            aria-label="Flip CW"
            onPointerDown={(e) => { e.preventDefault(); onTouchPress('cw', true); }}
            onPointerUp={() => onTouchPress('cw', false)}
            onPointerCancel={() => onTouchPress('cw', false)}
          >
            ↻
          </button>
        </div>

        {/* Right Thumb: Drive & Thrusters */}
        <div className="rdst-touch-cluster right">
          <button
            type="button"
            className="rdst-touch-btn glyph"
            aria-label="Reverse"
            onPointerDown={(e) => { e.preventDefault(); onTouchPress('back', true); }}
            onPointerUp={() => onTouchPress('back', false)}
            onPointerCancel={() => onTouchPress('back', false)}
          >
            ▼
          </button>
          <button
            type="button"
            className="rdst-touch-btn glyph primary"
            aria-label="Drive Forward"
            onPointerDown={(e) => { e.preventDefault(); onTouchPress('forward', true); }}
            onPointerUp={() => onTouchPress('forward', false)}
            onPointerCancel={() => onTouchPress('forward', false)}
          >
            ▲
          </button>
          <button
            type="button"
            className="rdst-touch-btn thruster"
            aria-label="SpaceX Lift Thrusters"
            onPointerDown={(e) => { e.preventDefault(); onTouchPress('lift', true); }}
            onPointerUp={() => onTouchPress('lift', false)}
            onPointerCancel={() => onTouchPress('lift', false)}
          >
            LIFT
          </button>
          <button
            type="button"
            className="rdst-touch-btn thruster boost"
            aria-label="SpaceX Tail Boost"
            onPointerDown={(e) => { e.preventDefault(); onTouchPress('boost', true); }}
            onPointerUp={() => onTouchPress('boost', false)}
            onPointerCancel={() => onTouchPress('boost', false)}
          >
            BOOST
          </button>
        </div>
      </div>

      {/* Touchdown Scorecard Modal */}
      {result && (
        <div className="rdst-modal-backdrop" onClick={onCloseResult}>
          <div className="rdst-score-card" onClick={(e) => e.stopPropagation()}>
            <div className="rdst-card-header">
              <div>
                <h3 className={`rdst-card-title ${result.landed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result.title}
                </h3>
                <div className="rdst-card-score">
                  {result.landed ? result.score.toLocaleString() : result.reason}
                </div>
              </div>
              <button type="button" className="rdst-close-btn" onClick={onCloseResult}>
                <X size={18} />
              </button>
            </div>

            {result.lines.length > 0 && (
              <div className="rdst-score-table">
                {result.lines.map((line, i) => (
                  <div key={i} className="rdst-score-row">
                    <span className="text-zinc-400">{line.label}</span>
                    <span className="font-medium text-white">{line.value}</span>
                    <span className="text-right text-emerald-400">
                      {line.points ? `+${line.points.toLocaleString()}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="rdst-card-actions">
              {result.landed && (
                <button type="button" className="rdst-btn flex-1" onClick={handleShare}>
                  <Share2 size={14} className="mr-1 inline" />
                  {shareText}
                </button>
              )}
              <button
                type="button"
                className="rdst-btn is-primary flex-1"
                onClick={() => {
                  onCloseResult();
                  onRestart();
                }}
              >
                Try Again (R)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
