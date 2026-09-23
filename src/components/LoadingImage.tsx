import { useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { asset } from "../lib/api";

type LoadingImageProps = Omit<ComponentPropsWithoutRef<"img">, "src"> & {
  src: string;
  fallbackSrc?: string;
};

/** Uses the loading illustration as the image background without changing layout. */
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
  style,
  ...props
}: LoadingImageProps) {
  const [activeSrc, setActiveSrc] = useState(src);

  return (
    <img
      {...props}
      src={activeSrc}
      style={{
        backgroundColor: "#f1edff",
        backgroundImage: `url("${asset("/static/images/image-loading.svg")}")`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "contain",
        ...style,
      }}
      onError={(event) => {
        onError?.(event);
        if (fallbackSrc && activeSrc !== fallbackSrc) {
          setActiveSrc(fallbackSrc);
        }
      }}
    />
  );
}
