import { useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { asset } from "../lib/api";

type LoadingImageProps = Omit<ComponentPropsWithoutRef<"img">, "src"> & {
  src: string;
  fallbackSrc?: string;
};

/** Shows the deployed static loading illustration until the requested image is ready. */
export function LoadingImage({
  src,
  ...props
}: LoadingImageProps) {
  return <LoadingImageSource key={src} src={src} {...props} />;
}

function LoadingImageSource({
  src,
  fallbackSrc,
  className,
  onError,
  onLoad,
  ...props
}: LoadingImageProps) {
  const [activeSrc, setActiveSrc] = useState(src);
  const [state, setState] = useState<"loading" | "loaded" | "failed">(
    "loading",
  );

  return (
    <span
      className={`loading-image loading-image--${state}`}
      aria-busy={state === "loading"}
    >
      {state !== "loaded" && (
        <img
          className="loading-image__placeholder"
          src={asset("/static/images/image-loading.svg")}
          alt=""
          aria-hidden="true"
        />
      )}
      <img
        {...props}
        className={`loading-image__content${className ? ` ${className}` : ""}`}
        src={activeSrc}
        onLoad={(event) => {
          setState("loaded");
          onLoad?.(event);
        }}
        onError={(event) => {
          onError?.(event);
          if (fallbackSrc && activeSrc !== fallbackSrc) {
            setActiveSrc(fallbackSrc);
            setState("loading");
            return;
          }
          setState("failed");
        }}
      />
    </span>
  );
}
