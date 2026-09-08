"use client";

import React from "react";
import Link from "next/link";

const FOOTER_LINKS = [
  { name: "Home", path: "/" },
  { name: "Departments", path: "/departments" },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-white/10 bg-slate-900 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Branding */}
        <div className="flex flex-col items-center sm:items-start gap-1">
          <span className="text-blue-400 font-extrabold tracking-tight text-lg">GDG</span>
          <p className="text-slate-400 text-xs">
            © {year} GDG · Recruitment Portal. All rights reserved.
          </p>
        </div>

        {/* Links */}
        <nav className="flex items-center gap-4">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              className="text-sm text-slate-400 hover:text-blue-400 transition-colors duration-150"
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
