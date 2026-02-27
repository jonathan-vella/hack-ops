"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface PaginationBarProps {
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

export function PaginationBar({
  hasNext,
  hasPrevious,
  onNext,
  onPrevious,
  isLoading,
}: PaginationBarProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={!hasPrevious || isLoading}
      >
        <ChevronLeftIcon className="mr-1 h-4 w-4" />
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={!hasNext || isLoading}
      >
        Next
        <ChevronRightIcon className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}
