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

type ExtractQuery<QueryString> = QueryString extends `${infer Query}&${infer Rest}`
  ? Record<Query, string | undefined> & ExtractQuery<Rest>
  : QueryString extends `${infer Query}`
  ? Record<Query, string | undefined>
  : {};

type ExtractQueries<Path> = Path extends `${infer _Pathname}?${infer QueryString}`
  ? ExtractQuery<QueryString>
  : {};

export type RoutesConfig = Record<string, `/${string}`>;

export type Route<K extends string, T extends string> = {
  name: K;
  params: ExctractParams<T>;
  queries: ExtractQueries<T>;
  pathname: string;
};

export type TRoutes<T extends RoutesConfig> = {
  [K in keyof T]: K extends string ? Route<K, T[K]> : never;
}[keyof T];

type RequireParams<P> = keyof P extends never ? false : true;

type MergeParamsAndQueries<
  P extends Record<string, any>,
  Q extends Record<string, any>
> = P & Partial<Q>;

type ParamsType<K extends string, T extends string> = RequireParams<
  Route<K, T>["params"]
> extends true
  ? Route<K, T>["params"]
  : Partial<Route<K, T>["params"]>;

export type TRouter<T extends RoutesConfig> = {
  url<K extends keyof T>(
    name: K,
    params: K extends string
      ? MergeParamsAndQueries<
        ParamsType<K, T[K]>,
        Route<K, T[K]>["queries"]
      >
      : never,
  ): string;
  push<K extends keyof T>(
    name: K,
    params?: K extends string
      ? MergeParamsAndQueries<
        ParamsType<K, T[K]>,
        Route<K, T[K]>["queries"]
      >
      : never,
  ): void;
  replace<K extends keyof T>(
    name: K,
    params?: K extends string
      ? MergeParamsAndQueries<
        ParamsType<K, T[K]>,
        Route<K, T[K]>["queries"]
      >
      : never,
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
    // Strip query string from the path for route matching
    const routePath = config[route].split('?')[0];
    // @ts-ignore
    routes.push({
      name: route,
      path: new Path(base ? base + routePath : routePath),
      get params() {
        return this.path.test(history.location.pathname) || {};
      },
      get queries() {
        const parsed = queryString.parse(history.location.search) as Record<
          string,
          string | undefined
        >;
        return parsed;
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

  function splitParams(
    route: (typeof routes)[0],
    params: Record<string, any> | undefined
  ) {
    const pathParamNames = new Set(route.path.params);
    const pathParams: Record<string, string> = {};
    const queryParams: Record<string, string> = {};

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined) {
        if (pathParamNames.has(key)) {
          pathParams[key] = value as string;
        } else {
          queryParams[key] = value as string;
        }
      }
    });

    return { pathParams, queryParams };
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
      const { pathParams, queryParams } = splitParams(route, params);

      const pathname = route.path.build(pathParams);
      const search = queryString.stringify(queryParams);

      return search ? `${pathname}?${search}` : pathname;
    },
    push(name, params) {
      const route = getRoute(name);
      const { pathParams, queryParams } = splitParams(route, params);

      history.push({
        pathname: route.path.build(pathParams),
        search: queryString.stringify(queryParams),
      });
    },
    replace(name, params) {
      const route = getRoute(name);
      const { pathParams, queryParams } = splitParams(route, params);

      history.replace({
        pathname: route.path.build(pathParams),
        search: queryString.stringify(queryParams),
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
