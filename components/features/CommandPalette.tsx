"use client";
import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  HardDrive,
  Sun,
  Moon,
  LogOut,
  Search,
  Star,
  Home,
  Github,
  Send,
  File,
  Folder,
  Loader2,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const { user } = useAppStore();
  const { theme, setTheme } = useTheme();
  const t = useTranslations("CommandPalette");
  const commonT = useTranslations("Common");

  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: searchResults = [], isLoading: loading } = useQuery({
    queryKey: ["command-search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}`,
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      return data.files || [];
    },
    enabled: open && debouncedQuery.length > 0,
    staleTime: 60 * 1000,
  });

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const itemClass =
    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled='true']:pointer-events-none data-[disabled='true']:opacity-50 transition-colors";

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label={t("dialogLabel")}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[640px] bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <div
        className="flex items-center border-b border-border px-4"
        cmdk-input-wrapper=""
      >
        <Search className="mr-2 h-5 w-5 shrink-0 opacity-50" />
        <Command.Input
          value={searchQuery}
          onValueChange={setSearchQuery}
          placeholder={t("placeholder")}
          className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin opacity-50" />}
      </div>

      <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
        <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
          {loading ? t("searching") : t("noResults")}
        </Command.Empty>

        {searchResults.length > 0 && (
          <Command.Group
            heading={t("headingResults")}
            className="overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {searchResults.map((file: any) => (
              <Command.Item
                key={file.id}
                value={`${file.name} ${file.id}`}
                onSelect={() =>
                  runCommand(() => {
                    if (
                      file.mimeType === "application/vnd.google-apps.folder"
                    ) {
                      router.push(`/folder/${file.id}`);
                    } else {
                      const parentId =
                        file.parents?.[0] ||
                        process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;
                      const slug = encodeURIComponent(
                        file.name.replace(/\s+/g, "-").toLowerCase(),
                      );
                      router.push(
                        `/folder/${parentId}/file/${file.id}/${slug}`,
                      );
                    }
                  })
                }
                className={itemClass}
              >
                {file.mimeType === "application/vnd.google-apps.folder" ? (
                  <Folder className="mr-2 h-4 w-4 text-blue-500" />
                ) : (
                  <File className="mr-2 h-4 w-4 text-gray-500" />
                )}
                <span className="truncate">{file.name}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group
          heading={t("headingNavigation")}
          className="overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          <Command.Item
            value="beranda home dashboard"
            onSelect={() => runCommand(() => router.push("/"))}
            className={itemClass}
          >
            <Home className="mr-2 h-4 w-4" />
            <span>{t("home")}</span>
          </Command.Item>

          <Command.Item
            value="favorit favorites bintang"
            onSelect={() => runCommand(() => router.push("/favorites"))}
            className={itemClass}
          >
            <Star className="mr-2 h-4 w-4" />
            <span>{t("favorites")}</span>
          </Command.Item>

          <Command.Item
            value="penyimpanan storage drive"
            onSelect={() => runCommand(() => router.push("/storage"))}
            className={itemClass}
          >
            <HardDrive className="mr-2 h-4 w-4" />
            <span>{t("storage")}</span>
          </Command.Item>
        </Command.Group>

        {user?.role === "ADMIN" && (
          <Command.Group
            heading={t("headingAdmin")}
            className="overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            <Command.Item
              value="dashboard admin panel pengaturan"
              onSelect={() => runCommand(() => router.push("/admin"))}
              className={itemClass}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>{t("adminDashboard")}</span>
            </Command.Item>
          </Command.Group>
        )}

        <Command.Group
          heading={t("headingSettings")}
          className="overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          <Command.Item
            value="ganti tema theme dark mode light mode"
            onSelect={() =>
              runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))
            }
            className={itemClass}
          >
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>
              {t("switchTheme")} (
              {theme === "dark" ? commonT("light") : commonT("dark")})
            </span>
          </Command.Item>
        </Command.Group>

        <Command.Group
          heading={t("headingExternal")}
          className="overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          <Command.Item
            value="github repo source code"
            onSelect={() =>
              runCommand(() =>
                window.open("https://github.com/ifauzeee/Zee-Index", "_blank"),
              )
            }
            className={itemClass}
          >
            <Github className="mr-2 h-4 w-4" />
            <span>{t("github")}</span>
          </Command.Item>

          <Command.Item
            value="telegram grup komunitas"
            onSelect={() =>
              runCommand(() =>
                window.open("https://t.me/RyzeeenUniverse", "_blank"),
              )
            }
            className={itemClass}
          >
            <Send className="mr-2 h-4 w-4" />
            <span>{t("telegram")}</span>
          </Command.Item>
        </Command.Group>

        {user && (
          <>
            <Command.Separator className="-mx-1 h-px bg-border my-1" />
            <Command.Group
              heading={t("headingAccount")}
              className="overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              <Command.Item
                value="logout keluar sign out"
                onSelect={() =>
                  runCommand(() => signOut({ callbackUrl: "/login" }))
                }
                className={`${itemClass} text-red-500 aria-selected:text-red-500`}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t("logout")}</span>
              </Command.Item>
            </Command.Group>
          </>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
