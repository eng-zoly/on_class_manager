import React, { memo } from 'react';

interface CloudConfig {
  id: number;
  top: number;
  scale: number;
  duration: number; // in seconds
  delay: number; // in seconds
  opacity: number;
  width: number;
}

const CLOUD_CONFIGS: CloudConfig[] = [
  { id: 1, top: 40, scale: 0.85, duration: 65, delay: 0, opacity: 0.16, width: 200 },
  { id: 2, top: 90, scale: 1.2, duration: 80, delay: -25, opacity: 0.12, width: 270 },
  { id: 3, top: 160, scale: 0.9, duration: 55, delay: -12, opacity: 0.14, width: 220 },
  { id: 4, top: 70, scale: 1.1, duration: 95, delay: -45, opacity: 0.13, width: 250 },
  { id: 5, top: 210, scale: 1.0, duration: 70, delay: -35, opacity: 0.15, width: 230 }
];

function DriftingCloudsAndButterflies() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" 
      id="clouds-layer" 
      aria-hidden="true"
      style={{ contain: 'strict', contentVisibility: 'auto' }}
    >
      <style>{`
        @keyframes driftCloud {
          0% {
            transform: translate3d(-320px, 0, 0);
          }
          100% {
            transform: translate3d(calc(100vw + 320px), 0, 0);
          }
        }
        .gpu-cloud {
          will-change: transform;
          animation-name: driftCloud;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          backface-visibility: hidden;
          perspective: 1000px;
        }
      `}</style>

      {/* Pure CSS GPU-Accelerated Drifting Clouds Layer (0% CPU / No React re-renders) */}
      {CLOUD_CONFIGS.map(c => (
        <div
          key={c.id}
          style={{
            position: 'absolute',
            left: 0,
            top: `${c.top}px`,
            opacity: c.opacity,
            width: `${c.width}px`,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
            transform: `scale(${c.scale})`,
          }}
          className="gpu-cloud text-slate-400 select-none"
        >
          {/* Vector fluffy clouds */}
          <svg viewBox="0 0 200 100" fill="#cbd5e1" xmlns="http://www.w3.org/2000/svg">
            <path d="M 50,80 C 35,80 20,70 20,55 C 20,40 35,30 50,30 C 55,30 60,32 65,35 C 70,20 85,10 100,10 C 120,10 135,25 135,45 C 145,40 160,45 165,55 C 170,65 160,80 145,80 Z" />
          </svg>
        </div>
      ))}
    </div>
  );
}

export default memo(DriftingCloudsAndButterflies);
