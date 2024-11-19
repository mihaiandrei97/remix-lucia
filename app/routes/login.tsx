import { getCurrentSession } from "@lib/server/auth";
import { LoaderFunctionArgs, redirect } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await getCurrentSession(request);
  if (session) {
    return redirect("/");
  }
  return null;
}

export default function Login() {
  return (
    <>
      <h1>Sign in</h1>
      <a href="/api/login/github">Sign in with GitHub</a>
      <a href="/api/login/google">Sign in with Google</a>
    </>
  );
}
