import type {
  FeedbackMetadata,
  MetadataProvider
} from "@agent-feedback/core";

interface ReactFiber {
  elementType?: unknown;
  return?: ReactFiber | null;
  tag?: number;
  type?: unknown;
}

const INTERNAL_NAME =
  /^(?:Anonymous|Fragment|Profiler|StrictMode|Suspense|Root|ServerRoot|HotReload|SegmentViewNode|__next_.*|.*(?:Boundary|Context|Provider|Router|Handler(?:Old)?))$/;

export const reactMetadataProvider: MetadataProvider = {
  inspect(element): FeedbackMetadata | undefined {
    const fiber = findFiber(element);
    if (!fiber) return undefined;

    const hierarchy: string[] = [];
    let current: ReactFiber | null | undefined = fiber;
    while (current) {
      const name = componentName(current);
      if (
        name &&
        !INTERNAL_NAME.test(name) &&
        hierarchy.at(-1) !== name
      ) {
        hierarchy.push(name);
      }
      current = current.return;
    }
    hierarchy.reverse();

    if (hierarchy.length === 0) {
      return { framework: "react" };
    }
    return {
      component: hierarchy.at(-1),
      framework: "react",
      hierarchy
    };
  },
  name: "react"
};

function findFiber(element: Element): ReactFiber | undefined {
  const key = Object.keys(element).find(
    (candidate) =>
      candidate.startsWith("__reactFiber$") ||
      candidate.startsWith("__reactInternalInstance$")
  );
  if (!key) return undefined;
  return (element as unknown as Record<string, ReactFiber>)[key];
}

function componentName(fiber: ReactFiber): string | undefined {
  const type = fiber.type ?? fiber.elementType;
  if (typeof type === "string") return undefined;
  if (typeof type === "function") {
    return (
      (type as { displayName?: string }).displayName ||
      type.name ||
      "Anonymous"
    );
  }
  if (type && typeof type === "object") {
    const candidate = type as {
      displayName?: string;
      render?: { displayName?: string; name?: string };
      type?: { displayName?: string; name?: string };
    };
    return (
      candidate.displayName ||
      candidate.render?.displayName ||
      candidate.render?.name ||
      candidate.type?.displayName ||
      candidate.type?.name
    );
  }
  return undefined;
}
