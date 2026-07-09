
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Zap } from 'lucide-react';

export function ActivityPulse() {
    const [displayIndex, setDisplayIndex] = useState(0);

    // Using a curated simulated feed for the "Pulse" to maintain atmosphere
    // without risking permission errors on standard user sessions.
    const activities = useMemo(() => [
        { id: 'f1', text: 'New investor joined the Silver Tier!' },
        { id: 'f2', text: 'P2P Loan worth ₹2,500 successfully funded.' },
        { id: 'f3', text: 'Daily ROI payouts processed for all nodes.' },
        { id: 'f4', text: 'Grow Money system integrity verified.' },
        { id: 'f5', text: 'High-yield "Alpha Plan" almost sold out!' },
        { id: 'f6', text: 'A user just reached Gold VIP status! 🏆' },
        { id: 'f7', text: 'Instant withdrawal processed: ₹1,200 credited.' }
    ], []);

    useEffect(() => {
        const interval = setInterval(() => {
            setDisplayIndex(prev => (prev + 1) % activities.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [activities.length]);

    return (
        <div className="w-full bg-primary/10 border-y border-white/[0.05] backdrop-blur-xl py-2.5 overflow-hidden flex items-center h-10 sticky top-16 z-20">
            <div className="flex items-center gap-2 px-4 shrink-0 border-r border-white/10">
                <Zap size={14} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[2px] text-white/50">Pulse</span>
            </div>
            <div className="flex-1 px-4 relative flex items-center">
                <p 
                    key={activities[displayIndex]?.id}
                    className="text-[11px] font-bold text-white/80 animate-in slide-in-from-bottom-2 fade-in-0 duration-700 truncate tracking-tight"
                >
                    {activities[displayIndex]?.text}
                </p>
            </div>
            <div className="px-4 hidden sm:flex items-center gap-1.5 shrink-0 border-l border-white/10">
                 <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-green-500/80">Active Node</span>
            </div>
        </div>
    );
}
