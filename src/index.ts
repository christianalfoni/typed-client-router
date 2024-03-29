import { Action, Update, createBrowserHistory } from "history";
import { Path } from "path-parser";
import queryString from "query-string";

type ExtractParam<Path, NextPart> = Path extends
  | `:${infer Param}`
  | `*${infer Param}`
  ? Record<Param, string> & NextPart
  : NextPart;

type ExctractParams<Path> = Path extends `${infer Segment}/${infer Rest}`
  ? ExtractParam<Segment, ExctractParams<Rest>>
  : ExtractParam<Path, {}>;

export type RoutesConfig = Record<string, `/${string}`>;

export type Route<K extends string, T extends string> = {
  name: K;
  params: ExctractParams<T>;
  pathname: string;
};

export type TRoutes<T extends RoutesConfig> = {
  [K in keyof T]: K extends string ? Route<K, T[K]> : never;
}[keyof T];

export type TRouter<T extends RoutesConfig> = {
  url<K extends keyof T>(
    name: K,
    params: K extends string ? Route<K, T[K]>["params"] : never,
  ): string;
  push<K extends keyof T>(
    name: K,
    params: K extends string ? Route<K, T[K]>["params"] : never,
    query?: Record<string, string>,
  ): void;
  replace<K extends keyof T>(
    name: K,
    params: K extends string ? Route<K, T[K]>["params"] : never,
    query?: Record<string, string>,
  ): void;
  setQuery(key: string, value: string | undefined): void;
  listen(listener: (currentRoute: TRoutes<T> | undefined) => void): () => void;
  current: TRoutes<T> | undefined;
  queries: Record<string, string>;
  pathname: string;
};

export function createRouter<const T extends RoutesConfig>(
  config: T,
  {
    base,
  }: {
    base?: string;
  } = {},
): TRouter<T> {
  const routes: Array<
    TRoutes<T> & {
      path: Path;
    }
  > = [];
  const history = createBrowserHistory();

  if (base === "/") {
    base = "";
  } else if (base && base[0] !== "/") {
    base = "/" + base;
  }

  for (const route in config) {
    // @ts-ignore
    routes.push({
      name: route,
      path: new Path(base ? base + config[route] : config[route]),
      get params() {
        return this.path.test(history.location.pathname) || {};
      },
      get pathname() {
        return history.location.pathname.substring(base?.length ?? 0);
      },
    });
  }

  function getRoute<K extends keyof T>(name: K) {
    const route = routes.find((route) => route.name === name);

    if (!route) {
      throw new Error("Can not find route for " + String(name));
    }

    return route;
  }

  function getActiveRoute() {
    return routes.find((route) => route.path.test(history.location.pathname));
  }

  const listeners = new Set<(currentRoute: TRoutes<T> | undefined) => void>();

  function notify(update: Update) {
    if (
      update.action === Action.Replace &&
      // @ts-ignore
      update.location.state?.isQueryUpdate
    ) {
      return;
    }

    const activeRoute = getActiveRoute();

    listeners.forEach((listener) =>
      // We change reference as the route is considered new
      listener(activeRoute ? { ...activeRoute } : undefined),
    );
  }

  history.listen(notify);

  return {
    url(name, params) {
      const route = getRoute(name);

      return route.path.build(params);
    },
    push(name, params, query = {}) {
      const route = getRoute(name);

      history.push({
        pathname: route.path.build(params),
        search: queryString.stringify(query),
      });
    },
    replace(name, params, query = {}) {
      const route = getRoute(name);

      history.replace({
        pathname: route.path.build(params),
        search: queryString.stringify(query),
      });
    },
    setQuery(key, value) {
      let existingQuery = queryString.parse(history.location.search);

      if (value === undefined) {
        delete existingQuery[key];
      } else {
        existingQuery = {
          ...existingQuery,
          [key]: value,
        };
      }

      history.replace(
        {
          pathname: history.location.pathname,
          search: "?" + queryString.stringify(existingQuery),
        },
        {
          isQueryUpdate: true,
        },
      );
    },
    listen(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    get current() {
      return getActiveRoute();
    },
    get queries() {
      return queryString.parse(history.location.search) as Record<
        string,
        string
      >;
    },
    get pathname() {
      return history.location.pathname.substring(base?.length ?? 0);
    },
  };
}
