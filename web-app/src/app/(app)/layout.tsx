"use client";

import { useState } from "react";
import TopNav from "@/components/layout/TopNav";
import AskDrawer from "@/components/layout/ChatDrawer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="min-h-screen">
      <TopNav onChatToggle={() => setShowChat((v) => !v)} />
      <main className="bg-[var(--background)] pt-14">{children}</main>
      <AskDrawer open={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
}
