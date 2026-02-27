"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HackathonOption {
  id: string;
  name: string;
}

interface HackathonPickerProps {
  hackathons: HackathonOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function HackathonPicker({
  hackathons,
  value,
  onValueChange,
  placeholder = "Select hackathon",
  className,
}: HackathonPickerProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {hackathons.map((h) => (
          <SelectItem key={h.id} value={h.id}>
            {h.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
