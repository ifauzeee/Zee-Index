import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

declare module "next-auth" {
  interface Session {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: "ADMIN" | "USER" | "GUEST";
      twoFactorRequired?: boolean;
      isGuest?: boolean;
    };
  }

  interface User {
    role?: "ADMIN" | "USER" | "GUEST";
    isGuest?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "USER" | "GUEST";
    email?: string | null;
    twoFactorRequired?: boolean;
    isGuest?: boolean;
  }
}
