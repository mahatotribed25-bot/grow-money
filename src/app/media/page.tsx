'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDoc, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Home, Briefcase, Trophy, HandCoins, User, PlayCircle, Timer } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/settings-context';
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type AdminSettings = {
  homepageVideoUrls?: string[];
};

export default function MediaHubPage() {
    const { user } = useUser();
    const { t } = useSettings();
    const { data: settings, loading } = useDoc<AdminSettings>('settings/admin');
    
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);

    const validUrls = useMemo(() => {
        if (!settings?.homepageVideoUrls) return [];
        return settings.homepageVideoUrls
            .map(url => {
                if (!url) return null;
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                const match = url.match(regExp);
                return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
            })
            .filter(Boolean) as string[];
    }, [settings]);

    useEffect(() => {
        if (!api) return;
        setCurrent(api.selectedScrollSnap());
        api.on("select", () => {
            setCurrent(api.selectedScrollSnap());
        });
    }, [api]);

    return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground transition-colors duration-300">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 backdrop-blur-xl px-4 sm:px-6">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="hover:bg-accent text-foreground/70">
                        <ChevronLeft />
                    </Button>
                </Link>
                <h1 className="text-lg font-bold tracking-tight uppercase flex items-center gap-2">
                    <PlayCircle className="text-primary h-5 w-5" /> {t.dashboard.media_hub}
                </h1>
                <div className="w-9" />
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 max-w-4xl mx-auto w-full">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-20">
                        <Timer className="animate-spin text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-[4px]">Syncing Media Stream</p>
                    </div>
                ) : validUrls.length > 0 ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-black tracking-tighter uppercase">Platform Media</h2>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[3px]">Official Video Tutorials</p>
                        </div>

                        <Card className="bg-card border-border rounded-[2.5rem] overflow-hidden shadow-2xl relative group">
                            <CardContent className="p-0">
                                <Carousel setApi={setApi} opts={{ loop: true }} className="w-full">
                                    <CarouselContent>
                                        {validUrls.map((embedUrl, index) => (
                                            <CarouselItem key={index}>
                                                <div className="aspect-video w-full bg-black">
                                                    <iframe
                                                        width="100%"
                                                        height="100%"
                                                        src={embedUrl}
                                                        title={`Module ${index + 1}`}
                                                        frameBorder="0"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                        allowFullScreen
                                                        className="w-full h-full"
                                                    ></iframe>
                                                </div>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    {validUrls.length > 1 && (
                                        <>
                                            <CarouselPrevious className="left-4 h-12 w-12 bg-black/50 border-white/10 text-white hover:bg-primary transition-all" />
                                            <CarouselNext className="right-4 h-12 w-12 bg-black/50 border-white/10 text-white hover:bg-primary transition-all" />
                                        </>
                                    )}
                                </Carousel>
                                
                                {validUrls.length > 1 && (
                                    <div className="flex justify-center gap-2 py-6 bg-muted/20 border-t border-border/5">
                                        {validUrls.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => api?.scrollTo(i)}
                                                className={cn(
                                                    "h-1.5 rounded-full transition-all duration-300",
                                                    current === i ? "w-8 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "w-3 bg-muted-foreground/30"
                                                )}
                                                aria-label={`Go to slide ${i + 1}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="text-center py-20 space-y-4">
                        <PlayCircle size={48} className="mx-auto text-muted-foreground/20" />
                        <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">No tutorials active in current node.</p>
                        <Button asChild variant="outline" className="border-border rounded-xl">
                            <Link href="/dashboard">Back to Control</Link>
                        </Button>
                    </div>
                )}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/20 bg-background/95 backdrop-blur-xl h-16 flex items-center justify-around px-4">
                <BottomNavItem icon={Home} label={t.nav.home} href="/dashboard" />
                <BottomNavItem icon={Briefcase} label={t.nav.plans} href="/plans" />
                <BottomNavItem icon={Trophy} label={t.nav.leaders} href="/leaderboard" />
                <BottomNavItem icon={HandCoins} label={t.nav.loans} href="/my-loans" />
                <BottomNavItem icon={User} label={t.nav.profile} href="/profile" />
            </nav>
        </div>
    );
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all h-full relative",
        active ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'
    )}>
      <Icon className={cn("h-5 w-5")} />
      <span className="text-[10px] tracking-tight">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
