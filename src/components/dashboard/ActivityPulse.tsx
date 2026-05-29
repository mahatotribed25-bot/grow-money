'use client';

import { useEffect, useState } from 'react';
import { useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Zap } from 'lucide-react';

type Activity = {
    id: string;
    userName?: string;
    type: 'investment' | 'deposit' | 'repayment';
    amount: number;
    planName?: string;
}

export function ActivityPulse() {
    const firestore = useFirestore();
    // In a real app, we'd have a dedicated activities collection. 
    // Here we derive from recent investments for social proof.
    const { data: recentInvestments } = useCollection<any>(
        'investments', 
        { subcollections: true },
        orderBy('startDate', 'desc'),
        limit(5)
    );

    const [displayIndex, setDisplayIndex] = useState(0);

    const activities = recentInvestments?.map(inv => ({
        id: inv.id,
        text: `${inv.userId.slice(0,4)}... secured the ${inv.planName} (₹${inv.investedAmount})`
    })) || [
        { id: '1', text: 'New investor joined the Silver Tier!' },
        { id: '2', text: 'P2P Loan worth ₹2000 successfully funded.' },
        { id: '3', text: 'Weekly profit payouts processed for 450 users.' }
    ];

    useEffect(() => {
        if (activities.length <= 1) return;
        const interval = setInterval(() => {
            setDisplayIndex(prev => (prev + 1) % activities.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [activities.length]);

    return (
        <div className="w-full bg-primary/10 border-y border-white/5 py-2 overflow-hidden flex items-center h-8">
            <div className="flex items-center gap-2 px-4 shrink-0 border-r border-white/10">
                <Zap size={12} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Pulse</span>
            </div>
            <div className="flex-1 px-4 relative">
                <p 
                    key={displayIndex}
                    className="text-[10px] font-bold text-white/60 animate-in slide-in-from-bottom-2 fade-in-0 duration-500 truncate"
                >
                    {activities[displayIndex].text}
                </p>
            </div>
        </div>
    );
}
