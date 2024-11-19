import {
  deleteSessionTokenCookie,
  getCurrentSession,
  invalidateSession,
} from "@lib/server/auth";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { Form, Link, redirect, useLoaderData } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, user } = await getCurrentSession(request);
  return {
    session,
    user,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await getCurrentSession(request);
  if (!session) {
    return redirect("/login");
  }
  await invalidateSession(session.id);
  const headers = await deleteSessionTokenCookie();
  return new Response(null, { headers, status: 200 });
}

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-16">
        <header className="flex flex-col items-center gap-9">
          <h1 className="leading text-2xl font-bold text-gray-800 dark:text-gray-100">
            Welcome to <span className="sr-only">Remix</span>
          </h1>
          <div className="h-[144px] w-[434px]">
            <img
              src="/logo-light.png"
              alt="Remix"
              className="block w-full dark:hidden"
            />
            <img
              src="/logo-dark.png"
              alt="Remix"
              className="hidden w-full dark:block"
            />
          </div>
        </header>
        <nav className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-gray-200 p-6 dark:border-gray-700">
          <p className="leading-6 text-gray-700 dark:text-gray-200">
            What&apos;s next?
          </p>
          <ul>
            <li>
              <pre>
                <code>{JSON.stringify(data, null, 2)}</code>
              </pre>
              {!data.session ? (
                <Link
                  className="group flex items-center gap-3 self-stretch p-3 leading-normal text-blue-700 hover:underline dark:text-blue-500"
                  to={"/login"}
                >
                  Login
                </Link>
              ) : (
                <Form method="POST">
                  <button
                    className="group flex items-center gap-3 self-stretch p-3 leading-normal text-blue-700 hover:underline dark:text-blue-500"
                    type="submit"
                  >
                    Logout
                  </button>
                </Form>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
