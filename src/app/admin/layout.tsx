'use client';

import { Sidebar } from "@/components/sidebar";


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pl-4 pt-4 flex relative overflow-hidden ">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 relative z-10 
       top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-purple-900/90 to-emerald-800/40">
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
