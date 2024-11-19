import {
  combineHeaders,
  googleCodeVerifier,
  googleState,
} from "@lib/server/cookies";
import { google } from "@lib/server/oauth";
import { generateCodeVerifier, generateState } from "arctic";

export async function loader() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, [
    "profile",
    "email",
  ]);

  return new Response(null, {
    status: 302,
    headers: combineHeaders(
      {
        Location: url.toString(),
        "Set-Cookie": await googleState.serialize(state),
      },
      {
        "Set-Cookie": await googleCodeVerifier.serialize(codeVerifier),
      }
    ),
  });
}
