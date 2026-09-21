import { createRoleRoute } from "@/lib/admin-roles";

export const dynamic = "force-dynamic";

export const { GET, POST, DELETE } = createRoleRoute({
  redisKey: "ADMIN_EDITORS",
  dbRole: "EDITOR",
  label: "Editor",
});
