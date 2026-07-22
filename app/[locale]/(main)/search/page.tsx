"use client";

import dynamic from "next/dynamic";
import { SearchResultsSkeleton } from "@/components/common/skeletons/SearchResultsSkeleton";

const SearchResultsList = dynamic(
  () => import("@/components/features/SearchResultsList"),
  {
    ssr: false,
    loading: () => <SearchResultsSkeleton />,
  },
);

export default function SearchPage() {
  return <SearchResultsList />;
}
