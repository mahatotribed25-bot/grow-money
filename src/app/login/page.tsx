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

      // Check if user is blocked
      const userDocRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().status === 'Blocked') {
        await auth.signOut(); // Sign out the blocked user
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
    <main className="flex min-h-screen w-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center space-y-2 text-center">
          <LoginStatusAnimation status={loginStatus} />
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Grow Money 💰
          </h1>
        </div>
        <AuthCard
          title={
            <>
              Welcome Back
              <p className="text-xl font-normal mt-1">नमस्ते</p>
            </>
          }
          description="Log in to your Grow Money account"
          footer={
            <>
              <p>
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Register
                </Link>
              </p>
              <p>
                Are you an admin?{" "}
                <Link
                  href="/admin/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Admin Login
                </Link>
              </p>
            </>
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
                            placeholder="name@example.com"
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
                  Log In
                </Button>
              </form>
            </Form>
          </fieldset>
        </AuthCard>
      </div>
    </main>
  );
}
