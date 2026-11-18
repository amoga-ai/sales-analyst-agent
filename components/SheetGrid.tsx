// Editable spreadsheet grid for a CSV sheet, adapted from the AI SDK template's sheet editor.
"use client";

import { parse, unparse } from "papaparse";
import { useCallback, useEffect, useMemo, useState } from "react";
import DataGrid, { textEditor } from "react-data-grid";
import "react-data-grid/lib/styles.css";

const MIN_ROWS = 50;
const MIN_COLS = 26;

type Row = Record<string, string | number>;

// Shows the CSV as an editable grid, and reports each edit back as CSV text.
export default function SheetGrid({ csv, onChange }: { csv: string; onChange?: (csv: string) => void }) {
    const data = useMemo(() => {
        const rows = parse<string[]>(csv, { skipEmptyLines: true }).data;
        const padded = rows.map((r) => {
            const p = [...r];
            while (p.length < MIN_COLS) p.push("");
            return p;
        });
        while (padded.length < MIN_ROWS) padded.push(new Array(MIN_COLS).fill(""));
        return padded;
    }, [csv]);

    const columns = useMemo(
        () => [
            {
                key: "rowNumber",
                name: "",
                frozen: true,
                width: 50,
                renderCell: ({ rowIdx }: { rowIdx: number }) => rowIdx + 1,
            },
            ...Array.from({ length: MIN_COLS }, (_, i) => ({
                key: String(i),
                name: String.fromCharCode(65 + i),
                renderEditCell: textEditor,
                width: 120,
            })),
        ],
        [],
    );

    const initialRows = useMemo<Row[]>(
        () =>
            data.map((row, rowIndex) => {
                const r: Row = { id: rowIndex, rowNumber: rowIndex + 1 };
                for (let i = 0; i < MIN_COLS; i++) r[String(i)] = row[i] || "";
                return r;
            }),
        [data],
    );

    const [rows, setRows] = useState<Row[]>(initialRows);
    useEffect(() => setRows(initialRows), [initialRows]);

    const handleRowsChange = (next: Row[]) => {
        setRows(next);
        const out = next.map((r) => Array.from({ length: MIN_COLS }, (_, i) => String(r[String(i)] ?? "")));
        onChange?.(unparse(out));
    };

    // Opens the cell editor on one click, as the template does.
    const handleCellClick = useCallback(
        (args: { column: { key: string }; selectCell: (enableEditor?: boolean) => void }) => {
            if (args.column.key !== "rowNumber") args.selectCell(true);
        },
        [],
    );

    return (
        <DataGrid
            className="rdg-light"
            columns={columns}
            rows={rows}
            onRowsChange={handleRowsChange}
            onCellClick={handleCellClick}
            enableVirtualization
            defaultColumnOptions={{ resizable: true, sortable: true }}
            style={{ height: "100%" }}
        />
    );
}