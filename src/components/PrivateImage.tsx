import { useEffect, useState } from "react";
import { imageUrl } from "../lib/data";
export function PrivateImage({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setUrl("");
    setFailed(false);
    imageUrl(path)
      .then((url) => {
        if (active) setUrl(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [path]);
  if (failed) return <small>Não foi possível carregar a imagem.</small>;
  return url ? (
    <img
      className="private-image"
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
    />
  ) : (
    <small role="status">Carregando imagem…</small>
  );
}
