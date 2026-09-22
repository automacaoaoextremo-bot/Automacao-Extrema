"use client";

import { useMemo, useState } from "react";

type CampaignGalleryProps = {
  images: string[];
  altBase: string;
};

export function CampaignGallery({ images, altBase }: CampaignGalleryProps) {
  const normalizedImages = useMemo(
    () => Array.from(new Set(images.map((item) => item.trim()).filter(Boolean))),
    [images],
  );
  const [index, setIndex] = useState(0);

  if (!normalizedImages.length) {
    return (
      <div className="impacto-gallery-empty">
        <span aria-hidden="true">🚲</span>
        <strong>Fotos da bicicleta</strong>
      </div>
    );
  }

  const safeIndex = Math.min(index, normalizedImages.length - 1);
  const currentImage = normalizedImages[safeIndex];

  function previous() {
    setIndex((current) => (current <= 0 ? normalizedImages.length - 1 : current - 1));
  }

  function next() {
    setIndex((current) => (current >= normalizedImages.length - 1 ? 0 : current + 1));
  }

  return (
    <section className="impacto-gallery-card" aria-label="Fotos da bicicleta">
      <div className="impacto-gallery-stage">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagens da campanha podem vir do cadastro do cliente. */}
        <img
          src={currentImage}
          alt={`${altBase} — foto ${safeIndex + 1}`}
          className="impacto-gallery-main-image"
        />

        {normalizedImages.length > 1 ? (
          <>
            <button
              type="button"
              className="impacto-gallery-arrow impacto-gallery-arrow-left"
              onClick={previous}
              aria-label="Foto anterior"
            >
              ‹
            </button>
            <button
              type="button"
              className="impacto-gallery-arrow impacto-gallery-arrow-right"
              onClick={next}
              aria-label="Próxima foto"
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      <div className="impacto-gallery-footer">
        <span>
          Foto {safeIndex + 1} de {normalizedImages.length}
        </span>

        {normalizedImages.length > 1 ? (
          <div className="impacto-gallery-dots" aria-label="Selecionar foto">
            {normalizedImages.map((_, dotIndex) => (
              <button
                key={dotIndex}
                type="button"
                className={dotIndex === safeIndex ? "active" : ""}
                onClick={() => setIndex(dotIndex)}
                aria-label={`Ver foto ${dotIndex + 1}`}
                aria-current={dotIndex === safeIndex ? "true" : undefined}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
