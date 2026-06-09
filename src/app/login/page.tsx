"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Lock, Mail } from "lucide-react";
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
import { AuthCard } from "@/components/auth/auth-card";
import { useAuth, useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { LoginStatusAnimation } from "@/components/auth/LoginStatusAnimation";

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
        router.push("/");
      }, 1500);

    } catch (error: any) {
       let errorMessage = "An unexpected error occurred. Please try again.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = "Invalid email or password. Please check your credentials and try again.";
        }
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
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#030408] p-4 overflow-hidden">
      {/* Background Glow Blobs */}
      <div className="fixed top-[-10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none animate-pulse z-0" />
      <div className="fixed bottom-[-10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[120px] pointer-events-none z-0" />
      
      <div className="relative z-10 w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center space-y-4 text-center">
          <LoginStatusAnimation status={loginStatus} />
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-white drop-shadow-2xl">
                Grow Money
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[5px] text-primary">Wealth Simplified</p>
          </div>
        </div>

        <AuthCard
          title="Secure Access"
          description="Log in to manage your digital assets"
          footer={
            <div className="flex flex-col items-center gap-3">
              <p>
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="font-bold text-primary hover:text-white transition-colors underline-offset-4 hover:underline"
                >
                  Join Now
                </Link>
              </p>
              <Separator className="w-20 bg-white/5" />
              <Link
                href="/admin/login"
                className="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white transition-colors"
              >
                Administrator Entry
              </Link>
            </div>
          }
        >
          <fieldset disabled={loginStatus === 'loading' || loginStatus === 'success'}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/60">Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                          <Input
                            placeholder="name@example.com"
                            {...field}
                            className="pl-10 bg-white/5 border-white/10 rounded-xl h-11 focus:ring-primary text-white"
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
                      <FormLabel className="text-white/60">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                            className="pl-10 bg-white/5 border-white/10 rounded-xl h-11 focus:ring-primary text-white"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95" disabled={loginStatus === 'loading' || loginStatus === 'success'}>
                  Log In Securely
                </Button>
              </form>
            </Form>
          </fieldset>
        </AuthCard>
      </div>
    </main>
  );
}

function Separator({ className }: { className?: string }) {
    return <div className={cn("h-px w-full bg-border", className)} />
}
