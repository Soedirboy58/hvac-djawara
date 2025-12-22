"use client";

import { CheckCircle2, Circle, Clock } from "lucide-react";

interface TimelineStep {
  status: "completed" | "current" | "pending";
  label: string;
  description?: string;
}

interface OrderTimelineProps {
  steps: TimelineStep[];
}

export default function OrderTimeline({ steps }: OrderTimelineProps) {
  return (
    <div className="flex items-start w-full py-2 overflow-hidden">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center flex-1 min-w-0">
          {/* Step Icon */}
          <div className="flex flex-col items-center flex-shrink-0">
            {step.status === "completed" ? (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            ) : step.status === "current" ? (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-300 flex items-center justify-center">
                <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </div>
            )}
            <span className="mt-1 text-center font-medium leading-tight whitespace-nowrap text-[11px] sm:text-xs">
              {step.label}
            </span>
          </div>
          
          {/* Connector Line */}
          {index < steps.length - 1 && (
            <div
              className={`h-0.5 flex-1 min-w-[10px] mx-1 sm:mx-2 ${
                step.status === "completed" ? "bg-green-500" : "bg-gray-300"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
