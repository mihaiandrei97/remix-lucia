import { google } from "@lib/server/oauth";
import type { OAuth2Tokens } from "arctic";
import { createProviderAccount, findUserByProvider } from "@features/user/queries";
import { createSession, generateSessionToken, setSessionTokenCookie } from "@lib/server/auth";
import { LoaderFunctionArgs } from "@remix-run/node";
import { combineHeaders, googleCodeVerifier, googleState } from "@lib/server/cookies";

interface GoogleUser {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: string;
}

export async function loader({request}: LoaderFunctionArgs){
    const cookies = request.headers.get("Cookie");
    const storedState = await googleState.parse(cookies);
    const codeVerifier = await googleCodeVerifier.parse(cookies);
	const url = new URL(request.url);
    const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");

	if (storedState === null || codeVerifier === null || code === null || state === null) {
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
		tokens = await google.validateAuthorizationCode(code, codeVerifier);
	} catch {
		return new Response("Please restart the process.", {
			status: 400
		});
	}

	const googleAccessToken = tokens.accessToken();

	const userRequest = new Request('https://openidconnect.googleapis.com/v1/userinfo');
	userRequest.headers.set('Authorization', `Bearer ${googleAccessToken}`);
	const userResponse = await fetch(userRequest);
	const userResult: GoogleUser = await userResponse.json();

	const existingUser = await findUserByProvider({
        providerId: userResult.sub,
        providerName: 'google'
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

	const user = await createProviderAccount({
        providerId: userResult.sub,
        providerName: 'google',
        username: userResult.name,
        email: userResult.email,
    });

	const token = generateSessionToken();
	await createSession(token, user.id);
	const expireTime = new Date();
    expireTime.setFullYear(expireTime.getFullYear() + 1);
    const headers = await setSessionTokenCookie(token, expireTime);
       
    return new Response(null, {
        status: 302,
        headers: combineHeaders(headers, {
            Location: "/"
        })
    });
}