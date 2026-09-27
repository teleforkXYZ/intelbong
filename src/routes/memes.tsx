import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/memes")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
