"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Gift, KeyRound, Lock, Mail, User } from "lucide-react";
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
  writeBatch,
  getDoc,
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
import { useAuth, useFirestore, useDoc } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

type AdminSettings = {
  signupBonus?: number;
  referralBonus?: number;
};


const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
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
  
  const { data: adminSettings } = useDoc<AdminSettings>('settings/admin');


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

      const signupBonus = adminSettings?.signupBonus || 0;
      const referralBonus = adminSettings?.referralBonus || 0;
      let initialBalance = 0;
      let referredBy = null;

      if (values.referralCode) {
        const usersRef = collection(firestore, "users");
        const q = query(usersRef, where("referralCode", "==", values.referralCode));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const referrerDoc = querySnapshot.docs[0];
          referredBy = referrerDoc.id;
          initialBalance = signupBonus; // New user gets signup bonus

          // Give referral bonus to the referrer
          const referrerRef = doc(firestore, "users", referredBy);
          const referrerData = referrerDoc.data();
          const newReferrerBalance = (referrerData.walletBalance || 0) + referralBonus;
          
          await setDoc(referrerRef, { walletBalance: newReferrerBalance }, { merge: true });

           toast({
            title: "Referral Applied!",
            description: `You received a signup bonus of ₹${signupBonus}!`,
          });

        } else {
          toast({
            variant: "destructive",
            title: "Invalid Referral Code",
            description: "The referral code you entered is not valid.",
          });
          // We can decide to stop registration or allow it without bonus.
          // For now, let's allow it but without the bonus.
        }
      }

      await setDoc(doc(firestore, "users", user.uid), {
        uid: user.uid,
        name: values.name,
        email: values.email,
        walletBalance: initialBalance,
        totalInvestment: 0,
        totalIncome: 0,
        referralCode: generateReferralCode(),
        referredBy: referredBy,
      });

      router.push("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message,
      });
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center space-y-2 text-center">
          <KeyRound className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            grow money 💰💰🤑🤑
          </h1>
        </div>
        <AuthCard
          title="Create an Account"
          description="Join grow money to get started"
          footer={
            <p>
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
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
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="John Doe"
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
               <FormField
                control={form.control}
                name="referralCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referral Code (Optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Gift className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Enter referral code"
                          {...field}
                          className="pl-10"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Create Account
              </Button>
            </form>
          </Form>
        </AuthCard>
      </div>
    </main>
  );
}
