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

const INDUSTRY_LABEL_MAP: Record<string, string> = {
  // Technology
  "Software - Application": "애플리케이션 소프트웨어",
  "Software - Infrastructure": "인프라 소프트웨어",
  Semiconductors: "반도체",
  "Semiconductor Equipment & Materials": "반도체 장비/소재",
  "Consumer Electronics": "가전",
  "Electronic Components": "전자부품",
  "Computer Hardware": "컴퓨터 하드웨어",
  "Information Technology Services": "IT 서비스",
  "Internet Content & Information": "인터넷 콘텐츠",
  "Electronic Gaming & Multimedia": "게임/멀티미디어",

  // Healthcare
  Biotechnology: "바이오테크",
  "Drug Manufacturers - General": "대형 제약",
  "Drug Manufacturers - Specialty & Generic": "전문/제네릭 제약",
  "Medical Devices": "의료기기",
  "Medical Instruments & Supplies": "의료장비/용품",
  "Diagnostics & Research": "진단/연구",
  "Health Care Plans": "건강보험",
  "Medical Care Facilities": "의료시설",
  "Pharmaceutical Retailers": "약국 체인",

  // Financial Services
  "Banks - Diversified": "종합은행",
  "Banks - Regional": "지방은행",
  "Asset Management": "자산운용",
  "Capital Markets": "자본시장",
  "Insurance - Life": "생명보험",
  "Insurance - Property & Casualty": "손해보험",
  "Insurance - Diversified": "종합보험",
  "Credit Services": "신용서비스",
  "Financial Data & Stock Exchanges": "금융데이터/거래소",

  // Consumer
  "Internet Retail": "온라인 유통",
  "Specialty Retail": "전문 소매",
  "Home Improvement Retail": "홈인테리어 소매",
  "Apparel Retail": "의류 소매",
  Restaurants: "레스토랑",
  Leisure: "레저",
  "Resorts & Casinos": "리조트/카지노",
  "Travel Services": "여행 서비스",
  "Auto Manufacturers": "자동차 제조",
  "Auto Parts": "자동차 부품",
  "Residential Construction": "주택 건설",
  "Household & Personal Products": "생활용품",
  "Packaged Foods": "가공식품",
  "Beverages - Non-Alcoholic": "음료",
  "Beverages - Alcoholic": "주류",
  Tobacco: "담배",
  "Discount Stores": "할인점",
  "Grocery Stores": "식료품점",

  // Industrials
  "Aerospace & Defense": "항공우주/방위",
  Airlines: "항공사",
  Railroads: "철도",
  Trucking: "트럭운송",
  "Integrated Freight & Logistics": "물류",
  "Waste Management": "폐기물 관리",
  "Industrial Distribution": "산업재 유통",
  "Specialty Industrial Machinery": "산업기계",
  "Farm & Heavy Construction Machinery": "농기계/건설기계",
  "Building Products & Equipment": "건축자재",
  "Electrical Equipment & Parts": "전기장비",
  "Engineering & Construction": "엔지니어링/건설",
  "Consulting Services": "컨설팅",
  "Staffing & Employment Services": "인력서비스",

  // Communication Services
  "Telecom Services": "통신서비스",
  Entertainment: "엔터테인먼트",
  Broadcasting: "방송",
  "Advertising Agencies": "광고대행",
  Publishing: "출판",

  // Energy
  "Oil & Gas Integrated": "석유/가스 종합",
  "Oil & Gas E&P": "석유/가스 탐사/생산",
  "Oil & Gas Midstream": "석유/가스 중류",
  "Oil & Gas Refining & Marketing": "석유 정제/판매",
  "Oil & Gas Equipment & Services": "석유/가스 장비",
  Uranium: "우라늄",
  Solar: "태양광",

  // Utilities
  "Utilities - Regulated Electric": "규제 전력",
  "Utilities - Renewable": "재생에너지",
  "Utilities - Diversified": "종합 유틸리티",

  // Real Estate
  "REIT - Diversified": "종합 리츠",
  "REIT - Industrial": "산업용 리츠",
  "REIT - Retail": "리테일 리츠",
  "REIT - Residential": "주거용 리츠",
  "REIT - Office": "오피스 리츠",
  "REIT - Healthcare Facilities": "헬스케어 리츠",
  "REIT - Specialty": "특수 리츠",
  "Real Estate - Development": "부동산 개발",
  "Real Estate Services": "부동산 서비스",

  // Basic Materials
  Gold: "금",
  Silver: "은",
  Copper: "구리",
  Steel: "철강",
  Aluminum: "알루미늄",
  Chemicals: "화학",
  "Specialty Chemicals": "특수화학",
  "Agricultural Inputs": "농업투입재",
  "Paper & Paper Products": "제지",
  "Lumber & Wood Production": "목재",
};

type FormatResult = {
  display: string;
  original: string | null;
};

export function formatSector(value?: string | null): FormatResult {
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

export function formatIndustry(value?: string | null): FormatResult {
  if (value === null || value === undefined) {
    return { display: "-", original: null };
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return { display: "-", original: null };
  }

  const translated = INDUSTRY_LABEL_MAP[trimmed] ?? trimmed;
  return {
    display: translated,
    original: trimmed,
  };
}
