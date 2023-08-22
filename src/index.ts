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

export function createRouter<
  const T extends Record<string, string>,
  A = {
    [K in keyof T]?: K extends string ? Route<K, T[K]> : never;
  }
>(config: T) {
  const routes: ExtractRoutes<T>[] = [];
  const history = createBrowserHistory();

  for (const route in config) {
    // @ts-ignore
    routes.push({
      name: route,
      config: config[route],
      path: new Path(config[route]),
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

  function getActiveRoutes() {
    return routes.filter((route) =>
      // The "/" route never matches a partial test, just does not make sense
      Boolean(
        route.config.length > 1
          ? route.path.partialTest(history.location.pathname)
          : route.path.test(history.location.pathname)
      )
    );
  }

  function getActiveRoutesMap() {
    return getActiveRoutes().reduce((aggr, route) => {
      // @ts-ignore
      aggr[route.name as keyof T] = route;

      return aggr;
    }, {} as A);
  }

  const listeners = new Set<(activeRoutes: A) => void>();

  function notify(update: Update) {
    if (
      update.action === Action.Replace &&
      // @ts-ignore
      update.location.state?.isQueryUpdate
    ) {
      return;
    }
    const activeRoutes = getActiveRoutesMap();

    listeners.forEach((listener) => listener(activeRoutes));
  }

  history.listen(notify);

  return {
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
    listen(listener: (activeRoutes: A) => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    get activeRoutes() {
      return getActiveRoutesMap();
    },
    get queries() {
      return queryString.parse(history.location.search);
    },
  };
}
