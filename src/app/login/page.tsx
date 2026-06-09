
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
  Briefcase
} from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useState, useEffect } from "react";

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
import { useAuth, useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
});

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loginStatus, setLoginStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [particles, setParticles] = useState<{ top: string; left: string; delay: string }[]>([]);

  useEffect(() => {
    // Generate particles on client side to avoid hydration mismatch
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
            title: "Authentication Failed",
            description: "Invalid credentials. Please try again.",
        });
        setTimeout(() => setLoginStatus('idle'), 2000);
    }
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center bg-[#020306] overflow-x-hidden pt-4 pb-12 px-4">
      {/* Background Atmosphere */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] -left-[20%] w-[80%] h-[40%] rounded-full bg-primary/10 blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] -right-[20%] w-[80%] h-[40%] rounded-full bg-secondary/10 blur-[150px]" />
        
        {/* Particle Stars */}
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

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center space-y-8">
        
        {/* Top Header Status Bars */}
        <div className="w-full flex justify-between items-center px-4">
            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                <div className="h-2.5 w-2.5 rounded-full bg-[#22c55e] shadow-[0_0_10px_#22c55e]" />
                <span className="text-[11px] font-black text-white/90 uppercase tracking-[1px]">100% Secure</span>
            </div>
            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                <Headset size={16} className="text-white/70" />
                <span className="text-[11px] font-black text-white/90 uppercase tracking-[1px]">24/7 Support</span>
            </div>
        </div>

        {/* Branding Section */}
        <div className="flex flex-col items-center space-y-2 text-center py-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-2 shadow-2xl shadow-primary/20 border border-primary/20">
            <Briefcase size={32} className="text-primary" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white flex items-center justify-center gap-3">
              Grow <span className="text-[#22c55e]">Money</span>
              <span className="text-3xl">💰</span>
          </h1>
          <p className="text-xs font-bold text-white/40 tracking-[3px] uppercase">Elite Investment Network</p>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-3 w-full px-2">
            <StatsMiniCard icon={Users} label="5,000+" desc="Investors" color="text-purple-400" />
            <StatsMiniCard icon={Wallet} label="₹12.45L+" desc="Paid Out" color="text-blue-400" />
            <StatsMiniCard icon={TrendingUp} label="99.8%" desc="Success" color="text-[#22c55e]" />
        </div>

        {/* Authentication Card */}
        <div className="w-full max-w-md relative group px-2">
            <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-500" />
            <div className="relative w-full bg-white/[0.04] backdrop-blur-[40px] border border-white/10 shadow-2xl rounded-[2rem] p-8 space-y-7">
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-black text-white tracking-tight">Secure Access Portal</h2>
                    <p className="text-[11px] font-bold text-white/30 uppercase tracking-[2px]">Enter your credentials</p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white/50 text-[10px] font-black uppercase tracking-widest pl-1">Email Identifier</FormLabel>
                                    <FormControl>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                                            <Input
                                                placeholder="investor@tribed.world"
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
                                    <FormLabel className="text-white/50 text-[10px] font-black uppercase tracking-widest pl-1">Security Key</FormLabel>
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
                                <label htmlFor="remember" className="text-xs font-bold text-white/40 cursor-pointer select-none">Stay Logged In</label>
                            </div>
                            <Link href="#" className="text-xs font-bold text-primary hover:text-white transition-colors">Recover Account</Link>
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full h-15 rounded-2xl text-lg font-black bg-primary text-white shadow-2xl shadow-primary/40 transition-all hover:scale-[1.02] active:scale-95 gap-3"
                            disabled={loginStatus === 'loading'}
                        >
                            {loginStatus === 'loading' ? 'Authenticating...' : 'Authorize Login'}
                            <ChevronRight size={22} className={cn(loginStatus === 'loading' && "hidden")} />
                        </Button>
                    </form>
                </Form>

                <div className="flex flex-col items-center gap-5 pt-4">
                    <p className="text-xs font-bold text-white/30 tracking-tight">
                        New to the platform?{" "}
                        <Link href="/register" className="text-primary hover:text-white transition-colors underline underline-offset-4">Create Account</Link>
                    </p>
                    <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <Link href="/admin/login" className="text-[10px] font-black uppercase tracking-[4px] text-white/20 hover:text-white transition-colors">
                        Admin Terminal
                    </Link>
                </div>
            </div>
        </div>

        {/* Live Pulse Ticker */}
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center gap-4 backdrop-blur-xl shadow-2xl">
            <div className="h-2.5 w-2.5 rounded-full bg-[#22c55e] animate-ping shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-[2px] text-[#22c55e] shrink-0">Live Pulse</span>
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

        {/* Footer Badges */}
        <div className="grid grid-cols-4 gap-2 w-full pt-4">
            <FooterBadge icon={ShieldCheck} label="Bank-Grade" desc="Encryption" color="text-[#22c55e]" />
            <FooterBadge icon={Zap} label="Instant" desc="Withdrawals" color="text-yellow-400" />
            <FooterBadge icon={Users} label="Verified" desc="Community" color="text-purple-400" />
            <FooterBadge icon={Headset} label="Priority" desc="Tech Support" color="text-blue-400" />
        </div>
      </div>
    </main>
  );
}

function StatsMiniCard({ icon: Icon, label, desc, color }: { icon: any, label: string, desc: string, color: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-3xl shadow-xl hover:bg-white/[0.06] transition-all">
            <div className={cn("p-2.5 rounded-xl bg-white/5 mb-2.5", color)}>
                <Icon size={18} />
            </div>
            <span className="text-base font-black text-white tracking-tighter">{label}</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/20 text-center leading-tight mt-1">{desc}</span>
        </div>
    )
}

function FooterBadge({ icon: Icon, label, desc, color }: { icon: any, label: string, desc: string, color: string }) {
    return (
        <div className="flex flex-col items-center text-center space-y-1.5 opacity-60 hover:opacity-100 transition-opacity">
            <div className={cn("p-2.5 rounded-2xl bg-white/[0.03] border border-white/5", color)}>
                <Icon size={20} />
            </div>
            <div className="space-y-0.5">
                <p className="text-[10px] font-black text-white/90 leading-none tracking-tight">{label}</p>
                <p className="text-[8px] font-bold text-white/20 leading-none uppercase tracking-[1px]">{desc}</p>
            </div>
        </div>
    );
}
