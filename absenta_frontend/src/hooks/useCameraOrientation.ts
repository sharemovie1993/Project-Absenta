import { useState, useEffect, useCallback } from 'react';

export type DeviceRotationAngle = 0 | 90 | 180 | 270;

export interface CameraOrientationState {
  angle: DeviceRotationAngle;
  isLandscape: boolean;
  uiRotationStyle: React.CSSProperties;
}

/**
 * Intelligent Gyroscope & Screen Orientation Hook for Absenta Native Camera
 * Automatically detects whether the teacher is holding the phone in Portrait or Landscape,
 * even when the phone's system "Auto-Rotate Lock" is enabled.
 */
export function useCameraOrientation(): CameraOrientationState {
  const [angle, setAngle] = useState<DeviceRotationAngle>(0);

  const updateOrientation = useCallback(() => {
    // 1. First priority: Screen Orientation API
    const screenAngle = window.screen?.orientation?.angle;
    if (typeof screenAngle === 'number') {
      const normalized = (screenAngle % 360 + 360) % 360;
      if (normalized === 0 || normalized === 90 || normalized === 180 || normalized === 270) {
        setAngle(normalized as DeviceRotationAngle);
        return;
      }
    }

    // 2. Legacy window.orientation fallback
    if (typeof (window as any).orientation === 'number') {
      const winAngle = ((window as any).orientation % 360 + 360) % 360;
      if (winAngle === 0 || winAngle === 90 || winAngle === 180 || winAngle === 270) {
        setAngle(winAngle as DeviceRotationAngle);
        return;
      }
    }
  }, []);

  useEffect(() => {
    updateOrientation();

    // 3. Gyroscope / Accelerometer Sensor (detects physical phone tilt even if auto-rotate is locked)
    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      // If screen orientation already indicates landscape, rely on it
      const screenAngle = window.screen?.orientation?.angle ?? (window as any).orientation;
      if (typeof screenAngle === 'number' && screenAngle !== 0) {
        updateOrientation();
        return;
      }

      const { gamma, beta } = e;
      if (gamma === null || beta === null) return;

      // Thresholds:
      // Phone held upright (Portrait): beta > 30 and -35 < gamma < 35
      // Phone tilted to Landscape Right: gamma > 40
      // Phone tilted to Landscape Left: gamma < -40
      // Phone held upside down: beta < -30
      if (gamma > 45) {
        setAngle(90);
      } else if (gamma < -45) {
        setAngle(270);
      } else if (beta > 35) {
        setAngle(0);
      } else if (beta < -35) {
        setAngle(180);
      }
    };

    window.addEventListener('orientationchange', updateOrientation);
    window.addEventListener('resize', updateOrientation);

    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', updateOrientation);
    }

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
    }

    return () => {
      window.removeEventListener('orientationchange', updateOrientation);
      window.removeEventListener('resize', updateOrientation);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', updateOrientation);
      }
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        window.removeEventListener('deviceorientation', handleDeviceOrientation);
      }
    };
  }, [updateOrientation]);

  const isLandscape = angle === 90 || angle === 270;

  // Visual UI rotation style for camera icons & badges:
  // If browser screen itself hasn't rotated (auto-rotate locked), rotate the icons with CSS.
  // If browser screen has already rotated (auto-rotate active), viewport is already landscape, so no extra CSS rotation is needed.
  const screenAngle = typeof window !== 'undefined'
    ? (window.screen?.orientation?.angle ?? (window as any).orientation ?? 0)
    : 0;

  const uiAngle = screenAngle !== 0 ? 0 : (angle === 90 ? 90 : angle === 270 ? -90 : angle === 180 ? 180 : 0);

  const uiRotationStyle: React.CSSProperties = {
    transform: `rotate(${uiAngle}deg)`,
    transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return {
    angle,
    isLandscape,
    uiRotationStyle,
  };
}
