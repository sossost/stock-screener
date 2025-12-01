"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface PopupPortalProps {
  children: React.ReactNode;
  position: { x: number; y: number } | null;
}

export function PopupPortal({ children, position }: PopupPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !position) return null;

  return createPortal(
    <div
      className="fixed z-[9999] bg-white border shadow-xl rounded-md"
      style={{
        left: position.x,
        top: position.y + 8,
        transform: "translateX(-50%)",
      }}
    >
      {children}
    </div>,
    document.body
  );
}
