import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const ACCESS_TOKEN_TTL = "15m";

export type AccessClaims = {
  sub: string;
  kind: "user" | "admin";
  role?: string;
};

function key() {
  return new TextEncoder().encode(env.jwtSecret);
}

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ kind: claims.kind, role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer("buyel")
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(key());
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: "buyel" });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      kind: (payload.kind as "user" | "admin") ?? "user",
      role: payload.role as string | undefined,
    };
  } catch {
    return null;
  }
}
