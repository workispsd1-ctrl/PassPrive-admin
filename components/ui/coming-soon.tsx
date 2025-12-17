// src/components/ComingSoon.tsx
"use client";

import React from "react";
import { Hourglass } from "lucide-react";

export default function ComingSoon() {
  return (
    <div className="flex flex-col justify-center items-center text-gray-900 p-4">
      <Hourglass className="w-16 h-16 text-blue-600 mb-6 animate-pulse" />
      <h1 className="text-5xl font-extrabold mb-4">Coming Soon</h1>
      <p className="text-lg text-gray-700 max-w-md text-center">
        We’re hard at work on something awesome. Stay tuned!
      </p>
    </div>
  );
}
