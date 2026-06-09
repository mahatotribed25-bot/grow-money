"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ReactNode } from "react";

type AuthCardProps = {
  title: ReactNode;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <div className="relative w-full">
        {/* Subtle outer glow */}
        <div className="absolute -inset-1 rounded-3xl bg-primary/20 blur-2xl pointer-events-none" />
        
        <Card className="w-full relative bg-white/[0.03] backdrop-blur-2xl border-white/[0.08] shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="text-center pt-8">
                <CardTitle className="text-2xl font-bold tracking-tight text-white">{title}</CardTitle>
                <CardDescription className="text-white/40">{description}</CardDescription>
            </CardHeader>
            <CardContent className="pb-8">{children}</CardContent>
            <CardFooter className="flex flex-col items-center justify-center gap-4 text-sm text-white/40 pb-8 border-t border-white/[0.05] bg-black/20">
                {footer}
            </CardFooter>
        </Card>
    </div>
  );
}
