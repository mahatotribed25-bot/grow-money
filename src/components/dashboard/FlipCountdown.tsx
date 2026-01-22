'use client';

import { useEffect, useState } from 'react';

const NumberBox = ({ digit }: { digit: string }) => (
  <div className="relative h-16 w-12 md:h-24 md:w-20 rounded-lg bg-[#1e1e1e] text-white flex items-center justify-center text-4xl md:text-6xl font-bold shadow-inner overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-1/2 bg-black/20" />
    <span className="relative z-10">{digit}</span>
    <div
      key={digit}
      className="absolute top-0 left-0 w-full h-full bg-[#2c2c2c] animate-flip-down"
      style={{ transformOrigin: 'bottom' }}
    />
     <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/50 -translate-y-1/2 z-20" />
  </div>
);

const TimeBox = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="flex gap-1">
      <NumberBox digit={value[0]} />
      <NumberBox digit={value[1]} />
    </div>
    <span className="text-xs md:text-sm mt-2 text-muted-foreground uppercase tracking-widest">
      {label}
    </span>
  </div>
);

export const FlipCountdown = ({ endTime }: { endTime: Date }) => {
  const calculateTimeLeft = () => {
    const now = new Date().getTime();
    const distance = endTime.getTime() - now;

    if (distance < 0) {
      return { days: '00', hours: '00', minutes: '00', seconds: '00', isOver: true };
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    return {
      days: String(days).padStart(2, '0'),
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
      isOver: false
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      if (newTimeLeft.isOver) {
        clearInterval(timer);
        setTimeout(() => window.location.reload(), 3000);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  if (timeLeft.isOver) {
    return <p className="mt-4 text-2xl font-semibold text-green-400">Back Online!</p>;
  }

  return (
    <div className="flex items-start justify-center gap-2 md:gap-4 p-4">
      {parseInt(timeLeft.days) > 0 && (
        <>
          <TimeBox value={timeLeft.days} label="Days" />
          <span className="text-4xl md:text-6xl font-bold text-muted-foreground">:</span>
        </>
      )}
      <TimeBox value={timeLeft.hours} label="Hours" />
      <span className="text-4xl md:text-6xl font-bold text-muted-foreground">:</span>
      <TimeBox value={timeLeft.minutes} label="Minutes" />
      <span className="text-4xl md:text-6xl font-bold text-muted-foreground">:</span>
      <TimeBox value={timeLeft.seconds} label="Seconds" />
    </div>
  );
};
