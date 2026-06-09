
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useCollection, useUser } from '@/firebase';
import { orderBy, limit } from 'firebase/firestore';
import { Zap, Timer } from 'lucide-react';

export function ActivityPulse() {
    const { user, loading: userLoading } = useUser();
    
    const pulsePath = useMemo(() => {
        if (userLoading || !user) return null;
        return 'investments';
    }, [user, userLoading]);

    const { data: recentInvestments, loading } = useCollection<any>(
        pulsePath, 
        { subcollections: true },
        orderBy('startDate', 'desc'),
        limit(5)
    );

    const [displayIndex, setDisplayIndex] = useState(0);

    const activities = useMemo(() => {
        if (recentInvestments && recentInvestments.length > 0) {
            return recentInvestments.map(inv => ({
                id: inv.id,
                text: `${inv.userId?.slice(0,4) || 'User'}... secured the ${inv.planName || 'Investment'} (₹${inv.investedAmount || 0})`
            }));
        }
        return [
            { id: 'f1', text: 'New investor joined the Silver Tier!' },
            { id: 'f2', text: 'P2P Loan worth ₹2,000 successfully funded.' },
            { id: 'f3', text: 'Daily profit payouts processed for all users.' },
            { id: 'f4', text: 'Grow Money trust score system is now active.' }
        ];
    }, [recentInvestments]);

    useEffect(() => {
        if (activities.length <= 1) return;
        const interval = setInterval(() => {
            setDisplayIndex(prev => (prev + 1) % activities.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [activities.length]);

    if (userLoading) return <div className="h-10 w-full bg-white/5 animate-pulse" />;

    return (
        <div className="w-full bg-primary/10 border-y border-white/[0.05] backdrop-blur-xl py-2.5 overflow-hidden flex items-center h-10 sticky top-16 z-20">
            <div className="flex items-center gap-2 px-4 shrink-0 border-r border-white/10">
                <Zap size={14} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[2px] text-white/50">Pulse</span>
            </div>
            <div className="flex-1 px-4 relative flex items-center">
                {loading ? (
                     <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                        <Timer size={10} className="animate-spin" /> Syncing network...
                     </div>
                ) : (
                    <p 
                        key={displayIndex}
                        className="text-[11px] font-bold text-white/80 animate-in slide-in-from-bottom-2 fade-in-0 duration-700 truncate tracking-tight"
                    >
                        {activities[displayIndex].text}
                    </p>
                )}
            </div>
            <div className="px-4 hidden sm:flex items-center gap-1.5 shrink-0 border-l border-white/10">
                 <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-green-500/80">Active Node</span>
            </div>
        </div>
    );
}
