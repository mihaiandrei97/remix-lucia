import { eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { db } from '@lib/server/db';
import * as table from '@lib/server/db/schema';
import { createSessionCookie } from './cookies';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const sessionCookieName = 'auth-session';

export function generateSessionToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(20));
	const token = encodeBase32LowerCaseNoPadding(bytes);
	return token;
}

export async function createSession(token: string, userId: string): Promise<table.InsertSession> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: table.InsertSession = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + DAY_IN_MS * 30)
	};
	await db.insert(table.session).values(session);
	return session;
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.delete(table.session).where(eq(table.session.id, sessionId));
}

export async function validateSessionToken(token: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const [result] = await db
		.select({
			// Adjust user table here to tweak returned data
			user: { id: table.user.id, username: table.user.username },
			session: table.session
		})
		.from(table.session)
		.innerJoin(table.user, eq(table.session.userId, table.user.id))
		.where(eq(table.session.id, sessionId));
	
	if (!result) {
		return { session: null, user: null };
	}
	const { session, user } = result;

	const sessionExpired = Date.now() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await db.delete(table.session).where(eq(table.session.id, session.id));
		return { session: null, user: null };
	}

	const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
	if (renewSession) {
		session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30);
		await db
			.update(table.session)
			.set({ expiresAt: session.expiresAt })
			.where(eq(table.session.id, session.id));
	}

	return { session, user };
}

export async function setSessionTokenCookie(token: string, expiresAt: Date): Promise<Headers> {
	const headers = new Headers();
	headers.append(
		"Set-Cookie",
		await createSessionCookie(expiresAt).serialize(token)
	)
	return headers;
}

export async function deleteSessionTokenCookie(): Promise<Headers> {
	const headers = new Headers();
	headers.append(
		"Set-Cookie",
		await createSessionCookie(new Date(0)).serialize("")
	);
	return headers;
}

export async function getCurrentSession(request: Request): Promise<SessionValidationResult> {
	const cookies = request.headers.get("Cookie");
	if (!cookies) {
		return { session: null, user: null };
	}
	const sessionCookie = createSessionCookie();
	const sessionToken = await sessionCookie.parse(cookies);
	if (!sessionToken) {
		return { session: null, user: null };
	}
	const result = await validateSessionToken(sessionToken);
	return result;
}


export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;
