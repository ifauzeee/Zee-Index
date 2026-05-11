import { proxy } from "./proxy";

export default proxy;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png).*)"],
};
