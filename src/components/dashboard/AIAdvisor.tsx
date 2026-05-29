'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, X, MessageSquare, ArrowRight, BrainCircuit, TrendingUp } from 'lucide-react';
import { getFinancialAdvice } from '@/ai/flows/advisor';
import { cn } from '@/lib/utils';

type Advice = {
    greeting: string;
    recommendation: string;
    suggestedPlanNames: string[];
    tip: string;
}

export function AIAdvisor({ balance, userName }: { balance: number, userName: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [advice, setAdvice] = useState<Advice | null>(null);

    const handleGetAdvice = async () => {
        setLoading(true);
        try {
            const result = await getFinancialAdvice({ balance, userName });
            setAdvice(result);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="fixed bottom-24 right-6 z-40">
                <Button 
                    onClick={() => { setIsOpen(true); if(!advice) handleGetAdvice(); }}
                    className="h-12 w-12 rounded-full shadow-2xl bg-gradient-to-tr from-primary to-purple-600 hover:scale-110 transition-transform border-2 border-white/20 p-0"
                >
                    <BrainCircuit className="h-6 w-6 text-white" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                </Button>
            </div>

            {isOpen && (
                <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-24 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm sm:hidden" onClick={() => setIsOpen(false)} />
                    <Card className="w-full max-w-sm bg-[#030408]/90 backdrop-blur-2xl border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-secondary" />
                        <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-primary/20">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                </div>
                                <CardTitle className="text-sm font-bold text-white">AI Wealth Advisor</CardTitle>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5" onClick={() => setIsOpen(false)}>
                                <X className="h-4 w-4 text-white/40" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <BrainCircuit className="h-8 w-8 text-primary animate-pulse" />
                                    <p className="text-[10px] font-black uppercase tracking-[3px] text-white/20">Analyzing Market Data...</p>
                                </div>
                            ) : advice ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-primary uppercase tracking-widest">{advice.greeting}</p>
                                        <p className="text-sm text-white/70 leading-relaxed italic">"{advice.recommendation}"</p>
                                    </div>

                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">Recommended Picks</p>
                                        <div className="flex flex-wrap gap-2">
                                            {advice.suggestedPlanNames.map(name => (
                                                <Badge key={name} variant="outline" className="bg-primary/10 border-primary/20 text-primary text-[10px]">{name}</Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                                        <p className="text-[10px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                            <TrendingUp size={12}/> Growth Strategy
                                        </p>
                                        <p className="text-xs text-green-200/60 leading-relaxed">{advice.tip}</p>
                                    </div>

                                    <Button onClick={handleGetAdvice} variant="ghost" className="w-full h-8 text-[10px] uppercase font-bold text-white/30 hover:text-white">
                                        Refresh Advice
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-center py-10 text-white/20 italic">No advice found.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
