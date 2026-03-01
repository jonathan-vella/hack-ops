"use client";

import { useState } from "react";
import type { RubricCategory } from "@hackops/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, TrashIcon } from "lucide-react";

function emptyCategory(): RubricCategory {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    maxScore: 10,
  };
}

interface RubricFormProps {
  initialCategories?: RubricCategory[];
  onSubmit: (categories: RubricCategory[]) => Promise<void>;
  submitLabel?: string;
}

export function RubricForm({
  initialCategories,
  onSubmit,
  submitLabel = "Create Rubric",
}: RubricFormProps) {
  const [categories, setCategories] = useState<RubricCategory[]>(
    initialCategories ?? [emptyCategory()],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateCategory(index: number, field: keyof RubricCategory, value: string | number) {
    setCategories((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  }

  function addCategory() {
    setCategories((prev) => [...prev, emptyCategory()]);
  }

  function removeCategory(index: number) {
    setCategories((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = categories.every((c) => c.name.trim() && c.maxScore > 0);
    if (!valid) {
      setError("All categories need a name and max score > 0");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rubric");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {categories.map((cat, index) => (
        <Card key={cat.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Category {index + 1}</CardTitle>
            {categories.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeCategory(index)}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Category name"
              value={cat.name}
              onChange={(e) => updateCategory(index, "name", e.target.value)}
              required
            />
            <Input
              placeholder="Description"
              value={cat.description}
              onChange={(e) =>
                updateCategory(index, "description", e.target.value)
              }
            />
            <Input
              type="number"
              placeholder="Max score"
              min={1}
              value={cat.maxScore}
              onChange={(e) =>
                updateCategory(index, "maxScore", Number(e.target.value))
              }
              required
            />
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={addCategory}>
        <PlusIcon className="mr-1 h-4 w-4" />
        Add Category
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
