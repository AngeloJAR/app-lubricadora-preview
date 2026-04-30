"use client";

import { useState } from "react";
import { FileSearch, UploadCloud } from "lucide-react";
import { FacturaXmlUploadForm } from "./factura-xml-upload-form";
import { FacturaImportEditor } from "./factura-import-editor";
import type { FacturaImportPreview, ProductoLite, Proveedor } from "@/types";

type FacturaImportViewProps = {
  proveedores: Proveedor[];
  productos: ProductoLite[];
};

export function FacturaImportView({
  proveedores,
  productos,
}: FacturaImportViewProps) {
  const [preview, setPreview] = useState<FacturaImportPreview | null>(null);

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <UploadCloud className="size-5" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-950">
              Subir XML de factura
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Carga el archivo XML del proveedor para revisar los productos
              antes de registrar la compra.
            </p>
          </div>
        </div>

        <FacturaXmlUploadForm onParsed={setPreview} />
      </section>

      {preview ? (
        <FacturaImportEditor
          data={preview}
          proveedores={proveedores}
          productos={productos}
        />
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <FileSearch className="size-6" />
          </div>

          <h3 className="mt-3 text-sm font-bold text-slate-900">
            Aún no hay factura cargada
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Cuando subas un XML, aquí aparecerá la vista para revisar proveedor,
            items, costos y productos vinculados.
          </p>
        </section>
      )}
    </div>
  );
}