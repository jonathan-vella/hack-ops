import type { GradeBadge as GradeBadgeType } from "@hackops/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const GRADE_STYLES: Record<GradeBadgeType, string> = {
  A: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  B: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  C: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  D: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

interface GradeBadgeProps {
  grade: GradeBadgeType;
  className?: string;
}

export function GradeBadge({ grade, className }: GradeBadgeProps) {
  return (
    <Badge className={cn(GRADE_STYLES[grade], "font-bold", className)}>
      {grade}
    </Badge>
  );
}
