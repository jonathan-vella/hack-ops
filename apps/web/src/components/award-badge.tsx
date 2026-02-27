import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const AWARD_STYLES: Record<string, string> = {
  "Fastest to Complete":
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Perfect Score":
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

const DEFAULT_AWARD_STYLE =
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";

interface AwardBadgeProps {
  label: string;
  className?: string;
}

export function AwardBadge({ label, className }: AwardBadgeProps) {
  const style = AWARD_STYLES[label] ?? DEFAULT_AWARD_STYLE;

  return <Badge className={cn(style, className)}>{label}</Badge>;
}
