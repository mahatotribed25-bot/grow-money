'use client';

import { cn } from '@/lib/utils';
import { LoaderCircle, Cat, CheckCircle, XCircle } from 'lucide-react';


export function LoginStatusAnimation({ status }: { status: 'idle' | 'loading' | 'success' | 'error' }) {
  const iconSize = 80;

  if (status === 'loading') {
    return (
        <div className="flex h-[100px] w-full items-center justify-center overflow-hidden">
            <LoaderCircle size={iconSize} className="animate-spin text-primary" />
        </div>
    );
  }
  
  if (status === 'success') {
    return (
        <div className="flex h-[100px] w-full items-center justify-center overflow-hidden">
            <div className="animate-in fade-in zoom-in">
                <CheckCircle size={iconSize} className="text-green-500" />
            </div>
        </div>
    );
  }
  
  if (status === 'error') {
    return (
        <div className="flex h-[100px] w-full items-center justify-center overflow-hidden">
            <div className="animate-in fade-in">
                <XCircle size={iconSize} className="text-destructive animate-shake" />
            </div>
        </div>
    );
  }

  // idle state
  return (
    <div className="flex h-[100px] w-full items-center justify-center overflow-hidden">
        <div className="animate-in fade-in">
             <Cat
                className="text-primary"
                size={iconSize}
              />
        </div>
    </div>
  );
}
