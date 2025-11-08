import { redirect } from "next/navigation";

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

const GoldenCrossPage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const resolvedParams = await searchParams;
  
  // 쿼리 파라미터를 유지하면서 메인 페이지로 리다이렉트
  const params = new URLSearchParams();
  Object.entries(resolvedParams).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v));
      } else {
        params.set(key, value);
      }
    }
  });

  const queryString = params.toString();
  redirect(`/${queryString ? `?${queryString}` : ""}`);
};

export default GoldenCrossPage;
