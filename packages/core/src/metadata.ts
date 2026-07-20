import type {
  FeedbackMetadata,
  MetadataProvider
} from "./types.js";

const providers: MetadataProvider[] = [];

export function registerMetadataProvider(provider: MetadataProvider): () => void {
  if (!providers.some((candidate) => candidate.name === provider.name)) {
    providers.push(provider);
  }
  return () => {
    const index = providers.indexOf(provider);
    if (index >= 0) providers.splice(index, 1);
  };
}

export function inspectMetadata(element: Element): FeedbackMetadata {
  for (const provider of providers) {
    try {
      const metadata = provider.inspect(element);
      if (metadata) return metadata;
    } catch {
      // Metadata is enrichment and must never block feedback.
    }
  }
  return {};
}
