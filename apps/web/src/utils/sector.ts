const SECTOR_LABEL_MAP: Record<string, string> = {
  Technology: "테크",
  Healthcare: "헬스케어",
  "Consumer Cyclical": "소비재",
  "Financial Services": "금융",
  "Consumer Defensive": "필수소비재",
  "Consumer Discretionary": "경기소비재",
  "Consumer Staples": "필수소비재",
  Industrials: "산업재",
  "Communication Services": "커뮤니케이션 서비스",
  Utilities: "유틸리티",
  "Real Estate": "부동산",
  "Basic Materials": "소재",
  Energy: "에너지",
};

type SectorFormat = {
  display: string;
  original: string | null;
};

export function formatSector(value?: string | null): SectorFormat {
  if (value === null || value === undefined) {
    return { display: "-", original: null };
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return { display: "-", original: null };
  }

  const translated = SECTOR_LABEL_MAP[trimmed] ?? trimmed;
  return {
    display: translated,
    original: trimmed,
  };
}
