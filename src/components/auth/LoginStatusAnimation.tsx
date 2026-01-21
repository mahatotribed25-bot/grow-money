'use client';

import { Cat, ThumbsUp, X, LoaderCircle } from 'lucide-react';

type LoginStatusAnimationProps = {
  status: 'idle' | 'loading' | 'success' | 'error';
};

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
          <Cat size={iconSize} className="text-primary" />
          <ThumbsUp
            size={iconSize / 1.8}
            className="absolute -bottom-2 -right-4 text-green-500 fill-green-500 animate-in fade-in zoom-in-50 slide-in-from-bottom-5 slide-in-from-left-2 [animation-delay:200ms]"
          />
        </div>
      )}
      {status === 'error' && (
        <div className="relative animate-shake">
          <Cat size={iconSize} className="text-destructive" />
           <X
            size={iconSize / 1.8}
            className="absolute -top-2 -right-2 text-destructive animate-in fade-in zoom-in-50 [animation-delay:200ms]"
          />
        </div>
      )}
      {status === 'idle' && (
        <div className="animate-in fade-in">
            <Cat size={iconSize} className="text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
