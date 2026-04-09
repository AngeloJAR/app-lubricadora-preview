type Props = {
  error: string;
  success: string;
};

export function OrdenMensajesSection({ error, success }: Props) {
  return (
    <>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      ) : null}
    </>
  );
}