import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("create", "routes/create.tsx"),
  route("about", "routes/about.tsx"),
  route("tests/:testId", "routes/test.tsx"),
  route("tests/:testId/results", "routes/results.tsx"),
] satisfies RouteConfig;
