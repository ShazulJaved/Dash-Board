import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Export authOptions from this file
export { authOptions };

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };