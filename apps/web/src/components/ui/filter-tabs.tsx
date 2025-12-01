"use client";

import { Button } from "./button";

interface FilterTab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface FilterTabsProps<T extends string> {
  tabs: FilterTab<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
}: FilterTabsProps<T>) {
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <Button
          key={tab.value}
          variant={value === tab.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(tab.value)}
          className={value === tab.value ? "bg-gray-900 hover:bg-gray-800" : ""}
        >
          {tab.label}
          {tab.count !== undefined && ` (${tab.count})`}
        </Button>
      ))}
    </div>
  );
}
