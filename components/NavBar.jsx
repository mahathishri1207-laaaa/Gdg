"use client";
import React from "react";
import Link from "next/link";
import UserButton from "./UserButton";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";

const NavBar = () => {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const user = session?.user;
  const isAdmin = user?.role === "admin";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg text-white hover:text-blue-400 transition-colors"
        >
          <span className="text-blue-400 font-extrabold tracking-tight">GDG</span>
          <span className="hidden sm:inline text-slate-300 font-medium text-sm">
            Recruitment Portal
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/departments"
            className="px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-150"
          >
            Departments
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="px-3 py-1.5 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 rounded-lg transition-all duration-150 font-medium"
            >
              Admin
            </Link>
          )}

          {/* Auth area */}
          {isPending ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          ) : !user ? (
            <Link href="/auth/signin">
              <button
                type="button"
                className="px-4 py-1.5 text-sm font-semibold rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all duration-150 shadow shadow-blue-700/40"
              >
                Sign In
              </button>
            </Link>
          ) : (
            <UserButton user={user} />
          )}
        </div>
      </nav>
    </header>
  );
};

export default NavBar;

