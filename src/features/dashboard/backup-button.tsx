"use client";

import { generarBackupJSON } from "./actions";

export function BackupButton() {
  async function handleBackup() {
    try {
      const data = await generarBackupJSON();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString()}.json`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Error generando backup");
    }
  }

  return (
    <button
      onClick={handleBackup}
      className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90"
    >
      💾 Descargar backup
    </button>
  );
}