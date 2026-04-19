
'use client';

import { cn } from '@/lib/utils';
import { LoaderCircle, CheckCircle, XCircle } from 'lucide-react';


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
             <svg 
                width={iconSize} 
                height={iconSize}
                viewBox="0 0 100 100"
                className="text-primary"
              >
                <path d="M20 40 L30 50 L40 40" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M45 25 L55 35 L65 25" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M70 45 L80 55 L90 45" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
        </div>
    </div>
  );
}
