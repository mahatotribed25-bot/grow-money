"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Gift, Lock, Mail, User } from "lucide-react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  doc,
  setDoc,
  runTransaction,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

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
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  referralCode: z.string().optional(),
});

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}


export default function RegisterPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      referralCode: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: values.name,
      });
      
      let referredBy = null;

      if (values.referralCode) {
        const usersRef = collection(firestore, "users");
        const q = query(usersRef, where("referralCode", "==", values.referralCode));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const referrerDoc = querySnapshot.docs[0];
          referredBy = referrerDoc.id;
          
          toast({
            title: "Referral Applied!",
            description: `You were referred by a user!`,
          });

        } else {
          toast({
            variant: "destructive",
            title: "Invalid Referral Code",
            description: "The referral code you entered is not valid, but you can still register.",
          });
        }
      }

      await setDoc(doc(firestore, "users", user.uid), {
        uid: user.uid,
        name: values.name,
        email: values.email,
        walletBalance: 0,
        totalInvestment: 0,
        totalIncome: 0,
        referralCode: generateReferralCode(),
        referredBy: referredBy,
        status: 'Active',
        kycStatus: 'Not Submitted',
        upiStatus: 'Unverified',
        createdAt: serverTimestamp(),
        trustScore: 500,
        vipLevel: 'Bronze'
      });

      router.push("/");
    } catch (error: any) {
       let errorMessage = "An unexpected error occurred.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "This email address is already in use by another account.";
        }
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: errorMessage,
      });
    }
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center bg-[#030408] p-4 overflow-hidden">
      {/* Background Glow Blobs */}
      <div className="fixed top-[-10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none animate-pulse z-0" />
      <div className="fixed bottom-[-10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center space-y-4 text-center">
          <LoginStatusAnimation status={'idle'} />
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-white drop-shadow-2xl">
                Grow Money
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[5px] text-primary">Join the Network</p>
          </div>
        </div>

        <AuthCard
          title="Create Account"
          description="Start your journey to financial growth"
          footer={
            <p>
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-primary hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                Log In
              </Link>
            </p>
          }
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/60">Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                        <Input
                          placeholder="John Doe"
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
               <FormField
                control={form.control}
                name="referralCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/60">Referral Code (Optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Gift className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                        <Input
                          placeholder="ENTER CODE"
                          {...field}
                          className="pl-10 bg-white/5 border-white/10 rounded-xl h-11 font-mono tracking-widest focus:ring-primary text-white"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 mt-4">
                Establish My Account
              </Button>
            </form>
          </Form>
        </AuthCard>
      </div>
    </main>
  );
}
