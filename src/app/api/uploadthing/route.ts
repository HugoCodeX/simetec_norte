import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Exportar rutas para Next App Router
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});

