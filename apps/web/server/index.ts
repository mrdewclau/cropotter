import { createApp } from "./app.js";
const port = Number(process.env.PORT ?? 8080);
const server = createApp();
server.listen(port, "0.0.0.0", () =>
  console.log(`CropOtter listening on port ${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
