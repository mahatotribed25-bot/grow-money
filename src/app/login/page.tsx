
"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  Lock, 
  Mail, 
  ChevronRight, 
  ShieldCheck, 
  Headset, 
  Users, 
  Wallet, 
  TrendingUp, 
  Eye,
  User,
  Zap,
  Briefcase,
  Timer,
  RefreshCcw,
  Coins,
  X,
  Sparkles
} from "lucide-react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useState, useEffect, useCallback } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth, useFirestore, useDoc } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import Image from "next/image";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
});

type AdminSettings = {
    festiveTheme?: 'none' | 'diwali';
};

/**
 * Smooth Counting Animation Component
 */
function Counter({ value, duration = 2000, decimals = 0 }: { value: number, duration?: number, decimals?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(progress * value);
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <>{count.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}

/**
 * Detailed 3D Golden Rupee Coin SVG component.
 */
function GoldCoin({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
        <div className="absolute inset-0 bg-yellow-500/30 blur-3xl rounded-full animate-pulse" />
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative drop-shadow-[0_15px_35px_rgba(0,0,0,0.6)]">
            <circle cx="50" cy="50" r="48" fill="url(#gold_edge)" stroke="#78350F" strokeWidth="1"/>
            <circle cx="50" cy="50" r="42" fill="url(#gold_grad)" stroke="#B45309" strokeWidth="2"/>
            <circle cx="50" cy="50" r="34" stroke="#FDE68A" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4"/>
            <path 
                d="M30 32h40 M30 44h40 M65 32c0 0 0 28-30 28 M40 60c15 0 25 15 25 25" 
                stroke="#78350F" 
                strokeWidth="10" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
            <defs>
                <linearGradient id="gold_edge" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#92400E"/>
                    <stop offset="0.5" stopColor="#F59E0B"/>
                    <stop offset="1" stopColor="#78350F"/>
                </linearGradient>
                <linearGradient id="gold_grad" x1="20" x2="80" y1="20" y2="80" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FDE68A"/>
                    <stop offset="0.4" stopColor="#F59E0B"/>
                    <stop offset="0.7" stopColor="#D97706"/>
                    <stop offset="1" stopColor="#78350F"/>
                </linearGradient>
            </defs>
        </svg>
    </div>
  )
}

/**
 * Diwali Diya Component for festive atmosphere
 */
function DiyaSVG({ className }: { className?: string }) {
    return (
        <div className={cn("relative w-16 h-16", className)}>
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
                <path d="M10 60C10 80 30 95 50 95C70 95 90 80 90 60H10Z" fill="url(#diya_body)" stroke="#78350F" strokeWidth="0.5" />
                <path d="M50 10C50 10 35 40 35 55C35 65 42 70 50 70C58 70 65 65 65 55C65 40 50 10 50 10Z" fill="url(#flame_grad)" className="animate-flicker origin-bottom" />
                <defs>
                    <linearGradient id="diya_body" x1="50" y1="60" x2="50" y2="95" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#92400E" />
                        <stop offset="0.5" stopColor="#D97706" />
                        <stop offset="1" stopColor="#78350F" />
                    </linearGradient>
                    <radialGradient id="flame_grad" cx="50" cy="55" r="30" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FFF" />
                        <stop offset="0.4" stopColor="#FBBF24" />
                        <stop offset="0.8" stopColor="#EA580C" />
                        <stop offset="1" stopColor="transparent" />
                    </radialGradient>
                </defs>
            </svg>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 bg-yellow-500/20 blur-3xl rounded-full animate-pulse" />
        </div>
    );
}

/**
 * Animated Firework Particles for circular spread
 */
function CircularFireworkBlast({ colors }: { colors: string[] }) {
    const particleCount = 45;
    const particles = Array.from({ length: particleCount });

    return (
        <div className="relative">
            {particles.map((_, i) => {
                const angle = (360 / particleCount) * i;
                const color = colors[i % colors.length];
                const distance = 140 + Math.random() * 100; 
                
                return (
                    <div 
                        key={i}
                        className="absolute w-2.5 h-2.5 rounded-full animate-firework-burst-circle"
                        style={{ 
                            backgroundColor: color,
                            boxShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
                            '--angle': `${angle}deg`,
                            '--distance': `${distance}px`,
                            opacity: 0
                        } as React.CSSProperties}
                    />
                );
            })}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white/20 rounded-full blur-3xl animate-out fade-out duration-1000" />
        </div>
    );
}

/**
 * Animated Falling items for background atmosphere.
 */
function FallingAtmosphere({ type = 'cash' }: { type?: 'cash' | 'gold' }) {
  const [items, setItems] = useState<{ id: number; left: string; delay: string; duration: string; size: number; symbol: string }[]>([]);

  useEffect(() => {
    const cashSymbols = ['💸', '💵', '💰', '💴', '💶'];
    const goldSymbols = ['✨', '✨', '🟡', '🔱', '🪔'];
    const symbols = type === 'gold' ? goldSymbols : goldSymbols;
    
    const newItems = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 20}s`,
      duration: `${Math.random() * 8 + 8}s`,
      size: type === 'gold' ? (Math.random() * 4 + 2) : (Math.random() * 30 + 15),
      symbol: type === 'cash' ? cashSymbols[Math.floor(Math.random() * cashSymbols.length)] : ''
    }));
    setItems(newItems);
  }, [type]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
      {items.map((item) => (
        <div 
          key={item.id}
          className={cn("absolute top-[-15%] select-none animate-fall", type === 'gold' && "rounded-full bg-yellow-400/40 blur-[1px]")}
          style={{
            left: item.left,
            animationDelay: item.delay,
            animationDuration: item.duration,
            fontSize: type === 'cash' ? `${item.size}px` : undefined,
            width: type === 'gold' ? `${item.size}px` : undefined,
            height: type === 'gold' ? `${item.size}px` : undefined,
          }}
        >
          {item.symbol}
        </div>
      ))}
    </div>
  );
}

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { data: settings } = useDoc<AdminSettings>('settings/admin');
  
  const [loginStatus, setLoginStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [particles, setParticles] = useState<{ top: string; left: string; delay: string }[]>([]);
  const [fireworks, setFireworks] = useState<{ id: number; top: string; left: string; colors: string[]; isRocket?: boolean }[]>([]);
  const [visibleWords, setVisibleWords] = useState<number>(0);

  const isDiwali = settings?.festiveTheme === 'diwali';
  const fullText = "Happy Diwali from Grow Money Team".split(" ");

  // Word-by-word reveal animation
  useEffect(() => {
    if (isDiwali) {
      if (visibleWords < fullText.length) {
        const timer = setTimeout(() => {
          setVisibleWords(prev => prev + 1);
        }, 700);
        return () => clearTimeout(timer);
      } else {
          const resetTimer = setTimeout(() => {
              setVisibleWords(0);
          }, 12000);
          return () => clearTimeout(resetTimer);
      }
    }
  }, [visibleWords, fullText.length, isDiwali]);

  // Rocket Trigger Logic
  const triggerRocketBurst = useCallback(() => {
    if (!isDiwali) return;
    const burstId = Date.now();
    const rocketCount = 2 + Math.floor(Math.random() * 2); 
    const colorPalettes = [
        ['#FF00FF', '#00FFFF', '#FFFFFF'], 
        ['#FFD700', '#FF4500', '#EA580C'], 
        ['#ADFF2F', '#00FF00', '#FFFFFF']  
    ];

    const newRockets = Array.from({ length: rocketCount }).map((_, i) => {
        const id = burstId + i;
        const leftPos = `${10 + Math.random() * 80}%`;
        const targetTop = `${15 + Math.random() * 30}%`; 
        const colors = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
        
        setTimeout(() => {
            setFireworks(prev => prev.map(f => f.id === id ? { ...f, isRocket: false } : f));
            setTimeout(() => {
                setFireworks(prev => prev.filter(f => f.id !== id));
            }, 3500);
        }, 2500);

        return { id, top: targetTop, left: leftPos, colors, isRocket: true };
    });

    setFireworks(prev => [...prev, ...newRockets]);
  }, [isDiwali]);

  useEffect(() => {
    if (isDiwali) {
        const interval = setInterval(triggerRocketBurst, 5000);
        return () => clearInterval(interval);
    }
  }, [triggerRocketBurst, isDiwali]);

  // Forgot Password States
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const newParticles = Array.from({ length: 20 }).map(() => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
    }));
    setParticles(newParticles);
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoginStatus('loading');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      const userDocRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().status === 'Blocked') {
        await auth.signOut();
        setLoginStatus('error');
        toast({
          variant: "destructive",
          title: "Account Blocked",
          description: "Your account has been blocked by an administrator.",
        });
        setTimeout(() => setLoginStatus('idle'), 2000);
        return;
      }
      
      setLoginStatus('success');
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);

    } catch (error: any) {
        setLoginStatus('error');
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: "Invalid email or password. Please try again.",
        });
        setTimeout(() => setLoginStatus('idle'), 2000);
    }
  }

  const handleResetPassword = async () => {
    if (!resetEmail) {
        toast({ title: "Email Required", description: "Please enter your registered email address.", variant: "destructive" });
        return;
    }
    setResetLoading(true);
    try {
        await sendPasswordResetEmail(auth, resetEmail);
        toast({ 
            title: "Email Sent", 
            description: `A reset link has been sent to ${resetEmail}.` 
        });
        setIsResetOpen(false);
        setResetEmail('');
    } catch (e: any) {
        let errorMsg = "Could not send reset link.";
        if (e.code === 'auth/user-not-found') errorMsg = "No account found with this email.";
        toast({ title: "Failed", description: errorMsg, variant: "destructive" });
    } finally {
        setResetLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center bg-[#020306] overflow-x-hidden pt-4 pb-12 px-4">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] -left-[20%] w-[80%] h-[40%] rounded-full bg-primary/10 blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] -right-[20%] w-[80%] h-[40%] rounded-full bg-secondary/10 blur-[150px]" />
        
        <div className="absolute inset-0 opacity-30">
            {particles.map((p, i) => (
                <div 
                    key={i} 
                    className="absolute h-1 w-1 bg-white rounded-full animate-pulse"
                    style={{ 
                        top: p.top, 
                        left: p.left,
                        animationDelay: p.delay
                    }}
                />
            ))}
        </div>
      </div>

      <FallingAtmosphere type={isDiwali ? 'gold' : 'cash'} />

      {/* Diwali Skyrockets */}
      {isDiwali && fireworks.map(fw => (
        <div 
          key={fw.id} 
          className="fixed pointer-events-none z-50" 
          style={{ top: fw.top, left: fw.left }}
        >
            {fw.isRocket ? (
                <div className="relative animate-rocket-launch">
                    <div className="w-3 h-8 bg-gradient-to-t from-orange-600 to-yellow-300 rounded-full shadow-[0_0_30px_#f59e0b]" />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-1 h-32 bg-gradient-to-b from-yellow-300 via-orange-500/20 to-transparent blur-[3px]" />
                </div>
            ) : (
                <CircularFireworkBlast colors={fw.colors} />
            )}
        </div>
      ))}

      {/* Floating Decorative Elements */}
      <div className="absolute top-10 left-0 w-full h-96 pointer-events-none overflow-hidden z-0 select-none">
          <div className="absolute left-1/2 top-5 -translate-x-1/2 animate-pulse duration-[4000ms]">
              <div className="h-32 w-32 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center backdrop-blur-3xl shadow-[0_0_60px_rgba(34,197,94,0.4)]">
                  <TrendingUp className="text-green-400 h-20 w-20 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
              </div>
          </div>
          <GoldCoin className="absolute left-[5%] top-12 h-28 w-28 animate-bounce duration-[4000ms]" />
          <GoldCoin className="absolute right-[5%] top-24 h-24 w-24 animate-bounce duration-[3000ms] delay-700" />
      </div>

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center space-y-8">
        <div className="w-full flex justify-between items-center px-4">
            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                <div className="h-2.5 w-2.5 rounded-full bg-[#22c55e] shadow-[0_0_10px_#22c55e]" />
                <span className="text-[11px] font-black text-white/90 uppercase tracking-[1px]">Secure Login</span>
            </div>
            <a 
                href="https://t.me/growmoney3" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl hover:bg-white/10 transition-colors group cursor-pointer"
            >
                <Headset size={16} className="text-white/70 group-hover:text-primary transition-colors" />
                <span className="text-[11px] font-black text-white/90 uppercase tracking-[1px]">Help & Support</span>
            </a>
        </div>

        <div className="flex flex-col items-center space-y-2 text-center py-4 relative">
          {isDiwali && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-12 w-full justify-center">
                  <DiyaSVG className="animate-side-wobble" />
                  <DiyaSVG className="animate-side-wobble" style={{ animationDelay: '1.5s' }} />
              </div>
          )}
          
          <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-2 shadow-2xl shadow-primary/20 border border-primary/20">
            <Briefcase size={32} className="text-primary" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white flex items-center justify-center gap-3">
              Grow <span className="text-[#22c55e]">Money</span>
              <span className="text-3xl">💰</span>
          </h1>
          <p className="text-xs font-bold text-white/40 tracking-[3px] uppercase">Smart Investment Hub</p>
        </div>

        {isDiwali && (
            <div className="text-center px-4 animate-in fade-in duration-1000">
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-2">
                  {fullText.map((word, idx) => (
                    <span 
                      key={idx}
                      className={cn(
                          "text-xl md:text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-400 to-amber-600 drop-shadow-[0_0_20px_rgba(234,179,8,0.7)] transition-all duration-1000",
                          idx < visibleWords ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-90"
                      )}
                    >
                      {word}
                    </span>
                  ))}
                </div>
            </div>
        )}

        <div className="grid grid-cols-3 gap-3 w-full px-2">
            <StatsMiniCard icon={Users} value={5000} suffix="+" desc="Users" color="text-purple-400" />
            <StatsMiniCard icon={Wallet} value={12.45} prefix="₹" suffix="L+" desc="Withdrawn" color="text-blue-400" decimals={2} />
            <StatsMiniCard icon={TrendingUp} value={99.8} suffix="%" desc="Reliability" color="text-[#22c55e]" decimals={1} />
        </div>

        <div className="w-full max-w-md relative group px-2">
            <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-500" />
            <div className="relative w-full bg-white/[0.04] backdrop-blur-[40px] border border-white/10 shadow-2xl rounded-[2rem] p-8 space-y-7">
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-black text-white tracking-tight">Login to Dashboard</h2>
                    <p className="text-[11px] font-bold text-white/30 uppercase tracking-[2px]">Enter your email and password</p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white/50 text-[10px] font-black uppercase tracking-widest pl-1">Email Address</FormLabel>
                                    <FormControl>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                                            <Input
                                                placeholder="example@email.com"
                                                {...field}
                                                className="pl-12 bg-white/5 border-white/10 rounded-xl h-14 focus:ring-primary focus:border-primary/50 text-white placeholder:text-white/10 text-base"
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white/50 text-[10px] font-black uppercase tracking-widest pl-1">Password</FormLabel>
                                    <FormControl>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                {...field}
                                                className="pl-12 pr-12 bg-white/5 border-white/10 rounded-xl h-14 focus:ring-primary focus:border-primary/50 text-white placeholder:text-white/10 text-base"
                                            />
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 text-white/20 hover:text-white hover:bg-transparent"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                <Eye size={18} />
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="remember" className="border-white/20 data-[state=checked]:bg-primary h-5 w-5 rounded-lg" />
                                <label htmlFor="remember" className="text-xs font-bold text-white/40 cursor-pointer select-none">Remember Me</label>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setIsResetOpen(true)}
                                className="text-xs font-bold text-primary hover:text-white transition-colors"
                            >
                                Forgot Password?
                            </button>
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full h-15 rounded-2xl text-lg font-black bg-primary text-white shadow-2xl shadow-primary/40 transition-all hover:scale-[1.02] active:scale-95 gap-3"
                            disabled={loginStatus === 'loading'}
                        >
                            {loginStatus === 'loading' ? 'Checking...' : 'Login Now'}
                            <ChevronRight size={22} className={cn(loginStatus === 'loading' && "hidden")} />
                        </Button>
                    </form>
                </Form>

                <div className="flex flex-col items-center gap-5 pt-4">
                    <p className="text-xs font-bold text-white/30 tracking-tight">
                        New to Grow Money?{" "}
                        <Link href="/register" className="text-primary hover:text-white transition-colors underline underline-offset-4">Register Here</Link>
                    </p>
                    <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <Link href="/admin/login" className="text-[10px] font-black uppercase tracking-[4px] text-white/20 hover:text-white transition-colors">
                        Admin Login
                    </Link>
                </div>
            </div>
        </div>

        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center gap-4 backdrop-blur-xl shadow-2xl">
            <div className="h-2.5 w-2.5 rounded-full bg-[#22c55e] animate-ping shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-[2px] text-[#22c55e] shrink-0">Live Status</span>
            <div className="h-4 w-px bg-white/10 shrink-0" />
            <div className="flex-1 flex items-center gap-2.5 truncate overflow-hidden">
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/20">
                    <User size={14} className="text-primary" />
                </div>
                <p className="text-[11px] font-bold text-white/90 truncate">
                    Harsh <span className="text-white/40 font-normal">verified</span> <span className="text-[#22c55e]">₹10,000 Portfolio</span>
                </p>
            </div>
            <span className="text-[10px] font-black text-white/20 whitespace-nowrap">Now</span>
        </div>

        <div className="grid grid-cols-4 gap-2 w-full pt-4">
            <FooterBadge icon={ShieldCheck} label="Safe" desc="Secure" color="text-[#22c55e]" />
            <FooterBadge icon={Zap} label="Fast" desc="Payouts" color="text-yellow-400" />
            <FooterBadge icon={Users} label="Trusted" desc="Community" color="text-purple-400" />
            <FooterBadge icon={Headset} iconSize={20} label="Help" desc="Support" color="text-blue-400" />
        </div>
      </div>

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white sm:max-w-md">
            <DialogHeader>
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 mx-auto">
                    <RefreshCcw className={cn("text-primary", resetLoading && "animate-spin")} />
                </div>
                <DialogTitle className="text-2xl font-black text-center tracking-tight">Reset Password</DialogTitle>
                <DialogDescription className="text-white/40 text-center">
                    Enter your email to receive a password reset link.
                </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
                <div className="space-y-2">
                    <Label className="text-white/50 text-[10px] font-black uppercase tracking-widest pl-1">Email Address</Label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="investor@example.com"
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="pl-12 bg-white/5 border-white/10 rounded-xl h-14 focus:ring-primary focus:border-primary/50 text-white placeholder:text-white/10"
                        />
                    </div>
                </div>
            </div>
            <DialogFooter className="flex-col sm:flex-col gap-3">
                <Button 
                    onClick={handleResetPassword} 
                    className="w-full h-14 rounded-xl font-black bg-primary text-white shadow-2xl shadow-primary/20"
                    disabled={resetLoading}
                >
                    {resetLoading ? "Sending..." : "Send Reset Link"}
                </Button>
                <DialogClose asChild>
                    <Button variant="ghost" className="w-full text-white/40 hover:text-white">Back to Login</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function StatsMiniCard({ icon: Icon, value, suffix = "", prefix = "", desc, color, decimals = 0 }: { icon: any, value: number, suffix?: string, prefix?: string, desc: string, color: string, decimals?: number }) {
    return (
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-3xl shadow-xl hover:bg-white/[0.06] transition-all">
            <div className={cn("p-2.5 rounded-xl bg-white/5 mb-2.5", color)}>
                <Icon size={18} />
            </div>
            <span className="text-base font-black text-white tracking-tighter">
                {prefix}<Counter value={value} decimals={decimals} />{suffix}
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/20 text-center leading-tight mt-1">{desc}</span>
        </div>
    )
}

function FooterBadge({ icon: Icon, label, desc, color, iconSize = 20 }: { icon: any, label: string, desc: string, color: string, iconSize?: number }) {
    return (
        <div className="flex flex-col items-center text-center space-y-1.5 opacity-60 hover:opacity-100 transition-opacity">
            <div className={cn("p-2.5 rounded-2xl bg-white/[0.03] border border-white/5", color)}>
                <Icon size={iconSize} />
            </div>
            <div className="space-y-0.5">
                <p className="text-[10px] font-black text-white/90 leading-none tracking-tight">{label}</p>
                <p className="text-[8px] font-bold text-white/20 leading-none uppercase tracking-[1px]">{desc}</p>
            </div>
        </div>
    );
}
