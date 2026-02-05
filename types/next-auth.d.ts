import { DefaultSession, DefaultUser } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      role?: "ADMIN" | "USER" | "GUEST" | "EDITOR";
      isGuest?: boolean;
      twoFactorRequired?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: "ADMIN" | "USER" | "GUEST" | "EDITOR";
    isGuest?: boolean;
    twoFactorRequired?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "USER" | "GUEST" | "EDITOR";
    email?: string | null;
    isGuest?: boolean;
    twoFactorRequired?: boolean;
  }
}
