/* eslint-disable @next/next/no-img-element */
export function StaticIcon({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) {
  return <img src={src} alt={alt} width={width} height={height} decoding="async" />;
}
