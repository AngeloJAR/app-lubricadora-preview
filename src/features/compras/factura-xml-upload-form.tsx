"use client";

import { useState } from "react";
import { parseFacturaXml } from "./xml-parser";
import type { FacturaImportPreview } from "@/types";

type FacturaXmlUploadFormProps = {
  onParsed: (data: FacturaImportPreview) => void;
};

export function FacturaXmlUploadForm({
  onParsed,
}: FacturaXmlUploadFormProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setLoading(true);

    try {
      const text = await file.text();
      const parsed = parseFacturaXml(text);
      onParsed(parsed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo leer el archivo XML."
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <label className="text-sm font-medium">Subir XML de factura</label>
        <input
          type="file"
          accept=".xml,text/xml,application/xml"
          onChange={handleFileChange}
          className="rounded-lg border px-3 py-2"
        />
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Leyendo XML...</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}