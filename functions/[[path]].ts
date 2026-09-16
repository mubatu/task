import type { Env } from "./_shared/env";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const assetUrl = new URL(context.request.url);
  assetUrl.pathname = "/";
  assetUrl.search = "";
  return context.env.ASSETS.fetch(assetUrl);
};
