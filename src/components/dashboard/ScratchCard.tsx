
'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Trophy, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ScratchCardProps = {
  amount: number;
  onComplete: () => void;
  isCompleted?: boolean;
};

export function ScratchCard({ amount, onComplete, isCompleted = false }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScratched, setIsScratched] = useState(isCompleted);
  const [scratchProgress, setScratchProgress] = useState(0);

  useEffect(() => {
    if (isCompleted || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match container
    const resizeCanvas = () => {
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;
        
        // Draw the scratchable surface
        ctx.fillStyle = '#1e293b'; // Slate 800
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add metallic texture/shine
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#334155');
        gradient.addColorStop(0.5, '#475569');
        gradient.addColorStop(1, '#334155');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add pattern/text to surface
        ctx.font = 'bold 16px Inter';
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.textAlign = 'center';
        for(let i=0; i<10; i++) {
            ctx.fillText('GROW MONEY REWARD', canvas.width/2, (i*40));
        }
    };

    resizeCanvas();

    let isDrawing = false;

    const scratch = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;

      const rect = canvas.getBoundingClientRect();
      let x, y;

      if (e instanceof MouseEvent) {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      } else {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
      }

      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();

      // Check progress
      calculateProgress();
    };

    const calculateProgress = () => {
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparentCount = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) transparentCount++;
      }
      const progress = (transparentCount / (pixels.length / 4)) * 100;
      setScratchProgress(progress);

      if (progress > 60 && !isScratched) {
        setIsScratched(true);
        onComplete();
      }
    };

    const startDrawing = () => { isDrawing = true; };
    const stopDrawing = () => { isDrawing = false; };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    window.addEventListener('mouseup', stopDrawing);
    window.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('mousemove', scratch);
    canvas.addEventListener('touchmove', scratch);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      window.removeEventListener('mouseup', stopDrawing);
      window.removeEventListener('touchend', stopDrawing);
      canvas.removeEventListener('mousemove', scratch);
      canvas.removeEventListener('touchmove', scratch);
    };
  }, [onComplete, isScratched, isCompleted]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full aspect-[16/9] max-w-sm mx-auto rounded-3xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-500",
        isScratched ? "scale-[1.02] border-primary/30" : "hover:border-white/20"
      )}
    >
      {/* Revealed Content (The Reward) */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-black to-secondary/20 flex flex-col items-center justify-center text-center p-6 select-none">
        <div className="mb-2 p-3 rounded-2xl bg-primary/20 text-primary animate-bounce">
            <Trophy size={32} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[4px] text-white/30 mb-1">CONGRATULATIONS</p>
        <h3 className="text-4xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            ₹{amount.toFixed(2)}
        </h3>
        <p className="text-[9px] font-bold uppercase tracking-widest text-green-400 mt-2 flex items-center gap-1">
            <Wallet size={10} /> Credited to Wallet
        </p>
        
        {isScratched && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full animate-pulse opacity-20 bg-gradient-to-r from-primary via-white to-secondary" />
            </div>
        )}
      </div>

      {/* Scratchable Layer */}
      {!isCompleted && (
        <canvas 
          ref={canvasRef}
          className={cn(
            "absolute inset-0 w-full h-full cursor-crosshair transition-opacity duration-700",
            isScratched && "opacity-0 pointer-events-none"
          )}
        />
      )}

      {/* Instructional Overlay */}
      {!isScratched && !isCompleted && (
          <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none">
              <span className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-[2px] text-white/60 animate-pulse">
                Rub to Reveal Gift
              </span>
          </div>
      )}
    </div>
  );
}
