"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X } from "lucide-react";
import { formatPositionValue, formatPercent } from "@/utils/format";

interface CashBalanceEditorProps {
  value: number;
  weight: number;
  onSave: (value: number) => Promise<void>;
}

export default function CashBalanceEditor({
  value,
  weight,
  onSave,
}: CashBalanceEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleEditClick = () => {
    setInputValue(value > 0 ? value.toString() : "");
    setIsEditing(true);
  };

  const handleSave = useCallback(async () => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue) || numValue < 0) {
      setIsEditing(false);
      return;
    }
    try {
      await onSave(numValue);
      setIsEditing(false);
    } catch (error) {
      // 에러 발생 시 편집 모드 유지 (사용자가 재시도 가능)
      console.error("Failed to save cash balance:", error);
    }
  }, [inputValue, onSave]);

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    else if (e.key === "Escape") handleCancel();
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-600">현금</span>
      {isEditing ? (
        <div className="flex items-center gap-1">
          <span className="text-gray-400">$</span>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-24 border rounded px-2 py-1 text-sm"
            autoFocus
            placeholder="0"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleSave}
            className="text-green-600 hover:bg-green-50"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCancel}
            className="text-gray-400 hover:bg-gray-50"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <>
          <span className="text-gray-700">{formatPositionValue(value)}</span>
          <span className="text-gray-400 text-xs">{formatPercent(weight, 0)}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleEditClick}
            className="text-gray-400 hover:text-blue-600 hover:bg-blue-50"
            title="현금 수정"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}

