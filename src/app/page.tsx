
"use client";
import { useUser } from "@/firebase/auth/use-user";
import { redirect } from "next/navigation";

export default function Home() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    redirect("/login");
  }

  // Redirect to the dashboard which is now protected by its own layout
  redirect("/dashboard");
}
