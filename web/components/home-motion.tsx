"use client";
import { useEffect } from "react";
import { mountHomeMotion } from "@/lib/home-motion-loader.mjs";
export function HomeMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".home");
    if (root) return mountHomeMotion(root);
  }, []);
  return null;
}
