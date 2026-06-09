"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
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
import { useAuth } from "@/firebase";
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

const ADMIN_EMAIL = "admin@tribed.world";


export default function AdminLoginPage() {
  const auth = useAuth();
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
    if (values.email !== ADMIN_EMAIL) {
        setLoginStatus('error');
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: "Only admin users can log in here.",
        });
        setTimeout(() => setLoginStatus('idle'), 2000);
        return;
    }
    
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      setLoginStatus('success');
      setTimeout(() => {
        router.push("/admin");
      }, 1500);
    } catch (error: any) {
      setLoginStatus('error');
      toast({
        variant: "destructive",
        title: "Admin Login Failed",
        description: "Invalid credentials. Please try again.",
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
          <div className="h-20 w-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
             <ShieldCheck size={40} className="text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white uppercase tracking-[4px]">
                Control Hub
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[3px] text-white/20">System Administration</p>
          </div>
        </div>

        <AuthCard
          title="Terminal Access"
          description="Log in with root administrator credentials"
          footer={
            <Link
                href="/login"
                className="font-bold text-primary hover:text-white transition-colors underline-offset-4 hover:underline"
            >
                Return to User Portal
            </Link>
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
                      <FormLabel className="text-white/60">Admin Identifier</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                          <Input
                            placeholder="root@tribed.world"
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
                      <FormLabel className="text-white/60">Secure Key</FormLabel>
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
                <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 mt-4">
                  Authorize Entry
                </Button>
              </form>
            </Form>
          </fieldset>
        </AuthCard>
      </div>
    </main>
  );
}
