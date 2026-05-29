
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useCollection, useUser } from '@/firebase';
import { orderBy, limit } from 'firebase/firestore';
import { Zap, Timer } from 'lucide-react';

export function ActivityPulse() {
    const { user, loading: userLoading } = useUser();
    
    // Only target the collection group if the user is authenticated to prevent permission errors
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

    // Dynamic activities from real data, with static fallbacks
    const activities = useMemo(() => {
        if (recentInvestments && recentInvestments.length > 0) {
            return recentInvestments.map(inv => ({
                id: inv.id,
                text: `${inv.userId?.slice(0,4) || 'User'}... secured the ${inv.planName || 'Investment'} (₹${inv.investedAmount || 0})`
            }));
        }
        return [
            { id: 'f1', text: 'New investor joined the Silver Tier!' },
            { id: 'f2', text: 'P2P Loan worth ₹2000 successfully funded.' },
            { id: 'f3', text: 'Weekly profit payouts processed for 450 users.' },
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

    return (
        <div className="w-full bg-primary/10 border-y border-white/5 py-2 overflow-hidden flex items-center h-8">
            <div className="flex items-center gap-2 px-4 shrink-0 border-r border-white/10">
                <Zap size={12} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Pulse</span>
            </div>
            <div className="flex-1 px-4 relative flex items-center">
                {loading ? (
                     <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                        <Timer size={10} className="animate-spin" /> Syncing network...
                     </div>
                ) : (
                    <p 
                        key={displayIndex}
                        className="text-[10px] font-bold text-white/60 animate-in slide-in-from-bottom-2 fade-in-0 duration-500 truncate"
                    >
                        {activities[displayIndex].text}
                    </p>
                )}
            </div>
        </div>
    );
}
