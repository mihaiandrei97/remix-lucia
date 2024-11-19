import { CookieOptions, createCookie } from "@remix-run/node";
import { sessionCookieName } from "./auth";

export function combineHeaders(
  ...headers: Array<ResponseInit["headers"] | null | undefined>
) {
  const combined = new Headers();
  for (const header of headers) {
    if (!header) continue;
    for (const [key, value] of new Headers(header).entries()) {
      combined.append(key, value);
    }
  }
  return combined;
}

export const githubState = createCookie("github_oauth_state", {
  path: "/",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  maxAge: 60 * 10,
  sameSite: "lax",
});

export const googleState = createCookie("google_oauth_state", {
  path: "/",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  maxAge: 60 * 10,
  sameSite: "lax",
});

export const googleCodeVerifier = createCookie("google_code_verifier", {
  path: "/",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  maxAge: 60 * 10,
  sameSite: "lax",
});

export function createSessionCookie(expires?: Date) {
  const options: CookieOptions = {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  };
  if (expires) {
    options.expires = expires;
  }
  return createCookie(sessionCookieName, options);
}
