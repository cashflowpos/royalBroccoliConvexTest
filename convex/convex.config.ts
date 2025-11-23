import { defineApp } from "convex/server";
import todoComponent from "./components/todoComponent/convex.config";

const app = defineApp();

app.use(todoComponent);

export default app;