import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepDefinition {
  label: string;
}

export function Stepper({ steps, current }: { steps: StepDefinition[]; current: number }) {
  return (
    <ol className="flex items-center">
      {steps.map((step, index) => {
        const isCompleted = index < current;
        const isActive = index === current;

        return (
          <li key={step.label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors duration-300",
                  isCompleted && "border-primary bg-primary text-primary-foreground",
                  isActive && "border-primary text-primary",
                  !isCompleted && !isActive && "border-muted-foreground/25 text-muted-foreground",
                )}
              >
                {isCompleted ? <Check className="size-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  "hidden text-center text-xs font-medium whitespace-nowrap sm:block",
                  (isActive || isCompleted) && "text-foreground",
                  !isActive && !isCompleted && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 flex-1 rounded-full transition-colors duration-300 sm:mb-5",
                  isCompleted ? "bg-primary" : "bg-muted-foreground/20",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
