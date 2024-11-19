import { githubState } from "@lib/server/cookies";
import { github } from "@lib/server/oauth";
import { generateState } from "arctic";

export async function loader() {
  const state = generateState();
  const url = github.createAuthorizationURL(state, ["user:email"]);

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Set-Cookie": await githubState.serialize(state),
    },
  });
}
