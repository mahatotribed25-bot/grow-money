
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
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M12 5C8.13 5 5 8.13 5 12s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7z"></path>
                <path d="M12 2v3"></path>
                <path d="M12 22v-3"></path>
                <path d="M22 12h-3"></path>
                <path d="M5 12H2"></path>
                <path d="m18.36 5.64-.71.71"></path>
                <path d="m6.35 17.65-.71.71"></path>
                <path d="m18.36 18.36-.71-.71"></path>
                <path d="m6.35 6.35-.71-.71"></path>
              </svg>
        </div>
    </div>
  );
}
