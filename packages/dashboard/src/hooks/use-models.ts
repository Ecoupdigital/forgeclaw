"use client";

import { useState, useEffect } from "react";

export interface ModelInfo {
  id: string;
  label: string;
  tier: "fast" | "balanced" | "powerful";
}

interface ModelsState {
  models: ModelInfo[];
  loading: boolean;
  source: string | null;
}

let cachedModels: ModelInfo[] | null = null;

export function useModels(): ModelsState {
  const [models, setModels] = useState<ModelInfo[]>(cachedModels ?? []);
  const [loading, setLoading] = useState(cachedModels === null);
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    if (cachedModels) return;

    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        cachedModels = data.models;
        setModels(data.models);
        setSource(data.source);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { models, loading, source };
}
