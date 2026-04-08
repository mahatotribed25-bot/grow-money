'use client';

import { useEffect, useState } from 'react';

const getScoreColor = (score: number) => {
  if (score < 500) return '#ef4444'; // red-500
  if (score < 750) return '#facc15'; // yellow-400
  return '#22c55e'; // green-500
};

const TrustScoreMeter = ({ score }: { score: number }) => {
  const [displayScore, setDisplayScore] = useState(300);

  const normalizedScore = Math.max(300, Math.min(score, 900));
  const angle = ((normalizedScore - 300) / 600) * 180 - 90; // -90 to 90 degrees
  const color = getScoreColor(normalizedScore);

  useEffect(() => {
    // Animate the score number
    const animation = requestAnimationFrame(() => {
        setDisplayScore(normalizedScore);
    });
    return () => cancelAnimationFrame(animation);
  }, [normalizedScore]);


  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    const d = ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
    return d;
  };

  const filledPath = describeArc(100, 100, 80, 180, 180 + ((normalizedScore - 300) / 600) * 180);

  return (
    <div className="flex flex-col items-center justify-center h-[200px] w-full">
      <svg viewBox="0 0 200 120" className="w-full h-full text-foreground">
        {/* Background Arc */}
        <path
          d={describeArc(100, 100, 80, 180, 360)}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="20"
          strokeLinecap="round"
        />
        {/* Filled Arc */}
        <path
          d={filledPath}
          fill="none"
          stroke={color}
          strokeWidth="20"
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        {/* Needle ("the stick") */}
        <g transform={`rotate(${angle} 100 100)`}>
            <line x1="100" y1="100" x2="100" y2="30" stroke="hsl(var(--foreground))" strokeWidth="2" />
            <circle cx="100" cy="100" r="5" fill="hsl(var(--foreground))" />
        </g>
        
        {/* Text */}
        <text
          x="100"
          y="95"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-5xl font-bold fill-current"
        >
          {Math.round(displayScore)}
        </text>
        <text
          x="100"
          y="115"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-sm font-medium fill-current text-muted-foreground"
        >
          Trust Score
        </text>
      </svg>
    </div>
  );
};

export default TrustScoreMeter;
