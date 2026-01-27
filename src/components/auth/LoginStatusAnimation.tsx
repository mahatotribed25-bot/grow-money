
'use client';

import { cn } from '@/lib/utils';
import { LoaderCircle } from 'lucide-react';

const CatIcon = ({
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
    <path d="M9.5 11.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5-.5.22-.5.5.22.5.5.5z" />
    <path d="M14.5 11.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5-.5.22-.5.5.22.5.5.5z" />
  </svg>
);


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
             <CatIcon
                className="text-primary"
                iconSize={iconSize}
              />
        </div>
    </div>
  );
}
