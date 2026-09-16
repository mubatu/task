import { useEffect, useState } from "react";

export type AppRoute = "/" | "/calendar" | "/completed";

function resolveRoute(pathname: string): AppRoute {
  if (pathname === "/calendar") return "/calendar";
  if (pathname === "/completed") return "/completed";
  return "/";
}

export function useNavigation() {
  const [route, setRoute] = useState<AppRoute>(() => resolveRoute(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => setRoute(resolveRoute(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(nextRoute: AppRoute) {
    if (nextRoute === route) return;
    window.history.pushState({}, "", nextRoute);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return { route, navigate };
}
