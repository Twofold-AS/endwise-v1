'use client';

import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils.ts';

/**
 * Mikaels ShaderGradient-look (shadergradient.co/customize, 01.09.2026).
 * Farger #73bfc4 / #ff810a / #8da0ce, type sphere, grain on.
 * WebGL — mounts after first paint so SSR/prerender ikke laster three.
 */
export const SHADERGRADIENT_FARGER = {
  color1: '#73bfc4',
  color2: '#ff810a',
  color3: '#8da0ce',
} as const;

export type ShaderGradientBakgrunnProps = {
  className?: string;
};

export function ShaderGradientBakgrunn({ className }: ShaderGradientBakgrunnProps) {
  const [klar, setKlar] = useState(false);
  useEffect(() => {
    setKlar(true);
  }, []);

  if (!klar) {
    return <div className={cn('h-full w-full', className)} aria-hidden />;
  }

  return (
    <ShaderGradientCanvas
      className={cn('h-full w-full', className)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      pixelDensity={1}
      fov={45}
      pointerEvents="none"
    >
      <ShaderGradient
        control="props"
        animate="on"
        type="sphere"
        wireframe={false}
        shader="defaults"
        uTime={0}
        uSpeed={0.3}
        uStrength={0.3}
        uDensity={0.8}
        uFrequency={5.5}
        uAmplitude={3.2}
        positionX={-0.1}
        positionY={0}
        positionZ={0}
        rotationX={0}
        rotationY={130}
        rotationZ={70}
        color1={SHADERGRADIENT_FARGER.color1}
        color2={SHADERGRADIENT_FARGER.color2}
        color3={SHADERGRADIENT_FARGER.color3}
        reflection={0.4}
        cAzimuthAngle={270}
        cPolarAngle={180}
        cDistance={0.5}
        cameraZoom={15.1}
        lightType="env"
        brightness={0.8}
        envPreset="city"
        grain="on"
      />
    </ShaderGradientCanvas>
  );
}
