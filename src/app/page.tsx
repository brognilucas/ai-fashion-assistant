"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import type { OutfitAnalysis } from "@/lib/schemas/analysis";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  ACCEPTED_IMAGE_TYPES,
  HEIC_MIME_TYPES,
  UPLOAD_ACCEPTED_IMAGE_EXTENSIONS,
} from "@/lib/constants";

type AppState = "idle" | "preview" | "loading" | "results" | "error";

const UPLOAD_ACCEPTED_TYPES: readonly string[] = [
  ...ACCEPTED_IMAGE_TYPES,
  ...HEIC_MIME_TYPES,
];

const CATEGORY_LABELS: Record<string, string> = {
  colorHarmony: "Color Harmony",
  fit: "Fit",
  occasionAppropriateness: "Occasion Appropriateness",
  accessories: "Accessories",
  overallAssessment: "Overall Assessment",
};

function scoreColor(score: number): string {
  if (score < 5) return "bg-red-500";
  if (score <= 7) return "bg-yellow-500";
  return "bg-green-500";
}

function AnalysisCard({
  label,
  data,
}: {
  label: string;
  data: {
    score: number;
    summary: string;
    details: string;
    suggestions: string[];
  };
}) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
          {label}
        </h3>
        <span
          className={`${scoreColor(data.score)} text-white text-sm font-bold px-2 py-0.5 rounded-full`}
        >
          {data.score}/10
        </span>
      </div>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        {data.summary}
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
        {data.details}
      </p>
      {data.suggestions.length > 0 && (
        <ul className="list-disc list-inside text-sm text-zinc-500 dark:text-zinc-400 space-y-1">
          {data.suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<OutfitAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [occasion, setOccasion] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  const analyzeImage = useCallback(
    async (
      image: string,
      occasionValue: string,
      context?: string
    ): Promise<OutfitAnalysis> => {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          ...(occasionValue ? { occasion: occasionValue } : {}),
          ...(context ? { additionalContext: context } : {}),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Analysis failed");
      }

      return response.json();
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (!imageDataUrl) return;

    setState("loading");
    try {
      const data = await analyzeImage(imageDataUrl, occasion);
      setAnalysis(data);
      setState("results");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setState("error");
    }
  }, [imageDataUrl, occasion, analyzeImage]);

  const handleFollowUp = useCallback(async () => {
    if (!additionalContext.trim() || !imageDataUrl) return;

    setState("loading");
    try {
      const data = await analyzeImage(imageDataUrl, occasion, additionalContext);
      setAnalysis(data);
      setAdditionalContext("");
      setState("results");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setState("error");
    }
  }, [additionalContext, imageDataUrl, occasion, analyzeImage]);

  const handleFile = useCallback(async (file: File) => {
    if (!UPLOAD_ACCEPTED_TYPES.includes(file.type)) {
      setError(
        "Unsupported file type. Please upload an image (JPG, PNG, WebP, GIF, or HEIC)."
      );
      setState("error");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`Image is too large. Maximum size is ${MAX_FILE_SIZE_LABEL}.`);
      setState("error");
      return;
    }

    const isHeic = (HEIC_MIME_TYPES as readonly string[]).includes(file.type);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;

      if (isHeic) {
        try {
          const response = await fetch("/api/convert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: dataUrl }),
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Conversion failed");
          }

          const { image: convertedDataUrl } = await response.json();
          setImageDataUrl(convertedDataUrl);
          setImagePreview(convertedDataUrl);
          setState("preview");
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Something went wrong"
          );
          setState("error");
        }
      } else {
        setImageDataUrl(dataUrl);
        setImagePreview(dataUrl);
        setState("preview");
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleReset = useCallback(() => {
    setState("idle");
    setImagePreview(null);
    setImageDataUrl(null);
    setAnalysis(null);
    setError(null);
    setOccasion("");
    setAdditionalContext("");
  }, []);

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
          AI Fashion Advisor
        </h1>

        {state === "error" && (
          <div>
            <div
              role="alert"
              className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4 text-red-700 dark:text-red-300"
            >
              {error}
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm hover:bg-zinc-800"
            >
              Try Again
            </button>
          </div>
        )}

        {state === "idle" && (
          <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Upload a photo of your outfit to get a detailed style analysis
            </p>
            <label className="inline-block cursor-pointer px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm hover:bg-zinc-800">
              Choose Photo
              <input
                type="file"
                accept={UPLOAD_ACCEPTED_IMAGE_EXTENSIONS}
                onChange={handleChange}
                className="sr-only"
                aria-label="Upload outfit photo"
              />
            </label>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-3">
              Accepted: JPG, PNG, WebP, GIF, HEIC. Max {MAX_FILE_SIZE_LABEL}.
            </p>
          </div>
        )}

        {state === "preview" && (
          <div className="text-center">
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Outfit preview"
                className="max-h-64 mx-auto rounded-lg mb-4 object-contain"
              />
            )}
            <div className="mb-4">
              <label
                htmlFor="occasion"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Where are you going?
              </label>
              <input
                id="occasion"
                type="text"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                placeholder="e.g. job interview, wedding, casual brunch"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
              />
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm hover:bg-zinc-800"
              >
                Analyze Outfit
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Choose Different Photo
              </button>
            </div>
          </div>
        )}

        {state === "loading" && (
          <div className="text-center">
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Uploaded outfit"
                className="max-h-64 mx-auto rounded-lg mb-4 object-contain"
              />
            )}
            <p className="text-zinc-600 dark:text-zinc-400 animate-pulse">
              Analyzing your outfit...
            </p>
          </div>
        )}

        {state === "results" && analysis && (
          <div>
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Analyzed outfit"
                className="max-h-64 mx-auto rounded-lg mb-6 object-contain"
              />
            )}

            {analysis.overallAssessment.styleProfile && (
              <p className="text-center text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
                Style Profile:{" "}
                <span className="text-zinc-900 dark:text-zinc-100">
                  {analysis.overallAssessment.styleProfile}
                </span>
              </p>
            )}

            <div className="space-y-4 mb-6">
              {(
                Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]
              ).map((key) => {
                const data = analysis[key as keyof OutfitAnalysis];
                return (
                  <AnalysisCard
                    key={key}
                    label={CATEGORY_LABELS[key]}
                    data={data}
                  />
                );
              })}
            </div>

            <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 mb-6">
              <label
                htmlFor="additionalContext"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Add more context
              </label>
              <input
                id="additionalContext"
                type="text"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="e.g. What if I change the shoes? It will be outdoors."
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 mb-2"
              />
              <button
                onClick={handleFollowUp}
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm hover:bg-zinc-800"
              >
                Update Analysis
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm hover:bg-zinc-800"
              >
                Analyze Another Outfit
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}