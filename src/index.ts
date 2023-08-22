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

type ExtractRoutes<T extends Record<string, string>> = {
  [K in keyof T]: K extends string ? Route<K, T[K]> : never;
}[keyof T];

type Route<K extends string, T extends string> = {
  name: K;
  config: T;
  path: Path;
  params: ExctractParams<T>;
};

export function createRouter<const T extends Record<string, string>>(
  config: T,
  {
    base,
  }: {
    base?: `/${string}`;
  } = {}
) {
  const routes: ExtractRoutes<T>[] = [];
  const history = createBrowserHistory();

  for (const route in config) {
    const configWithBase = base ? base + config[route] : config[route];
    // @ts-ignore
    routes.push({
      name: route,
      config: configWithBase,
      path: new Path(configWithBase),
      get params() {
        return this.path.test(history.location.pathname) || {};
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

  const listeners = new Set<
    (currentRoute: ExtractRoutes<T> | undefined) => void
  >();

  function notify(update: Update) {
    if (
      update.action === Action.Replace &&
      // @ts-ignore
      update.location.state?.isQueryUpdate
    ) {
      return;
    }

    const activeRoute = getActiveRoute();

    listeners.forEach((listener) => listener(activeRoute));
  }

  history.listen(notify);

  return {
    url<K extends keyof T>(
      name: K,
      params: K extends string ? Route<K, T[K]>["params"] : never
    ) {
      const route = getRoute(name);

      return route.path.build(params);
    },
    push<K extends keyof T>(
      name: K,
      params: K extends string ? Route<K, T[K]>["params"] : never
    ) {
      const route = getRoute(name);

      history.push(route.path.build(params));
    },
    replace<K extends keyof T>(
      name: K,
      params: K extends string ? Route<K, T[K]>["params"] : never
    ) {
      const route = getRoute(name);

      history.replace(route.path.build(params));
    },
    setQuery(key: string, value: string | undefined) {
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
        }
      );
    },
    listen(listener: (currentRoute: ExtractRoutes<T> | undefined) => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    get current() {
      return getActiveRoute();
    },
    get queries() {
      return queryString.parse(history.location.search);
    },
  };
}
