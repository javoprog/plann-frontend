"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function useCategoryFilter(basePath: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoryId") ?? "all";

  const changeCategory = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") params.delete("categoryId");
      else params.set("categoryId", value);
      const query = params.toString();
      router.replace(`${basePath}${query ? `?${query}` : ""}`, {
        scroll: false,
      });
    },
    [basePath, router, searchParams],
  );

  return { categoryId, changeCategory, searchParams };
}
