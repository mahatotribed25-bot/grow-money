
'use client';

import { cn } from '@/lib/utils';
import { LoaderCircle, Cat } from 'lucide-react';


export function LoginStatusAnimation({ status }: { status: 'idle' | 'loading' | 'success' | 'error' }) {
  const iconSize = 80;

  if (status === 'loading') {
    return (
        <div className="flex h-[100px] w-full items-center justify-center overflow-hidden">
            <LoaderCircle size={iconSize} className="animate-spin text-primary" />
        </div>
    );
  }

  // For idle, success, error states, show a static cat icon.
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
