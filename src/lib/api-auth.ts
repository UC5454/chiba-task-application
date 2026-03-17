import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export const getAuthSession = async () => getServerSession(authOptions);

export const getAccessTokenFromSession = async () => {
  const session = await getAuthSession();
  const accessToken = session?.accessToken;

  if (!accessToken) {
    return null;
  }

  return accessToken;
};
