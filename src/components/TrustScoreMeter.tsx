
'use client';

import { useEffect, useState } from 'react';

const TrustScoreMeter = ({ score }: { score: number }) => {
  const [displayScore, setDisplayScore] = useState(300);

  const normalizedScore = Math.max(300, Math.min(score, 900));

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      setDisplayScore(currentScore => {
        const difference = normalizedScore - currentScore;
        if (Math.abs(difference) < 0.5) {
          cancelAnimationFrame(animationFrameId);
          return normalizedScore;
        }
        const newScore = currentScore + difference * 0.1;
        animationFrameId = requestAnimationFrame(animate);
        return newScore;
      });
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [normalizedScore]);

  // Rotation from 0 (left) to 180 (right)
  const rotation = ((displayScore - 300) / 600) * 180;

  const width = 300;
  const height = 180; // Adjusted height for better spacing
  const cx = width / 2;
  const cy = height - 20; // Pivot point at the bottom
  const radius = 130;
  const strokeWidth = 25;

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
      const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
      };
    };

    const start = polarToCartesian(x, y, radius, startAngle);
    const end = polarToCartesian(x, y, radius, endAngle);

    // M(start) A(rx,ry, x-axis-rotation, large-arc-flag, sweep-flag, end)
    const d = [
        "M", start.x, start.y, 
        "A", radius, radius, 0, 0, 1, end.x, end.y
    ].join(" ");

    return d;
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xs mx-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#ef4444' }} />
            <stop offset="50%" style={{ stopColor: '#facc15' }} />
            <stop offset="100%" style={{ stopColor: '#22c55e' }} />
          </linearGradient>
        </defs>

        {/* Gauge arc (top semi-circle, from West to East) */}
        <path
          d={describeArc(cx, cy, radius, 180, 360)}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Needle group, rotated around the pivot point */}
        <g
          transform={`rotate(${rotation} ${cx} ${cy})`}
          style={{ transition: 'transform 0.5s cubic-bezier(0.64, 0, 0.78, 1)' }}
        >
          {/* The needle itself, pointing left (west) from the pivot */}
          <line
            x1={cx}
            y1={cy}
            x2={cx - radius + (strokeWidth / 2)}
            y2={cy}
            stroke="hsl(var(--foreground))"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>
        
        {/* Pivot point circle on top of the needle */}
        <circle cx={cx} cy={cy} r="6" fill="hsl(var(--foreground))" />
        <circle cx={cx} cy={cy} r="3" fill="hsl(var(--background))" />
        
        {/* Text */}
        <text
          x={cx}
          y={cy - 65}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-lg font-semibold fill-current text-muted-foreground"
        >
          YOUR SCORE
        </text>
        <text
          x={cx}
          y={cy - 30}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-6xl font-bold fill-current"
        >
          {Math.round(displayScore)}
        </text>
      </svg>
    </div>
  );
};

export default TrustScoreMeter;
