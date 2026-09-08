"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.4) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full opacity-10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500 rounded-full opacity-10 blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Badge */}
        <span className="inline-block mb-6 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase rounded-full border border-blue-400/40 text-blue-300 bg-blue-500/10 backdrop-blur">
          GDG · Recruitment 2026
        </span>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white leading-tight tracking-tight mb-6">
          Ready to make{" "}
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            your mark?
          </span>
        </h1>

        {/* Subtext */}
        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Join our departments and work on real-world projects that impact thousands of students.
          Your journey starts here.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/departments">
            <button
              type="button"
              className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base shadow-lg shadow-blue-700/40 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105 active:scale-100"
            >
              Apply Now
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </button>
          </Link>
          <Link href="/departments">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-slate-500 text-slate-300 hover:border-blue-400 hover:text-blue-300 font-semibold text-base transition-all duration-200 hover:bg-blue-500/10"
            >
              Explore Departments
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
