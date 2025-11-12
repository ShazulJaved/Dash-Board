'use client';

import React from "react";
import { cn } from "@/lib/utils"; // optional: if you have className merging utility

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-3xl p-6 bg-white/60 dark:bg-slate-800/60 border border-white/30 dark:border-slate-700/30 shadow-xl backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:bg-white/70 dark:hover:bg-slate-800/70",
        className
      )}
    >
      {children}
    </div>
  );
}
