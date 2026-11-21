import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

const COOKIE = "buyel_reg";
const TTL_SECONDS = 15 * 60;

function key() {
  return new TextEncoder().encode(env.jwtSecret);
}

/**
 * Proof that this browser just verified an OTP for a phone number that has no
 * account yet. It is what lets the profile step finish without a second OTP.
 */
export async function issueRegistrationTicket(phone: string) {
  const token = await new SignJWT({ phone })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("buyel")
    .setAudience("registration")
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(key());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function readRegistrationTicket(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key(), {
      issuer: "buyel",
      audience: "registration",
    });
    return typeof payload.phone === "string" ? payload.phone : null;
  } catch {
    return null;
  }
}

export async function clearRegistrationTicket() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
