"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { KeyRound, Lock, Mail } from "lucide-react";
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
    <main className="flex min-h-screen w-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center space-y-2 text-center">
          <LoginStatusAnimation status={loginStatus} />
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Grow Money 💰
          </h1>
        </div>
        <AuthCard
          title="Admin Portal"
          description="Log in with your administrator credentials"
          footer={
            <p>
              Not an admin?{" "}
              <Link
                href="/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                User Login
              </Link>
            </p>
          }
        >
          <fieldset disabled={loginStatus === 'loading' || loginStatus === 'success'}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="admin@example.com"
                            {...field}
                            className="pl-10"
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                            className="pl-10"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loginStatus === 'loading' || loginStatus === 'success'}>
                  Log In as Admin
                </Button>
              </form>
            </Form>
          </fieldset>
        </AuthCard>
      </div>
    </main>
  );
}
