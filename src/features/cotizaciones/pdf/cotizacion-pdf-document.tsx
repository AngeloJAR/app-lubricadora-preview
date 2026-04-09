import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { ConfiguracionTaller, CotizacionDetalle } from "@/types";

export type CotizacionPdfDocumentProps = {
  cotizacion: CotizacionDetalle;
  configuracion: ConfiguracionTaller | null;
};

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, color: "#111827" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 12,
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  text: { fontSize: 10, marginBottom: 3 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d1d5db",
  },
  cell: { padding: 8, fontSize: 9 },
});

function formatMoney(value: number | string | null | undefined) {
  return Number(value || 0).toFixed(2);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Guayaquil",
  }).format(new Date(value));
}

export function CotizacionPdfDocument({
  cotizacion,
  configuracion,
}: CotizacionPdfDocumentProps) {
  const negocio = configuracion?.nombre_negocio || "AYR Motors Mecánica";
  const telefono = configuracion?.telefono || configuracion?.whatsapp || "-";
  const direccion = configuracion?.direccion || "-";
  const logoUrl = configuracion?.logo_url || "";

  const clienteNombre = cotizacion.clientes
    ? `${cotizacion.clientes.nombres} ${cotizacion.clientes.apellidos}`.trim()
    : "-";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{negocio}</Text>
            <Text style={styles.text}>Dirección: {direccion}</Text>
            <Text style={styles.text}>Teléfono: {telefono}</Text>
          </View>
          {logoUrl ? <Image src={logoUrl} style={{ width: 70, height: 70 }} /> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>Cotización</Text>
          <Text style={styles.text}>Número: {cotizacion.numero}</Text>
          <Text style={styles.text}>Fecha: {formatDate(cotizacion.fecha)}</Text>
          <Text style={styles.text}>
            Válida hasta: {formatDate(cotizacion.validez_hasta)}
          </Text>
          <Text style={styles.text}>Estado: {cotizacion.estado}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <Text style={styles.text}>Nombre: {clienteNombre}</Text>
          <Text style={styles.text}>
            Teléfono: {cotizacion.clientes?.telefono || cotizacion.clientes?.whatsapp || "-"}
          </Text>
          <Text style={styles.text}>Email: {cotizacion.clientes?.email || "-"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehículo</Text>
          <Text style={styles.text}>
            {cotizacion.vehiculos
              ? `${cotizacion.vehiculos.placa} - ${cotizacion.vehiculos.marca} ${cotizacion.vehiculos.modelo}`
              : "-"}
          </Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.cell, { width: "40%" }]}>Item</Text>
          <Text style={[styles.cell, { width: "15%" }]}>Tipo</Text>
          <Text style={[styles.cell, { width: "15%" }]}>Cant.</Text>
          <Text style={[styles.cell, { width: "15%" }]}>P. Unit.</Text>
          <Text style={[styles.cell, { width: "15%" }]}>Total</Text>
        </View>

        {cotizacion.cotizacion_items.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={[styles.cell, { width: "40%" }]}>{item.nombre_item}</Text>
            <Text style={[styles.cell, { width: "15%" }]}>{item.tipo_item}</Text>
            <Text style={[styles.cell, { width: "15%" }]}>{item.cantidad}</Text>
            <Text style={[styles.cell, { width: "15%" }]}>
              ${formatMoney(item.precio_unitario)}
            </Text>
            <Text style={[styles.cell, { width: "15%" }]}>
              ${formatMoney(item.total)}
            </Text>
          </View>
        ))}

        <View style={{ marginTop: 16, marginLeft: "auto", width: 200 }}>
          <Text style={styles.text}>Subtotal: ${formatMoney(cotizacion.subtotal)}</Text>
          <Text style={styles.text}>Descuento: ${formatMoney(cotizacion.descuento)}</Text>
          <Text style={{ fontSize: 12, fontWeight: 700 }}>
            Total: ${formatMoney(cotizacion.total)}
          </Text>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>Notas</Text>
          <Text style={styles.text}>{cotizacion.notas || "Sin notas."}</Text>
        </View>
      </Page>
    </Document>
  );
}