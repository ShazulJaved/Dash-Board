import admin from "firebase-admin";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";


export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // validate user...
        return { id: "1", name: "Admin", email: credentials?.email };
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};


// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

export const auth = admin.auth();

export async function createSessionCookie(idToken: string, options: { expiresIn: number }) {
  try {
    // Verify the ID token first
    const decodedToken = await auth.verifyIdToken(idToken);

    // Create the session cookie
    const sessionCookie = await auth.createSessionCookie(idToken, options);

    return sessionCookie;
  } catch (error) {
    console.error("Error creating session cookie:", error);
    throw new Error("Unable to create session cookie");
  }
}

export async function verifySessionCookie(sessionCookie: string) {
  try {
    // Verify the session cookie
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    return decodedClaims;
  } catch (error) {
    console.error("Error verifying session cookie:", error);
    return null; // Return null if verification fails
  }
}
