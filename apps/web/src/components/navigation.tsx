"use client";

import Link from "next/link";
import { Star, BookOpen, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavigationProps {
  showPortfolioButton?: boolean;
  showTradesButton?: boolean;
}

export function Navigation({
  showPortfolioButton = true,
  showTradesButton = true,
}: NavigationProps) {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-xl font-bold text-slate-900 cursor-pointer">
              주식 스크리너
            </h1>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/alerts">
              <Button variant="outline" size="sm" className="gap-2">
                <Bell className="h-4 w-4" />
                가격 알림
              </Button>
            </Link>
            {showTradesButton && (
              <Link href="/trades">
                <Button variant="outline" size="sm" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  매매일지
                </Button>
              </Link>
            )}
            <Link
              href="/watchlist"
              className={
                showPortfolioButton ? "" : "invisible pointer-events-none"
              }
            >
              <Button variant="outline" size="sm" className="gap-2">
                <Star className="h-4 w-4" />
                관심종목
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
