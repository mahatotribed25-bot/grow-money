'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Trophy, ShieldCheck, TrendingUp, Users, Crown, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type BadgeData = {
    id: string;
    label: string;
    description: string;
    icon: any;
    color: string;
    earned: boolean;
}

export function AchievementBadges({ stats }: { stats: { trustScore: number, planCount: number, referralCount: number } }) {
    const badges = useMemo((): BadgeData[] => [
        {
            id: 'trust_king',
            label: 'Trust King',
            description: 'Maintained a Trust Score over 800',
            icon: ShieldCheck,
            color: 'text-green-400 bg-green-400/10 border-green-400/20',
            earned: stats.trustScore >= 800
        },
        {
            id: 'alpha_investor',
            label: 'Alpha Investor',
            description: 'Has 3 or more active investment plans',
            icon: TrendingUp,
            color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
            earned: stats.planCount >= 3
        },
        {
            id: 'networker',
            label: 'Networker',
            description: 'Referred 5 or more active users',
            icon: Users,
            color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
            earned: stats.referralCount >= 5
        },
        {
            id: 'whale',
            label: 'Platform Whale',
            description: 'Total trust and activity score in top 1%',
            icon: Crown,
            color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
            earned: stats.trustScore >= 850 && stats.planCount >= 5
        }
    ], [stats]);

    const earnedBadges = badges.filter(b => b.earned);

    if (earnedBadges.length === 0) return null;

    return (
        <TooltipProvider>
            <div className="flex flex-wrap gap-2">
                {earnedBadges.map(badge => (
                    <Tooltip key={badge.id}>
                        <TooltipTrigger asChild>
                            <div className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest cursor-default transition-transform hover:scale-110",
                                badge.color
                            )}>
                                <badge.icon size={10} />
                                {badge.label}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#030408] border-white/10">
                            <p className="text-xs font-bold text-white">{badge.description}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>
        </TooltipProvider>
    );
}
