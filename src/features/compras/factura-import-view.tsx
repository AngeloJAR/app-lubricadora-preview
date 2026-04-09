"use client";

import { useState } from "react";
import { FacturaXmlUploadForm } from "./factura-xml-upload-form";
import { FacturaImportEditor } from "./factura-import-editor";
import type { FacturaImportPreview, ProductoLite, Proveedor }from "@/types";

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
    <div className="grid gap-4">
      <FacturaXmlUploadForm onParsed={setPreview} />

      {preview ? (
        <FacturaImportEditor
          data={preview}
          proveedores={proveedores}
          productos={productos}
        />
      ) : null}
    </div>
  );
}