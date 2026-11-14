import photos from "@/lib/photos.json";
type PhotoName = keyof typeof photos;
export function ResponsivePhoto({ name, alt, sizes, className, priority = false, desktopOnly = false }: {
  name: PhotoName; alt: string; sizes: string; className?: string; priority?: boolean; desktopOnly?: boolean;
}) {
  const photo = photos[name];
  const srcSet = photo.variants.map(item => item.src + " " + item.width + "w").join(", ");
  return <picture><source media={desktopOnly ? "(min-width: 701px)" : undefined} type="image/webp" srcSet={srcSet} sizes={sizes} /><img
    className={"responsive-photo " + (className ?? "")}
    src={desktopOnly ? "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" : photo.variants[photo.variants.length - 1].src}
    width={photo.width} height={photo.height} alt={alt}
    loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async"
  /></picture>;
}
