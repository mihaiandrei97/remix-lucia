import { github } from "@lib/server/oauth";
import type { OAuth2Tokens } from "arctic";
import {
    createSession,
    generateSessionToken,
    setSessionTokenCookie
} from "@lib/server/auth";
import {
    createProviderAccount,
    findUserByProvider
} from "@features/user/queries";
import { LoaderFunctionArgs } from "@remix-run/node";
import { combineHeaders, githubState } from "@lib/server/cookies";

interface GitHubUser {
    id: number;
    login: string; // username
    email?: string;
}

interface GithubEmails {
    email: string;
    primary: boolean;
    verified: boolean;
    visibility: string;
}

export async function loader({request}: LoaderFunctionArgs) {
    const cookies = request.headers.get("Cookie");
    const storedState = await githubState.parse(cookies);
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");

    if (storedState === null || code === null || state === null) {
        return new Response("Please restart the process.", {
            status: 400
        });
    }

    if (storedState !== state) {
        return new Response("Please restart the process.", {
            status: 400
        });
    }

    let tokens: OAuth2Tokens;
    try {
        tokens = await github.validateAuthorizationCode(code);
    } catch (e) {
        console.log(e);
        return new Response("Please restart the process.", {
            status: 400
        });
    }

    const githubAccessToken = tokens.accessToken();

    const userRequest = new Request("https://api.github.com/user");
    userRequest.headers.set("Authorization", `Bearer ${githubAccessToken}`);
    const userResponse = await fetch(userRequest);
    const userResult: GitHubUser = await userResponse.json();

    const existingUser = await findUserByProvider({
        providerId: userResult.id.toString(),
        providerName: "github"
    });

    if (existingUser !== null) {
        const token = generateSessionToken();
        await createSession(token, existingUser.id);
        
        // add expire at as one year in order to not use middleware to extend the cookie
        // because middleware is pricy on vercel
        const expireTime = new Date();
        expireTime.setFullYear(expireTime.getFullYear() + 1);
        const headers = await setSessionTokenCookie(token, expireTime);
        // setSessionTokenCookie(token, session.expiresAt);
        return new Response(null, {
            status: 302,
            headers: combineHeaders(headers, {
                Location: "/"
            })
        });
    }

    const emailListRequest = new Request("https://api.github.com/user/emails");
    emailListRequest.headers.set(
        "Authorization",
        `Bearer ${githubAccessToken}`
    );
    const emailListResponse = await fetch(emailListRequest);
    const emailListResult: GithubEmails[] = await emailListResponse.json();

    if (!Array.isArray(emailListResult) || emailListResult.length < 1) {
        return new Response("Please restart the process.", {
            status: 400
        });
    }

    const email =
        emailListResult.find((email) => email.primary && email.verified)
            ?.email || null;

    if (email === null) {
        return new Response("Please verify your GitHub email address.", {
            status: 400
        });
    }

    const user = await createProviderAccount({
        providerId: userResult.id.toString(),
        providerName: "github",
        username: userResult.login,
        email
    });

    const token = generateSessionToken();
    await createSession(token, user.id);
    // add expire at as one year in order to not use middleware to extend the cookie
    // because middleware is pricy on vercel
    const expireTime = new Date();
    expireTime.setFullYear(expireTime.getFullYear() + 1);
    const headers = await setSessionTokenCookie(token, expireTime);
    // setSessionTokenCookie(token, session.expiresAt);

    return new Response(null, {
        status: 302,
        headers: combineHeaders(headers, {
            Location: "/"
        })
    });
}
