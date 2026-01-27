
'use client';

import { ThumbsUp, X, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type LoginStatusAnimationProps = {
  status: 'idle' | 'loading' | 'success' | 'error';
};

const BlinkingCatIcon = ({
  className,
  iconSize,
}: {
  className?: string;
  iconSize: number;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={iconSize}
    height={iconSize}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn('cat-icon', className)}
  >
    <path d="M12 5c.67 0 1.35.09 2 .26 1.78.43 3.22 1.88 3.65 3.65.17.65.26 1.33.26 2.09 0 3.87-3.13 7-7 7s-7-3.13-7-7c0-.76.09-1.44.26-2.09.43-1.77 1.87-3.22 3.65-3.65A6.97 6.97 0 0 1 12 5z" />
    <path d="M8 14v.5" />
    <path d="M16 14v.5" />
    <path d="M11.25 16.25h1.5L12 17l-.75-.75z" />
    <path d="M4 9h.01" />
    <path d="M20 9h.01" />
    <g className="animate-blink-eyes">
      <path d="M9.5 11.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5-.5.22-.5.5.22.5.5.5z" />
      <path d="M14.5 11.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5-.5.22-.5.5.22.5.5.5z" />
    </g>
  </svg>
);

export function LoginStatusAnimation({ status }: LoginStatusAnimationProps) {
  const iconSize = 80;

  return (
    <div className="flex h-[100px] w-full items-center justify-center overflow-hidden">
      {status === 'loading' && (
        <div className="animate-in fade-in">
          <LoaderCircle size={iconSize} className="animate-spin text-primary" />
        </div>
      )}
      {status === 'success' && (
        <div className="relative animate-in fade-in zoom-in-95">
          <BlinkingCatIcon className="text-[#f472b6]" iconSize={iconSize} />
          <ThumbsUp
            size={iconSize / 1.8}
            className="absolute -bottom-2 -right-4 fill-green-500 text-green-500 animate-in fade-in zoom-in-50 slide-in-from-bottom-5 slide-in-from-left-2 [animation-delay:200ms]"
          />
        </div>
      )}
      {status === 'error' && (
        <div className="relative animate-shake">
          <BlinkingCatIcon className="text-destructive" iconSize={iconSize} />
          <X
            size={iconSize / 1.8}
            className="absolute -top-2 -right-2 text-destructive animate-in fade-in zoom-in-50 [animation-delay:200ms]"
          />
        </div>
      )}
      {status === 'idle' && (
        <div className="animate-in fade-in">
           <div className="relative w-max">
            <div className="absolute -inset-0.5 rounded-full bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)] animate-border-spin"></div>
            <div className="relative rounded-full bg-card p-1">
              <BlinkingCatIcon
                className="text-pink-300"
                iconSize={iconSize}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
