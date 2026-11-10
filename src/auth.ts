import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { allowedDomain } from "@/config";
import { isAllowedEmail } from "@/domain/access";

/**
 * Sign-in with the team's own Google accounts. The app acts as the signed-in person on Sheets
 * and Drive, so no service-account key is needed (Workspace orgs often block creating those)
 * and "who changed what" stays in the sheet's own version history.
 */
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/spreadsheets",
  // Full Drive scope: the series folders were created by other people in the shared drive.
  "https://www.googleapis.com/auth/drive",
].join(" ");

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: { scope: GOOGLE_SCOPES, access_type: "offline", prompt: "consent", hd: allowedDomain() },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    signIn({ profile }) {
      return isAllowedEmail(profile?.email, profile?.email_verified as boolean | undefined, allowedDomain());
    },
    jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    // The session sent to the browser carries only name and email, never the Google tokens.
    session({ session }) {
      return session;
    },
  },
});
