"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config/constants";
import { LogEntry } from "@/types/etl";
import { StateMessage } from "@/components/common/StateMessage";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LogsResponse {
  success: boolean;
  data: {
    logs: LogEntry[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    };
    filters: {
      job: string;
      level: string;
    };
  };
}

async function getETLLogs(
  job: string = "all",
  level: string = "all",
  limit: number = 50
): Promise<LogsResponse | null> {
  try {
    const params = new URLSearchParams({
      job,
      level,
      limit: limit.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/api/etl/logs?${params}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch ETL logs");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching ETL logs:", error);
    return null;
  }
}

function getLevelColor(level: string) {
  switch (level) {
    case "error":
      return "text-red-600 bg-red-50 border-red-200";
    case "warn":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "info":
      return "text-blue-600 bg-blue-50 border-blue-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

function getLevelIcon(level: string) {
  switch (level) {
    case "error":
      return "❌";
    case "warn":
      return "⚠️";
    case "info":
      return "ℹ️";
    default:
      return "📝";
  }
}

function getJobColor(job: string) {
  switch (job) {
    case "symbols":
      return "bg-blue-100 text-blue-800";
    case "daily-prices":
      return "bg-green-100 text-green-800";
    case "daily-ma":
      return "bg-purple-100 text-purple-800";
    case "ratios":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function ETLLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const response = await getETLLogs(selectedJob, selectedLevel, limit);
      if (response?.success) {
        setLogs(response.data.logs);
        setError(null);
      } else {
        setLogs([]);
        setError("로그를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
      setLoading(false);
    };

    fetchLogs();
  }, [selectedJob, selectedLevel, limit]);

  if (loading) {
    return <StateMessage title="로그를 불러오는 중입니다" />;
  }

  if (error) {
    return (
      <StateMessage
        variant="error"
        title="로그를 불러오지 못했습니다"
        description={error}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            작업 타입
          </label>
          <Select value={selectedJob} onValueChange={setSelectedJob}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="symbols">심볼</SelectItem>
              <SelectItem value="daily-prices">일일 주가</SelectItem>
              <SelectItem value="daily-ma">이동평균</SelectItem>
              <SelectItem value="ratios">재무 비율</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            로그 레벨
          </label>
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="info">정보</SelectItem>
              <SelectItem value="warn">경고</SelectItem>
              <SelectItem value="error">에러</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            표시 개수
          </label>
          <Select
            value={String(limit)}
            onValueChange={(v) => setLimit(parseInt(v, 10))}
          >
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25개</SelectItem>
              <SelectItem value="50">50개</SelectItem>
              <SelectItem value="100">100개</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 로그 목록 */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <StateMessage
            title="로그가 없습니다"
            description="필터를 변경하거나 나중에 다시 확인해 주세요."
          />
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`border rounded-lg p-3 ${getLevelColor(log.level)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{getLevelIcon(log.level)}</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getJobColor(
                        log.job
                      )}`}
                    >
                      {log.job}
                    </span>
                    <span className="text-xs opacity-75">
                      {new Date(log.timestamp).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{log.message}</p>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-2 text-xs opacity-75">
                      <details>
                        <summary className="cursor-pointer">메타데이터</summary>
                        <pre className="mt-1 p-2 bg-black bg-opacity-10 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 새로고침 버튼 */}
      <div className="text-center">
        <Button
          variant="outline"
          onClick={() => {
            setLoading(true);
            getETLLogs(selectedJob, selectedLevel, limit).then((response) => {
              if (response?.success) {
                setLogs(response.data.logs);
                setError(null);
              } else {
                setLogs([]);
                setError(
                  "로그를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
                );
              }
              setLoading(false);
            });
          }}
        >
          새로고침
        </Button>
      </div>
    </div>
  );
}
