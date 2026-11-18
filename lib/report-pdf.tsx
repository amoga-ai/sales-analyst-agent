// lib/report-pdf.tsx: Builds a text-based PDF of a report in the browser. The text stays selectable. Two-column reports with numbers also get a bar for each row.
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";

const BAR_COLOR = "#7c3aed";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#18181b" },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  meta: { fontSize: 9, color: "#71717a", marginBottom: 16 },
  headerRow: { flexDirection: "row", backgroundColor: "#f4f4f5", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#d4d4d8" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#e4e4e7" },
  headerCell: { flex: 1, fontSize: 9, fontWeight: "bold", color: "#52525b" },
  headerCellRight: { flex: 1, fontSize: 9, fontWeight: "bold", color: "#52525b", textAlign: "right" },
  cell: { flex: 1 },
  cellRight: { flex: 1, textAlign: "right" },
  barLabel: { width: "35%" },
  barTrack: { flex: 1, height: 8, backgroundColor: "#f4f4f5", borderRadius: 4, marginHorizontal: 8 },
  barFill: { height: 8, backgroundColor: BAR_COLOR, borderRadius: 4 },
  barValue: { width: 60, textAlign: "right" },
});

// A report with two columns, where every second value is a number, gets a bar for each row.
function isBarReport(columns: (string | number)[], rows: (string | number)[][]): boolean {
  return columns.length === 2 && rows.length > 0 && rows.every((r) => r[1] !== "" && !Number.isNaN(Number(r[1])));
}

// The document layout: title, a line with the generated time, the header row, then the rows or bars.
function ReportDocument({ title, columns, rows }: { title: string; columns: (string | number)[]; rows: (string | number)[][] }) {
  const generated = new Date().toLocaleString();
  const bars = isBarReport(columns, rows);
  const max = bars ? Math.max(0, ...rows.map((r) => Number(r[1]))) : 0;
  return (
    <Document title={title}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>Generated {generated}</Text>
        <View style={styles.headerRow}>
          {columns.map((c, i) => (
            <Text key={i} style={i === 0 ? styles.headerCell : styles.headerCellRight}>{String(c)}</Text>
          ))}
        </View>
        {rows.map((row, r) =>
          bars ? (
            <View key={r} style={styles.row} wrap={false}>
              <Text style={styles.barLabel}>{String(row[0])}</Text>
              <View style={styles.barTrack}>
                <View style={{ ...styles.barFill, width: `${max > 0 ? (Number(row[1]) / max) * 100 : 0}%` }} />
              </View>
              <Text style={styles.barValue}>{String(row[1])}</Text>
            </View>
          ) : (
            <View key={r} style={styles.row} wrap={false}>
              {row.map((cell, i) => (
                <Text key={i} style={i === 0 ? styles.cell : styles.cellRight}>{String(cell)}</Text>
              ))}
            </View>
          ),
        )}
      </Page>
    </Document>
  );
}

// Returns the PDF as a file (Blob) that the browser can show or download.
export function reportPdfBlob(title: string, columns: (string | number)[], rows: (string | number)[][]): Promise<Blob> {
  return pdf(<ReportDocument title={title} columns={columns} rows={rows} />).toBlob();
}