import { serverSupabaseUser } from "#supabase/server";
import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  const userConnected = await serverSupabaseUser(event);
  const body = await readBody(event);
  if (userConnected == null) return;

  const user = await prisma.user.upsert({
    where: { id: userConnected.id },
    update: {
      name: body.username,
      slug: slugify(body.username),
    },
    create: {
      id: userConnected.id,
      name: body.username,
      slug: slugify(body.username),
    },
  });

  return {
    ...user,
    email: userConnected.email,
  };
});

const slugify = (str: string) => {
  str = str.replace(/^\s+|\s+$/g, ""); // trim leading/trailing white space
  str = str.toLowerCase(); // convert string to lowercase
  str = str
    .replace(/[^a-z0-9 -]/g, "") // remove any non-alphanumeric characters
    .replace(/\s+/g, "_") // replace spaces with hyphens
    .replace(/-+/g, "_"); // remove consecutive hyphens
  return str;
};
