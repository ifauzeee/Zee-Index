"use client";

import dynamic from "next/dynamic";
import Loading from "@/components/common/Loading";

const SearchResultsList = dynamic(
  () => import("@/components/features/SearchResultsList"),
  {
    ssr: false,
    loading: () => <Loading />,
  },
);

export default function SearchPage() {
  return <SearchResultsList />;
}
