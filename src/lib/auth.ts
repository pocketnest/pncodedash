import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const ALLOWED_DOMAIN = "pocketnest.com";

export function isPocketnestEmail(
  email?: string | null,
): email is string {
  if (!email) return false;
  const [localPart, domain, extra] = email.trim().toLowerCase().split("@");
  return Boolean(localPart && domain === ALLOWED_DOMAIN && extra === undefined);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          hd: ALLOWED_DOMAIN,
          prompt: "select_account",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return false;
      const googleProfile = profile as {
        email?: string;
        email_verified?: boolean;
        hd?: string;
      };
      if (googleProfile.email_verified !== true) return false;
      if (
        googleProfile.hd &&
        googleProfile.hd.toLowerCase() !== ALLOWED_DOMAIN
      ) {
        return false;
      }
      return isPocketnestEmail(googleProfile.email);
    },
  },
};
