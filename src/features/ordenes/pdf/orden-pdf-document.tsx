import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { ConfiguracionTaller, OrdenDetalle } from "@/types";
import { getEstadoLabel } from "@/utils/orden-status";
import type { DocumentProps } from "@react-pdf/renderer";
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 12,
    marginBottom: 14,
  },
  logo: {
    width: 80,
    height: 80,
    objectFit: "contain",
  },
  businessTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: "#4b5563",
    marginBottom: 2,
  },
  documentTitleBox: {
    marginBottom: 14,
    padding: 10,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
  },
  documentText: {
    fontSize: 10,
    color: "#374151",
  },
  twoCols: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  col: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
  },
  rowText: {
    marginBottom: 4,
    lineHeight: 1.4,
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
    fontSize: 9,
    fontWeight: 700,
  },
  td: {
    padding: 8,
    fontSize: 9,
  },
  wItem: {
    width: "40%",
  },
  wTipo: {
    width: "16%",
  },
  wCant: {
    width: "12%",
  },
  wPrecio: {
    width: "16%",
  },
  wTotal: {
    width: "16%",
  },
  bottomGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  notesBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 10,
  },
  totalsBox: {
    width: 180,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  totalStrong: {
    fontSize: 12,
    fontWeight: 700,
  },
  footer: {
    marginTop: 16,
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
    ? `${orden.vehiculos.marca} ${orden.vehiculos.modelo}`
    : PDF_TEXTS.vehiculo_no_disponible;

  const negocio =
    configuracion?.nombre_negocio || PDF_TEXTS.negocio_default;
  const telefono =
    configuracion?.telefono ||
    configuracion?.whatsapp ||
    PDF_TEXTS.dato_no_disponible;
  const direccion =
    configuracion?.direccion || PDF_TEXTS.dato_no_disponible;
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

        <View style={styles.documentTitleBox}>
          <Text style={styles.documentTitle}>{titulo}</Text>
          <Text style={styles.documentText}>Documento N° {orden.numero}</Text>
          <Text style={styles.documentText}>
            Fecha: {formatDate(orden.fecha)}
          </Text>
        </View>

        <View style={styles.twoCols}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Cliente</Text>
            <Text style={styles.rowText}>Nombre: {clienteNombre}</Text>
            <Text style={styles.rowText}>
              Teléfono: {orden.clientes?.telefono || orden.clientes?.whatsapp || "-"}
            </Text>
            <Text style={styles.rowText}>
              Email: {orden.clientes?.email || "-"}
            </Text>
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Vehículo / orden</Text>
            <Text style={styles.rowText}>Vehículo: {vehiculoNombre}</Text>
            <Text style={styles.rowText}>
              Placa: {orden.vehiculos?.placa || "-"}
            </Text>
            <Text style={styles.rowText}>
              Estado: {getEstadoLabel(orden.estado)}
            </Text>
            <Text style={styles.rowText}>
              Km ingreso: {orden.kilometraje ?? "-"}
            </Text>
            <Text style={styles.rowText}>
              Km salida: {orden.kilometraje_final ?? "-"}
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
              {orden.observaciones_tecnicas || PDF_TEXTS.sin_observaciones_tecnicas}
            </Text>

            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>
              Próximo mantenimiento
            </Text>
            <Text style={styles.rowText}>
              Fecha: {formatDate(orden.proximo_mantenimiento_fecha)}
            </Text>
            <Text style={styles.rowText}>
              Kilometraje: {orden.proximo_mantenimiento_km ?? "-"}
            </Text>
          </View>

          <View style={styles.totalsBox}>
            <Text style={styles.sectionTitle}>Resumen</Text>

            <View style={styles.totalRow}>
              <Text>Subtotal</Text>
              <Text>${formatMoney(orden.subtotal)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text>Descuento</Text>
              <Text>${formatMoney(orden.descuento)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalStrong}>Total</Text>
              <Text style={styles.totalStrong}>${formatMoney(orden.total)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>{mensajeFinal}</Text>
      </Page>
    </Document>
  );
}