import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ConfiguracionTaller, OrdenDetalle } from "@/types";
import { getEstadoLabel } from "@/utils/orden-status";
import { formatDate, formatMoney } from "@/features/ordenes/pdf-formatters";
import { PDF_TEXTS } from "@/features/ordenes/pdf-texts";

export type OrdenPdfDocumentProps = {
  orden: OrdenDetalle;
  configuracion: ConfiguracionTaller | null;
  titulo?: string;
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    color: "#111827",
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#111827",
    paddingBottom: 14,
    marginBottom: 14,
  },
  businessTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 5,
    color: "#111827",
  },
  subtitle: {
    fontSize: 9,
    color: "#4b5563",
    marginBottom: 3,
  },
  logo: {
    width: 78,
    height: 78,
    objectFit: "contain",
  },

  titleBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#111827",
    padding: 12,
    marginBottom: 14,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#ffffff",
  },
  documentMeta: {
    fontSize: 9,
    color: "#e5e7eb",
    marginTop: 3,
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    color: "#111827",
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 9,
    fontWeight: 700,
  },

  twoCols: {
    flexDirection: "row",
    marginBottom: 14,
  },
  colLeft: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 10,
    marginRight: 6,
  },
  colRight: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 10,
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
    color: "#111827",
  },
  rowText: {
    marginBottom: 4,
    lineHeight: 1.4,
    color: "#374151",
  },
  label: {
    fontWeight: 700,
    color: "#111827",
  },

  table: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  th: {
    padding: 8,
    fontSize: 8.5,
    fontWeight: 700,
    color: "#374151",
  },
  td: {
    padding: 8,
    fontSize: 8.5,
    color: "#111827",
  },
  wItem: { width: "42%" },
  wTipo: { width: "16%" },
  wCant: { width: "10%" },
  wPrecio: { width: "16%" },
  wTotal: { width: "16%" },

  bottomGrid: {
    flexDirection: "row",
    marginTop: 2,
  },
  notesBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 10,
    marginRight: 8,
  },
  totalsBox: {
    width: 190,
    borderWidth: 1,
    borderColor: "#111827",
    padding: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  totalLabel: {
    color: "#4b5563",
  },
  totalValue: {
    fontWeight: 700,
    color: "#111827",
  },
  grandTotal: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#111827",
  },
  grandTotalText: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111827",
  },

  footer: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    textAlign: "center",
    fontSize: 9,
    color: "#4b5563",
  },
});

export function OrdenPdfDocument({
  orden,
  configuracion,
  titulo = PDF_TEXTS.titulo_pdf_default,
}: OrdenPdfDocumentProps): React.ReactElement<DocumentProps> {
  const clienteNombre = orden.clientes
    ? `${orden.clientes.nombres} ${orden.clientes.apellidos}`.trim()
    : PDF_TEXTS.cliente_no_disponible;

  const vehiculoNombre = orden.vehiculos
    ? `${orden.vehiculos.marca} ${orden.vehiculos.modelo}`.trim()
    : PDF_TEXTS.vehiculo_no_disponible;

  const negocio = configuracion?.nombre_negocio || PDF_TEXTS.negocio_default;
  const telefono =
    configuracion?.telefono ||
    configuracion?.whatsapp ||
    PDF_TEXTS.dato_no_disponible;
  const direccion = configuracion?.direccion || PDF_TEXTS.dato_no_disponible;
  const mensajeFinal =
    configuracion?.mensaje_final || PDF_TEXTS.mensaje_final_default;
  const logoUrl = configuracion?.logo_url || "";

  return (
    <Document
      title={`${titulo} - ${orden.numero}`}
      author={negocio}
      subject={titulo}
      creator={negocio}
      producer={negocio}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.businessTitle}>{negocio}</Text>
            <Text style={styles.subtitle}>Dirección: {direccion}</Text>
            <Text style={styles.subtitle}>Teléfono: {telefono}</Text>
          </View>

          {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
        </View>

        <View style={styles.titleBox}>
          <View>
            <Text style={styles.documentTitle}>{titulo}</Text>
            <Text style={styles.documentMeta}>Documento N° {orden.numero}</Text>
            <Text style={styles.documentMeta}>
              Fecha: {formatDate(orden.fecha)}
            </Text>
          </View>

          <Text style={styles.statusBadge}>{getEstadoLabel(orden.estado)}</Text>
        </View>

        <View style={styles.twoCols}>
          <View style={styles.colLeft}>
            <Text style={styles.sectionTitle}>Cliente</Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Nombre: </Text>
              {clienteNombre}
            </Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Teléfono: </Text>
              {orden.clientes?.telefono || orden.clientes?.whatsapp || "-"}
            </Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Email: </Text>
              {orden.clientes?.email || "-"}
            </Text>
          </View>

          <View style={styles.colRight}>
            <Text style={styles.sectionTitle}>Vehículo / Orden</Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Vehículo: </Text>
              {vehiculoNombre}
            </Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Placa: </Text>
              {orden.vehiculos?.placa || "-"}
            </Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Km ingreso: </Text>
              {orden.kilometraje ?? "-"}
            </Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Km salida: </Text>
              {orden.kilometraje_final ?? "-"}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.wItem]}>Item</Text>
            <Text style={[styles.th, styles.wTipo]}>Tipo</Text>
            <Text style={[styles.th, styles.wCant]}>Cant.</Text>
            <Text style={[styles.th, styles.wPrecio]}>P. Unit.</Text>
            <Text style={[styles.th, styles.wTotal]}>Total</Text>
          </View>

          {orden.orden_items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.td, styles.wItem]}>{item.nombre_item}</Text>
              <Text style={[styles.td, styles.wTipo]}>
                {item.tipo_item === "servicio" ? "Servicio" : "Producto"}
              </Text>
              <Text style={[styles.td, styles.wCant]}>{item.cantidad}</Text>
              <Text style={[styles.td, styles.wPrecio]}>
                ${formatMoney(item.precio_unitario)}
              </Text>
              <Text style={[styles.td, styles.wTotal]}>
                ${formatMoney(item.total)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomGrid}>
          <View style={styles.notesBox}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={styles.rowText}>
              {orden.notas || PDF_TEXTS.sin_notas}
            </Text>

            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>
              Observaciones técnicas
            </Text>
            <Text style={styles.rowText}>
              {orden.observaciones_tecnicas ||
                PDF_TEXTS.sin_observaciones_tecnicas}
            </Text>

            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>
              Próximo mantenimiento
            </Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Fecha: </Text>
              {formatDate(orden.proximo_mantenimiento_fecha)}
            </Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Kilometraje: </Text>
              {orden.proximo_mantenimiento_km ?? "-"}
            </Text>
          </View>

          <View style={styles.totalsBox}>
            <Text style={styles.sectionTitle}>Resumen</Text>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                ${formatMoney(orden.subtotal)}
              </Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Descuento</Text>
              <Text style={styles.totalValue}>
                -${formatMoney(orden.descuento)}
              </Text>
            </View>

            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={styles.grandTotalText}>Total</Text>
              <Text style={styles.grandTotalText}>
                ${formatMoney(orden.total)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>{mensajeFinal}</Text>
      </Page>
    </Document>
  );
}