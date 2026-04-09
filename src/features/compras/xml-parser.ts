import type { FacturaImportPreview } from "@/types";

function getText(node: Element | null | undefined, fallback = "") {
  return node?.textContent?.trim() ?? fallback;
}

function toNumber(value: string | null | undefined) {
  const normalized = (value ?? "").replace(/\s/g, "").replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function normalizeDate(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return new Date().toISOString().slice(0, 10);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [dd, mm, yyyy] = trimmed.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  return trimmed;
}

function parseXml(xmlString: string) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, "application/xml");
  const parserError = xml.querySelector("parsererror");

  if (parserError) {
    throw new Error("El XML no es válido.");
  }

  return xml;
}

function extractInnerComprobanteXml(xml: Document): string | null {
  const comprobanteNode = xml.querySelector("comprobante");
  const comprobanteText = comprobanteNode?.textContent?.trim();

  if (!comprobanteText) {
    return null;
  }

  if (
    comprobanteText.includes("<factura") ||
    comprobanteText.includes("<liquidacionCompra") ||
    comprobanteText.includes("<notaCredito") ||
    comprobanteText.includes("<notaDebito")
  ) {
    return comprobanteText;
  }

  return null;
}

function getFirst(doc: Document | Element, selectors: string[]) {
  for (const selector of selectors) {
    const found = doc.querySelector(selector);
    if (found) return found;
  }
  return null;
}

export function parseFacturaXml(xmlString: string): FacturaImportPreview {
  const outerXml = parseXml(xmlString);

  const innerComprobanteXml = extractInnerComprobanteXml(outerXml);
  const xml = innerComprobanteXml ? parseXml(innerComprobanteXml) : outerXml;

  const facturaRoot = xml.querySelector("factura") || xml.documentElement;

  const razonSocial =
    getText(
      getFirst(xml, [
        "factura > infoTributaria > razonSocial",
        "infoTributaria > razonSocial",
        "razonSocial",
      ])
    ) || "Proveedor sin nombre";

  const ruc =
    getText(
      getFirst(xml, [
        "factura > infoTributaria > ruc",
        "infoTributaria > ruc",
        "ruc",
      ])
    ) || null;

  const estab = getText(
    getFirst(xml, [
      "factura > infoTributaria > estab",
      "infoTributaria > estab",
      "estab",
    ])
  );

  const ptoEmi = getText(
    getFirst(xml, [
      "factura > infoTributaria > ptoEmi",
      "infoTributaria > ptoEmi",
      "ptoEmi",
    ])
  );

  const secuencial = getText(
    getFirst(xml, [
      "factura > infoTributaria > secuencial",
      "infoTributaria > secuencial",
      "secuencial",
    ])
  );

  const numeroFactura =
    estab && ptoEmi && secuencial
      ? `${estab}-${ptoEmi}-${secuencial}`
      : getText(
        getFirst(xml, [
          "factura > infoTributaria > claveAcceso",
          "infoTributaria > claveAcceso",
          "claveAcceso",
        ])
      ) || "SIN-NUMERO";

  const fecha = normalizeDate(
    getText(
      getFirst(xml, [
        "factura > infoFactura > fechaEmision",
        "infoFactura > fechaEmision",
        "fechaEmision",
      ])
    )
  );

  const subtotal = toNumber(
    getText(
      getFirst(xml, [
        "factura > infoFactura > totalSinImpuestos",
        "infoFactura > totalSinImpuestos",
        "totalSinImpuestos",
      ])
    )
  );

  const total =
    toNumber(
      getText(
        getFirst(xml, [
          "factura > infoFactura > importeTotal",
          "infoFactura > importeTotal",
          "importeTotal",
        ])
      )
    ) || subtotal;

  const totalImpuestoNode = getFirst(xml, [
    "factura > infoFactura > totalConImpuestos > totalImpuesto",
    "infoFactura > totalConImpuestos > totalImpuesto",
    "totalConImpuestos > totalImpuesto",
  ]);

  const iva =
    toNumber(getText(totalImpuestoNode?.querySelector("valor"))) ||
    Math.max(total - subtotal, 0);

  const detalleNodes = Array.from(
    xml.querySelectorAll("factura > detalles > detalle, detalles > detalle")
  );

  if (!detalleNodes.length) {
    const rootTag = facturaRoot?.tagName || "desconocido";
    throw new Error(
      `No se encontraron items en el XML. Nodo raíz detectado: <${rootTag}>.`
    );
  }

  const items = detalleNodes.map((detalle) => {
    const descripcion = getText(detalle.querySelector("descripcion"));
    const cantidad = toNumber(getText(detalle.querySelector("cantidad")));

    const precioUnitarioBruto = toNumber(
      getText(detalle.querySelector("precioUnitario"))
    );

    const subtotalItem =
      toNumber(getText(detalle.querySelector("precioTotalSinImpuesto"))) ||
      cantidad * precioUnitarioBruto;

    const costoUnitarioNeto =
      cantidad > 0 ? subtotalItem / cantidad : precioUnitarioBruto;

    const impuestoNode = detalle.querySelector("impuestos > impuesto");
    const ivaItem = toNumber(getText(impuestoNode?.querySelector("valor")));
    const totalItem = subtotalItem + ivaItem;

    return {
      descripcion_original: descripcion,
      cantidad,
      costo_unitario: Number(costoUnitarioNeto.toFixed(4)),
      subtotal: subtotalItem,
      iva: ivaItem,
      total: totalItem,
      producto_id: null,
    };
  });

  return {
    proveedor_nombre: razonSocial,
    proveedor_ruc: ruc,
    numero_factura: numeroFactura,
    fecha,
    subtotal,
    iva,
    total,
    items,
  };
}