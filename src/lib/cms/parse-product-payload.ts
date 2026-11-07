import type { ProductPayload } from "@/lib/cms/entity-data";

function parseJson<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (!raw || typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseGallery(formData: FormData) {
  const raw = formData.get("galleryMediaIds");
  if (!raw || typeof raw !== "string") return [] as string[];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return raw ? [raw] : [];
  }
}

export function readProductPayloadFromForm(formData: FormData): ProductPayload {
  return {
    specifications: parseJson(formData.get("_specs"), []),
    features: parseJson(formData.get("_features"), []),
    applications: parseJson(formData.get("_applications"), []),
    documents: parseJson(formData.get("_documents"), []),
    options: parseJson(formData.get("_options"), []),
    technicalTables: parseJson(formData.get("_technicalTables"), []),
    relatedProducts: parseJson(formData.get("_related"), []),
    relatedPosts: parseJson(formData.get("_relatedPosts"), []),
    galleryMediaIds: parseGallery(formData),
    applicationImageIds: [],
    sections: parseJson(formData.get("_sections"), []),
    faqs: parseJson(formData.get("_faqs"), []),
    contentTables: parseJson(formData.get("_contentTables"), []),
  };
}
