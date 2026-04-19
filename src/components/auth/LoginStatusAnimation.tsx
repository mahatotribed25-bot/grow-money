
"use client";

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
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <g className="cat-body">
                    {/* Head */}
                    <path d="M17.5,7.5a6.5,6.5,0,0,1-11,0" />
                    {/* Body */}
                    <path d="M6.5,7.5c0,0,0,1,0,2c0,2,1,3.5,5.5,3.5s5.5-1.5,5.5-3.5c0-1,0-2,0-2" />
                    {/* Whiskers */}
                     <path d="M17.5,16.5c-1.5,1-3.5,1.5-5.5,1.5s-4-0.5-5.5-1.5" />
                </g>
                <g className="cat-eyes">
                    <path d="M9.5,11.5v-1" />
                    <path d="M14.5,11.5v-1" />
                </g>
             </svg>
        </div>
    </div>
  );
}

