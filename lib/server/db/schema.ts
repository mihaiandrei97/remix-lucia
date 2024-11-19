import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

type Role = 'ADMIN' | 'USER';

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date', precision: 3 }).$onUpdate(
		() => new Date()
	)
};

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	role: text('role').$type<Role>().notNull().default('USER'),
	username: text('username').notNull().unique(),
	...timestamps
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
	...timestamps
});

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		providerName: text('provider_name').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		...timestamps
	},
	(t) => ({
		unique_provider: unique().on(t.providerName, t.providerId)
	})
);

export type InsertSession = typeof session.$inferInsert;
export type User = typeof user.$inferSelect;
