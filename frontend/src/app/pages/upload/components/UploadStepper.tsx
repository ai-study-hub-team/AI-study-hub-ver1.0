import { Check } from "lucide-react";
import type { UploadStep } from "../types";

const steps: Array<{ id: UploadStep; label: string }> = [
  { id: 1, label: "Select Files" },
  { id: 2, label: "Set Details" },
  { id: 3, label: "Upload Complete" },
];

interface UploadStepperProps {
  currentStep: UploadStep;
}

export function UploadStepper({ currentStep }: UploadStepperProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {steps.map((step, index) => {
        const isComplete = currentStep > step.id;
        const isActive = currentStep === step.id;

        return (
          <div key={step.id} className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold transition-all ${
                isComplete || isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
              }`}
            >
              {isComplete ? <Check className="h-5 w-5" /> : step.id}
            </div>
            <div>
              <p className={`text-sm font-bold ${isActive ? "text-blue-600" : "text-slate-700 dark:text-slate-300"}`}>
                {step.label}
              </p>
              <p className="text-xs text-slate-400">Step {step.id}</p>
            </div>
            {index < steps.length - 1 && (
              <div className="hidden h-px flex-1 bg-slate-200 dark:bg-slate-700 sm:block" />
            )}
          </div>
        );
      })}
    </div>
  );
}
