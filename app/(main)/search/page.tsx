"use client";

import dynamic from "next/dynamic";
import Loading from "@/components/Loading";

const SearchResultsList = dynamic(
  () => import("@/components/SearchResultsList"),
  {
    ssr: false,
    loading: () => <Loading />,
  },
);

export default function SearchPage() {
  return <SearchResultsList />;
}
