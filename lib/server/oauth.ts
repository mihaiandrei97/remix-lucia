import { GitHub, Google } from "arctic";

export const github = new GitHub(
    process.env.GITHUB_CLIENT_ID!, 
    process.env.GITHUB_CLIENT_SECRET!, 
    process.env.PUBLIC_BASE_URL! + "/api/login/github/callback");

export const google = new Google(
    process.env.GOOGLE_CLIENT_ID!, 
    process.env.GOOGLE_CLIENT_SECRET!, 
    process.env.PUBLIC_BASE_URL + "/api/login/google/callback");
