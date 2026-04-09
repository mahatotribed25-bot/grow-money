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

  // Angle from 0 (left) to 180 (right)
  const angle = ((displayScore - 300) / 600) * 180;

  const width = 300;
  const height = 160;
  const cx = width / 2;
  const cy = height - 10;
  const radius = 120;
  const strokeWidth = 25;

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
      const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
      };
    };
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    const d = ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
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

        {/* Gauge arc */}
        <path
          d={describeArc(cx, cy, radius, 180, 360)}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Needle */}
        <g
          transform={`rotate(${angle} ${cx} ${cy})`}
          style={{ transition: 'transform 0.2s ease-out' }}
        >
          {/* The polygon points are defined as if it's pointing left, then the whole group is rotated */}
          <polygon
            points={`${cx - radius + strokeWidth/2 - 2},${cy} ${cx - radius - 15},${cy - 8} ${cx - radius - 15},${cy + 8}`}
            fill="hsl(var(--card-foreground))"
          />
        </g>
        
        {/* Text */}
        <text
          x={cx}
          y={cy - 60}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-lg font-semibold fill-current text-muted-foreground"
        >
          YOUR SCORE:
        </text>
        <text
          x={cx}
          y={cy - 20}
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
