'use client';

import React from 'react';
import { GameSettings } from '../lib/types';
import { X, RotateCcw, Sparkles } from 'lucide-react';

interface ControlsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onResetSettings: () => void;
}

export const PRESETS: Record<string, Partial<GameSettings>> = {
  'Default': {
    gravity: 9.81,
    thrust: 2.4,
    boost: 2.2,
    gas: 600,
    burn: 180,
    spin: 5.0,
    steady: 1.6,
    landAngle: 28,
    landSpeed: 7,
    wall: 9,
    bodyColor: '#c00f1c'
  },
  'Moon Gravity': {
    gravity: 1.62,
    thrust: 1.6,
    boost: 1.2,
    burn: 80,
    spin: 2.5,
    landSpeed: 3.5,
    bodyColor: '#e2e8f0'
  },
  'Arcade Hyper-Boost': {
    thrust: 3.6,
    boost: 3.2,
    gas: 1000,
    burn: 140,
    spin: 7.5,
    steady: 2.8,
    landAngle: 36,
    landSpeed: 10,
    bodyColor: '#38bdf8'
  },
  'Hardcore Realism': {
    landAngle: 15,
    landSpeed: 5,
    steady: 0.4,
    gas: 420,
    burn: 220,
    bodyColor: '#18181b'
  },
  'Mega Ramp': {
    wall: 20,
    r2: 7,
    gas: 900,
    thrust: 2.8,
    bodyColor: '#f59e0b'
  }
};

export const COLOR_OPTIONS = [
  { name: 'Ultra Red', hex: '#c00f1c' },
  { name: 'Pearl White', hex: '#f8fafc' },
  { name: 'Stealth Grey', hex: '#334155' },
  { name: 'Deep Metallic Blue', hex: '#1d4ed8' },
  { name: 'Matte Black', hex: '#18181b' }
];

export const ControlsDrawer: React.FC<ControlsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings
}) => {
  if (!isOpen) return null;

  return (
    <div className="rdst-drawer-overlay" onClick={onClose}>
      <aside className="rdst-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="rdst-drawer-header">
          <div>
            <h2 className="rdst-drawer-title">Flight & Roadster Tuning</h2>
            <p className="rdst-drawer-subtitle">Adjust SpaceX thrusters, physics & styling</p>
          </div>
          <button type="button" className="rdst-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="rdst-drawer-body">
          {/* Preset Buttons */}
          <div className="rdst-section">
            <label className="rdst-section-title">
              <Sparkles size={13} className="mr-1 inline text-amber-400" /> Presets
            </label>
            <div className="rdst-preset-grid">
              {Object.keys(PRESETS).map((pName) => (
                <button
                  key={pName}
                  type="button"
                  className="rdst-preset-btn"
                  onClick={() => onUpdateSettings(PRESETS[pName])}
                >
                  {pName}
                </button>
              ))}
            </div>
          </div>

          {/* Exterior Paint Selection */}
          <div className="rdst-section">
            <label className="rdst-section-title">Tesla Roadster Paint</label>
            <div className="rdst-color-row">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className={`rdst-color-swatch ${settings.bodyColor.toLowerCase() === c.hex.toLowerCase() ? 'is-selected' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => onUpdateSettings({ bodyColor: c.hex })}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* SpaceX Thrusters Section */}
          <div className="rdst-section">
            <label className="rdst-section-title">SpaceX Thruster Package</label>
            
            <div className="rdst-slider-row">
              <div className="rdst-slider-header">
                <span>Lift Nozzle Thrust</span>
                <strong>{settings.thrust.toFixed(1)}x</strong>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.1"
                value={settings.thrust}
                onChange={(e) => onUpdateSettings({ thrust: parseFloat(e.target.value) })}
              />
            </div>

            <div className="rdst-slider-row">
              <div className="rdst-slider-header">
                <span>Tail Boost Multiplier</span>
                <strong>{settings.boost.toFixed(1)}x</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={settings.boost}
                onChange={(e) => onUpdateSettings({ boost: parseFloat(e.target.value) })}
              />
            </div>

            <div className="rdst-slider-row">
              <div className="rdst-slider-header">
                <span>Gas Tank Capacity</span>
                <strong>{settings.gas} L</strong>
              </div>
              <input
                type="range"
                min="200"
                max="1500"
                step="50"
                value={settings.gas}
                onChange={(e) => onUpdateSettings({ gas: parseInt(e.target.value, 10) })}
              />
            </div>

            <div className="rdst-slider-row">
              <div className="rdst-slider-header">
                <span>Attitude Spin Torque</span>
                <strong>{settings.spin.toFixed(1)}</strong>
              </div>
              <input
                type="range"
                min="1.0"
                max="12.0"
                step="0.5"
                value={settings.spin}
                onChange={(e) => onUpdateSettings({ spin: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          {/* Physics & Environment */}
          <div className="rdst-section">
            <label className="rdst-section-title">Environment Physics</label>

            <div className="rdst-slider-row">
              <div className="rdst-slider-header">
                <span>Gravity Acceleration</span>
                <strong>{settings.gravity.toFixed(2)} m/s²</strong>
              </div>
              <input
                type="range"
                min="1.0"
                max="25.0"
                step="0.2"
                value={settings.gravity}
                onChange={(e) => onUpdateSettings({ gravity: parseFloat(e.target.value) })}
              />
            </div>

            <div className="rdst-slider-row">
              <div className="rdst-slider-header">
                <span>Vertical Wall Height</span>
                <strong>{settings.wall} m</strong>
              </div>
              <input
                type="range"
                min="2"
                max="24"
                step="1"
                value={settings.wall}
                onChange={(e) => onUpdateSettings({ wall: parseInt(e.target.value, 10) })}
              />
            </div>

            <div className="rdst-slider-row">
              <div className="rdst-slider-header">
                <span>Max Safe Touchdown Speed</span>
                <strong>{settings.landSpeed} m/s</strong>
              </div>
              <input
                type="range"
                min="3"
                max="15"
                step="0.5"
                value={settings.landSpeed}
                onChange={(e) => onUpdateSettings({ landSpeed: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <footer className="rdst-drawer-footer">
          <button type="button" className="rdst-btn" onClick={onResetSettings}>
            <RotateCcw size={14} className="mr-1 inline" /> Reset
          </button>
          <button type="button" className="rdst-btn is-primary" onClick={onClose}>
            Apply & Close
          </button>
        </footer>
      </aside>
    </div>
  );
};
