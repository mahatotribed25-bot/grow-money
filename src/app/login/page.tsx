
"use client";

import Link from "next/link";
import Image from "next/image";
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
  Smartphone,
  CheckCircle2,
  Zap,
  Star,
  User
} from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useState } from "react";

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

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
       let errorMessage = "Invalid credentials. Please try again.";
        setLoginStatus('error');
        toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: errorMessage,
        });
        setTimeout(() => setLoginStatus('idle'), 2000);
    }
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center bg-[#030408] overflow-x-hidden pt-4 pb-12 px-4">
      {/* Dynamic Background Blurs */}
      <div className="fixed top-[-10%] -left-[20%] w-[80%] h-[40%] rounded-full bg-primary/20 blur-[150px] pointer-events-none animate-pulse z-0" />
      <div className="fixed bottom-[-10%] -right-[20%] w-[80%] h-[40%] rounded-full bg-secondary/10 blur-[150px] pointer-events-none z-0" />
      <div className="fixed top-[30%] left-[40%] w-[30%] h-[30%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 w-full max-md flex flex-col items-center space-y-8">
        
        {/* Top Status Bar */}
        <div className="w-full flex justify-between items-center px-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">100% Secure</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <Headset size={14} className="text-white/60" />
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">24/7 Support</span>
            </div>
        </div>

        {/* Mascot & Branding Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
             <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full animate-pulse" />
             <Image 
                src="https://picsum.photos/seed/catbot1/400/400" 
                alt="Grow Money Mascot" 
                width={160} 
                height={160} 
                className="relative z-10 drop-shadow-[0_0_30px_rgba(var(--primary),0.3)]"
                data-ai-hint="futuristic cat robot financial"
             />
             <TrendingUp className="absolute -top-2 -right-4 text-green-400 h-8 w-8 animate-bounce" />
             <div className="absolute top-1/2 -left-8 bg-yellow-400/20 border border-yellow-400/40 rounded-lg p-1.5 backdrop-blur-md rotate-[-15deg]">
                <span className="text-yellow-400 text-xs font-bold">₹</span>
             </div>
          </div>
          
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
                Grow <span className="text-green-400">Money</span>
                <span className="text-3xl">💰</span>
            </h1>
            <p className="text-xs font-medium text-white/40 tracking-wide">Invest Smart, Earn More, Grow Together</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 w-full">
            <StatsMiniCard icon={Users} label="5,000+" desc="Happy Investors" color="text-purple-400" />
            <StatsMiniCard icon={Wallet} label="₹12.45L+" desc="Paid to Users" color="text-blue-400" />
            <StatsMiniCard icon={TrendingUp} label="99.8%" desc="Success Rate" color="text-green-400" />
        </div>

        {/* Auth Card */}
        <div className="w-full relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition duration-500" />
            <div className="relative w-full bg-white/[0.03] backdrop-blur-3xl border border-white/[0.08] shadow-2xl rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Welcome Back 👋</h2>
                    <p className="text-xs text-white/40">Log in to your Grow Money account</p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white/60 text-xs font-bold uppercase tracking-wider">Email Address</FormLabel>
                                    <FormControl>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                                            <Input
                                                placeholder="name@example.com"
                                                {...field}
                                                className="pl-12 bg-white/5 border-white/10 rounded-xl h-12 focus:ring-primary focus:border-primary/50 text-white placeholder:text-white/10"
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
                                    <FormLabel className="text-white/60 text-xs font-bold uppercase tracking-wider">Password</FormLabel>
                                    <FormControl>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                {...field}
                                                className="pl-12 pr-12 bg-white/5 border-white/10 rounded-xl h-12 focus:ring-primary focus:border-primary/50 text-white placeholder:text-white/10"
                                            />
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-white/20 hover:text-white hover:bg-transparent"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                <Eye size={16} />
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="remember" className="border-white/20 data-[state=checked]:bg-primary" />
                                <label htmlFor="remember" className="text-xs font-bold text-white/60 cursor-pointer">Remember me</label>
                            </div>
                            <Link href="#" className="text-xs font-bold text-primary hover:text-primary/80 transition-colors">Forgot Password?</Link>
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full h-14 rounded-2xl text-lg font-black bg-primary text-white shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 gap-2"
                            disabled={loginStatus === 'loading'}
                        >
                            {loginStatus === 'loading' ? 'Verifying...' : 'Log In'}
                            <ChevronRight size={20} />
                        </Button>
                    </form>
                </Form>

                <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/5"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-[3px]">
                        <span className="bg-transparent px-4 text-white/20">or continue with</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="h-12 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 gap-2 font-bold text-xs">
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path fill="#EA4335" d="M12 11h9v2h-9z" />
                            <path fill="#FBBC05" d="M4 11h16v2H4z" />
                            <path fill="#4285F4" d="M21 12c0-5-4-9-9-9s-9 4-9 9 4 9 9 9 9-4 9-9" />
                            <path fill="#34A853" d="M12 4c2 0 4 1 5 2l2-2C17 2 15 1 12 1 6 1 1 6 1 12s5 11 11 11c3 0 5-1 7-2l-2-2c-1 1-3 1-5 1-4 0-8-3-8-8s4-8 8-8" />
                        </svg>
                        Google
                    </Button>
                    <Button variant="outline" className="h-12 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 gap-2 font-bold text-xs">
                        <Smartphone size={16} />
                        Phone
                    </Button>
                </div>

                <div className="pt-2 flex flex-col items-center gap-4">
                    <p className="text-xs font-bold text-white/30 tracking-tight">
                        Don't have an account?{" "}
                        <Link href="/register" className="text-primary hover:underline underline-offset-4">Register</Link>
                    </p>
                    <div className="h-px w-20 bg-white/5" />
                    <Link href="/admin/login" className="text-[10px] font-black uppercase tracking-[4px] text-white/20 hover:text-white transition-colors">
                        Admin Login
                    </Link>
                </div>
            </div>
        </div>

        {/* Live Activity Section */}
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3 backdrop-blur-xl animate-in slide-in-from-bottom duration-1000">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-green-500 shrink-0">Live Activity</span>
            <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />
            <div className="flex-1 flex items-center gap-2 truncate overflow-hidden">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <User size={12} className="text-primary" />
                </div>
                <p className="text-[11px] font-bold text-white/80 truncate">
                    Rahul <span className="text-white/40 font-normal">just invested</span> <span className="text-green-400">₹5,000</span>
                </p>
            </div>
            <span className="text-[10px] font-bold text-white/20 whitespace-nowrap">2s ago</span>
        </div>

        {/* Footer Badges */}
        <div className="grid grid-cols-4 gap-4 w-full pt-4">
            <FooterBadge icon={ShieldCheck} label="Secure Platform" desc="100% Safe" color="text-green-500" />
            <FooterBadge icon={Zap} label="Fast Pay" desc="Instant Payout" color="text-yellow-500" />
            <FooterBadge icon={Users} label="Community" desc="5000+ Trust" color="text-purple-500" />
            <FooterBadge icon={Headset} label="Support" desc="24/7 Help" color="text-blue-500" />
        </div>
      </div>
    </main>
  );
}

function StatsMiniCard({ icon: Icon, label, desc, color }: { icon: any, label: string, desc: string, color: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-xl">
            <div className={cn("p-2 rounded-xl bg-white/5 mb-2", color)}>
                <Icon size={16} />
            </div>
            <span className="text-sm font-black text-white tracking-tighter">{label}</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-white/20 text-center leading-tight">{desc}</span>
        </div>
    )
}

function FooterBadge({ icon: Icon, label, desc, color }: { icon: any, label: string, desc: string, color: string }) {
    return (
        <div className="flex flex-col items-center text-center space-y-1">
            <div className={cn("p-2 rounded-xl bg-white/[0.02] border border-white/5", color)}>
                <Icon size={18} />
            </div>
            <p className="text-[9px] font-black text-white/80 leading-none">{label}</p>
            <p className="text-[8px] font-bold text-white/20 leading-none">{desc}</p>
        </div>
    )
}
