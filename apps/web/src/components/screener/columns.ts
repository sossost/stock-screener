import type { ScreenerCompany } from "@/types/golden-cross";

export type SortKey =
  | "symbol"
  | "market_cap"
  | "last_close"
  | "pe_ratio"
  | "peg_ratio"
  | "rs_score";

export type ScreenerColumn = {
  key:
    | "index"
    | "symbol"
    | "market_cap"
    | "last_close"
    | "rs_score"
    | "pe_ratio"
    | "peg_ratio"
    | "revenue"
    | "eps"
    | "actions";
  label: string;
  width?: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  sortKey?: SortKey;
  tooltip?: string;
  type?: "text" | "chart" | "action";
  skeletonWidth?: string;
};

export const screenerColumns: ScreenerColumn[] = [
  { key: "index", label: "#", width: "w-[48px]", align: "center", type: "text", skeletonWidth: "w-6" },
  {
    key: "symbol",
    label: "종목",
    sortable: true,
    sortKey: "symbol",
    tooltip: "종목 코드로 정렬합니다.\n클릭 시 오름/내림차순이 바뀝니다.",
    type: "text",
    skeletonWidth: "w-16",
  },
  {
    key: "market_cap",
    label: "시가총액",
    width: "w-[180px]",
    align: "right",
    sortable: true,
    sortKey: "market_cap",
    type: "text",
    skeletonWidth: "w-20",
  },
  {
    key: "last_close",
    label: "종가",
    width: "w-[120px]",
    align: "right",
    sortable: true,
    sortKey: "last_close",
    type: "text",
    skeletonWidth: "w-20",
  },
  {
    key: "rs_score",
    label: "RS",
    width: "w-[90px]",
    align: "right",
    sortable: true,
    sortKey: "rs_score",
    tooltip:
      "상대강도(RS): 최근 12/6/3개월 성과를 가중합(0.4/0.35/0.25)한 점수입니다.\n높을수록 최근까지 상대적으로 강한 흐름입니다.",
    type: "text",
    skeletonWidth: "w-16",
  },
  {
    key: "pe_ratio",
    label: "PER",
    width: "w-[90px]",
    align: "right",
    sortable: true,
    sortKey: "pe_ratio",
    tooltip:
      "주가수익비율(PER) 기준으로 정렬합니다.\n낮은 PER은 이익 대비 주가가 낮다는 뜻입니다(업종별로 해석이 다를 수 있음).",
    type: "text",
    skeletonWidth: "w-16",
  },
  {
    key: "peg_ratio",
    label: "PEG",
    width: "w-[90px]",
    align: "right",
    sortable: true,
    sortKey: "peg_ratio",
    tooltip:
      "성장 대비 밸류에이션(PEG) 기준으로 정렬합니다.\n1 미만이면 성장률 대비 저평가일 가능성이 있습니다.",
    type: "text",
    skeletonWidth: "w-16",
  },
  {
    key: "revenue",
    label: "매출 (8Q)",
    width: "w-[160px]",
    align: "right",
    type: "chart",
  },
  {
    key: "eps",
    label: "EPS (8Q)",
    width: "w-[160px]",
    align: "right",
    type: "chart",
  },
  { key: "actions", label: "", width: "w-[80px]", align: "center", type: "action" },
];

export const defaultSort: { key: SortKey; direction: "asc" | "desc" } = {
  key: "market_cap",
  direction: "desc",
};

export type ScreenerRow = ScreenerCompany;
