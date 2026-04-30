"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { generarBackupJSON } from "./actions";

export function BackupButton() {
  const [loading, setLoading] = useState(false);

  async function handleBackup() {
    if (loading) return;

    setLoading(true);

    try {
      const data = await generarBackupJSON();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);

      const fecha = new Date().toISOString().slice(0, 19).replace(/:/g, "-");

      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${fecha}.json`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Error generando backup");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBackup}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}

      {loading ? "Generando..." : "Descargar backup"}
    </button>
  );
}