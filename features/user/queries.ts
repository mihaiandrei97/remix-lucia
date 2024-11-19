import { db } from '@lib/server/db';
import * as tables from '@lib/server/db/schema';
import { createId } from '@paralleldrive/cuid2';
import { and, eq } from 'drizzle-orm';

export async function findUserByProvider({
	providerId,
	providerName
}: {
	providerId: string;
	providerName: 'github' | 'google';
}) {
	const [account] = await db
		.select()
		.from(tables.account)
		.where(
			and(eq(tables.account.providerId, providerId), eq(tables.account.providerName, providerName))
		);
	if (!account) {
		return null;
	}

	return {
		id: account.userId
	};
}

export async function findUserByEmail(email: string) {
	const [user] = await db.select().from(tables.user).where(eq(tables.user.email, email));
	return user;
}

export async function createUser({ email, username }: { email: string; username: string }) {
	const [user] = await db
		.insert(tables.user)
		.values({
			email,
			id: createId(),
			username
		})
		.returning();
	return user;
}

export async function createProviderAccount({
	providerId,
	providerName,
	email,
	username
}: {
	providerId: string;
	providerName: 'github' | 'google';
	email: string;
	username: string;
}) {
	let user = await findUserByEmail(email);
	if (!user) {
		user = await createUser({ email, username });
	}

	await db.insert(tables.account).values({
		id: createId(),
		providerId,
		providerName,
		userId: user.id
	});

	return user;
}
