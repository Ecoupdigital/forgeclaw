"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OnboardingLayoutProps {
  chat: React.ReactNode;
  preview: React.ReactNode;
  actions: React.ReactNode;
}

/**
 * Split-pane layout with mobile fallback.
 *
 * Desktop (>=768px): chat | preview, actions across full width at bottom.
 * Mobile (<768px): tabs switch between chat and preview, actions stay on bottom.
 */
export function OnboardingLayout({ chat, preview, actions }: OnboardingLayoutProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (isDesktop) {
    return (
      <div className="flex h-full flex-col">
        <div className="grid flex-1 grid-cols-[minmax(320px,1fr)_1.2fr] overflow-hidden">
          {chat}
          {preview}
        </div>
        {actions}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="chat" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-3 my-2 flex w-fit gap-1 bg-transparent">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="flex-1 overflow-hidden">
          {chat}
        </TabsContent>
        <TabsContent value="preview" className="flex-1 overflow-hidden">
          {preview}
        </TabsContent>
      </Tabs>
      {actions}
    </div>
  );
}
