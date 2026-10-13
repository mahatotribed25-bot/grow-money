'use client';

import { useCollection } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronLeft, Home, Briefcase, Trophy, HandCoins, User, ShoppingBag, ExternalLink, Timer, Search, Filter, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/settings-context';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';

type Product = {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    affiliateLink: string;
    status: 'Active' | 'Hidden';
}

export default function UserProductsPage() {
    const { t } = useSettings();
    const { data: products, loading } = useCollection<Product>('products', { where: ['status', '==', 'Active'] });
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [products, searchQuery]);

    return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground transition-colors duration-300 pb-24">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 backdrop-blur-xl px-4 sm:px-6">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="hover:bg-accent text-foreground/70">
                        <ChevronLeft />
                    </Button>
                </Link>
                <h1 className="text-lg font-bold tracking-tight uppercase flex items-center gap-2">
                    <ShoppingBag className="text-primary h-5 w-5" /> {t.dashboard.shopping || "Marketplace"}
                </h1>
                <div className="w-9" />
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
                
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                        <Search size={18} />
                    </div>
                    <Input 
                        placeholder="Search exclusive deals..." 
                        className="h-14 pl-12 rounded-2xl bg-card border-border shadow-inner font-bold placeholder:text-muted-foreground/40"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-20">
                        <Timer className="animate-spin text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-[4px]">Syncing Market Data</p>
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-700">
                        {filteredProducts.map((product) => (
                            <Card key={product.id} className="bg-card border-border rounded-[2rem] overflow-hidden shadow-2xl relative group hover:border-primary/40 transition-all">
                                <div className="relative aspect-square w-full bg-muted/20 overflow-hidden">
                                    <Image 
                                        src={product.imageUrl} 
                                        alt={product.name} 
                                        fill 
                                        className="object-cover transition-transform duration-700 group-hover:scale-110" 
                                    />
                                    <div className="absolute top-4 left-4 z-10">
                                        <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-[9px] font-black uppercase tracking-widest px-3 h-6 shadow-lg">
                                            Premium Node
                                        </Badge>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                </div>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg font-black tracking-tight text-white/90 line-clamp-1">{product.name}</CardTitle>
                                    </div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Verified Supplier</p>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Global Value</p>
                                            <p className="text-2xl font-black text-white tracking-tighter">₹{product.price.toLocaleString()}</p>
                                        </div>
                                        <Button asChild className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-transform active:scale-95">
                                            <a href={product.affiliateLink} target="_blank" rel="noopener noreferrer">
                                                Buy Now <ArrowRight size={14} className="ml-1.5" />
                                            </a>
                                        </Button>
                                    </div>
                                    {product.description && (
                                        <div className="pt-4 border-t border-white/5">
                                            <p className="text-[11px] text-white/40 leading-relaxed font-medium line-clamp-2 italic">"{product.description}"</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 space-y-4">
                        <ShoppingBag size={48} className="mx-auto text-muted-foreground/10" />
                        <p className="text-muted-foreground text-sm font-black uppercase tracking-widest">No products found in marketplace.</p>
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
        active ? 'text-primary scale-110' : 'text-white/40 hover:text-white/60'
    )}>
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]")} />
      <span className="text-[10px] tracking-tight">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
