"use client";
import React from "react";
import { AuthPage } from "@/components/auth/AuthPage";
import { TimeTrackerApp } from "@/components/TimeTrackerApp";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { isAuthenticated } = useAuth();

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Show the main app if authenticated
  return <TimeTrackerApp />;
}