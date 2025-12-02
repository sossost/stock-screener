"use client";

import { useState, useRef, useEffect } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAdvisor } from "./AIAdvisor";
import type { AIAdvisorResponse } from "@/types/ai-advisor";

interface AIAdvisorModalProps {
  symbol: string;
  currentPrice: number | null;
  data: AIAdvisorResponse | null;
  isLoading: boolean;
  error: string | null;
  onAnalyze: () => void;
}

export function AIAdvisorModal({
  symbol,
  currentPrice,
  data,
  isLoading,
  error,
  onAnalyze,
}: AIAdvisorModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // 초기 위치 설정 (오른쪽에 배치하여 차트를 가리지 않도록)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const MODAL_WIDTH = 700;
    const MODAL_PADDING = 24;
    const INITIAL_Y = 100;

    setPosition({
      x: window.innerWidth - MODAL_WIDTH - MODAL_PADDING,
      y: INITIAL_Y,
    });
  }, []);

  // 분석이 완료되면 자동으로 모달 열기
  useEffect(() => {
    if (data && !isLoading && !error) {
      setIsOpen(true);
    }
  }, [data, isLoading, error]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!modalRef.current) return;
    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !modalRef.current) return;

      const modalWidth = modalRef.current.offsetWidth;
      const modalHeight = modalRef.current.offsetHeight;
      const maxX = window.innerWidth - modalWidth;
      const maxY = window.innerHeight - modalHeight;

      setPosition({
        x: Math.max(0, Math.min(e.clientX - dragOffset.x, maxX)),
        y: Math.max(0, Math.min(e.clientY - dragOffset.y, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleAnalyze = () => {
    onAnalyze();
  };

  if (!isOpen && !data) {
    // 플로팅 버튼만 표시
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleAnalyze}
          disabled={!symbol || !currentPrice || isLoading}
          className="h-auto px-4 py-3 rounded-full bg-purple-500 hover:bg-purple-600 shadow-lg gap-2"
          title="AI 트레이딩 분석"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">AI 분석</span>
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* 플로팅 버튼 (모달이 열려있을 때는 숨김) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            disabled={!data && isLoading}
            className="h-auto px-4 py-3 rounded-full bg-purple-500 hover:bg-purple-600 shadow-lg gap-2"
            title="분석 결과 보기"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">AI 분석</span>
          </Button>
        </div>
      )}

      {/* 드래그 가능한 모달 */}
      {isOpen && (
        <div
          ref={modalRef}
          className="fixed z-50 w-[700px] max-w-[95vw] bg-white rounded-lg border shadow-2xl select-none flex flex-col"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            cursor: isDragging ? "grabbing" : "default",
            maxHeight: "90vh",
          }}
        >
          {/* 드래그 핸들 (헤더) - 컴팩트하게 */}
          <div
            onMouseDown={handleMouseDown}
            className="flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing bg-gray-50 rounded-t-lg"
          >
            <h3 className="font-semibold text-sm">AI 트레이딩 어드바이저</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 p-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* 모달 내용 - 스크롤 최소화 */}
          <div className="overflow-y-auto flex-1">
            <AIAdvisor
              symbol={symbol}
              data={data}
              isLoading={isLoading}
              error={error}
            />
          </div>
        </div>
      )}
    </>
  );
}
