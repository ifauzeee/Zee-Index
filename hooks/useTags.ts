"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTags, addTag, removeTag } from "@/app/actions/tags";

export function useTagsQuery(fileId: string | undefined | null) {
  return useQuery<string[]>({
    queryKey: ["tags", fileId],
    queryFn: async () => {
      const data = await getTags(fileId!);
      return data.tags || [];
    },
    enabled: !!fileId,
  });
}

export function useTagMutation(fileId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["tags", fileId] as const;

  return useMutation({
    mutationFn: async ({
      tag,
      action,
    }: {
      tag: string;
      action: "add" | "remove";
    }) => {
      return action === "add"
        ? await addTag(fileId, tag)
        : await removeTag(fileId, tag);
    },
    onMutate: async ({ tag, action }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<string[]>(queryKey);
      queryClient.setQueryData<string[]>(queryKey, (old = []) => {
        if (action === "add") {
          return old.includes(tag) ? old : [...old, tag];
        }
        return old.filter((t) => t !== tag);
      });
      return { previous };
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
