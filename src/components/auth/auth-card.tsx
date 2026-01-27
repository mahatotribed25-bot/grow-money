
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
  title: string;
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
        <div className="absolute -inset-0.5 rounded-lg bg-[conic-gradient(from_180deg_at_50%_50%,hsl(var(--chart-1)),hsl(var(--chart-2)),hsl(var(--chart-3)),hsl(var(--chart-4)),hsl(var(--chart-5)),hsl(var(--chart-1)))] animate-border-spin" />
        <Card className="w-full relative">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
            <CardFooter className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                {footer}
            </CardFooter>
        </Card>
    </div>
  );
}
