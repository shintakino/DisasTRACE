"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";

export default function MobileSignInPage() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { error } = await signIn.password({
        identifier: email,
        password: password,
      });

      if (error) {
        toast.error(error.message || "Failed to sign in.");
        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            router.push(decorateUrl("/dashboard"));
          },
        });
      }
    } catch (err) {
      console.error("Mobile sign in error:", err);
      toast.error("An unexpected error occurred.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Mobile User Login</h1>
          <p className="mt-2 text-sm text-slate-600">Temporary page for testing Public/Responder accounts</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@disastrace.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            disabled={fetchStatus === "fetching"}
            className="w-full h-12 rounded-xl"
          >
            {fetchStatus === "fetching" ? <Loader2 className="animate-spin" /> : "Sign In"}
          </Button>
        </form>

        <div className="text-center text-xs text-slate-500">
          <Link href="/sign-in" className="text-blue-600 hover:underline">
            Back to Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}
