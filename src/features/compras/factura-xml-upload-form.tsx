"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { parseFacturaXml } from "./xml-parser";
import type { FacturaImportPreview } from "@/types";

type FacturaXmlUploadFormProps = {
  onParsed: (data: FacturaImportPreview) => void;
};

export function FacturaXmlUploadForm({ onParsed }: FacturaXmlUploadFormProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setFileName(file.name);
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
      <label className="group flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center transition hover:border-slate-400 hover:bg-slate-50">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
          {loading ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <FileUp className="size-6" />
          )}
        </div>

        <span className="mt-4 text-sm font-bold text-slate-950">
          {loading ? "Leyendo XML..." : "Seleccionar archivo XML"}
        </span>

        <span className="mt-1 max-w-md text-sm text-slate-500">
          Sube el XML de la factura del proveedor para detectar productos,
          cantidades y totales.
        </span>

        {fileName ? (
          <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            <CheckCircle2 className="size-3.5 text-green-600" />
            {fileName}
          </span>
        ) : null}

        <input
          type="file"
          accept=".xml,text/xml,application/xml"
          onChange={handleFileChange}
          className="sr-only"
        />
      </label>

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      ) : null}
    </div>
  );
}