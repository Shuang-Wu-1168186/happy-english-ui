import { useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { asset } from "../lib/api";

type LoadingImageProps = Omit<ComponentPropsWithoutRef<"img">, "src"> & {
  src: string;
  fallbackSrc?: string;
};

/** Covers progressive image decoding until the complete image is ready to paint. */
export function LoadingImage({
  src,
  ...props
}: LoadingImageProps) {
  return <LoadingImageSource key={src} src={src} {...props} />;
}

function LoadingImageSource({
  src,
  fallbackSrc,
  onError,
  onLoad,
  ...props
}: LoadingImageProps) {
  const [activeSrc, setActiveSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <img
        {...props}
        src={activeSrc}
        onLoad={(event) => {
          const image = event.currentTarget;
          const imageSrc = image.currentSrc;
          void image
            .decode()
            .catch(() => undefined)
            .then(() => {
              if (image.currentSrc === imageSrc) setLoaded(true);
            });
          onLoad?.(event);
        }}
        onError={(event) => {
          onError?.(event);
          if (fallbackSrc && activeSrc !== fallbackSrc) {
            setLoaded(false);
            setActiveSrc(fallbackSrc);
          }
        }}
      />
      {!loaded && (
        <img
          className="loading-image__placeholder"
          src={asset("/static/images/image-loading.svg")}
          alt=""
          aria-hidden="true"
        />
      )}
    </>
  );
}
