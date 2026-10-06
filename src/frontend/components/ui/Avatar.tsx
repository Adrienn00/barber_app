import Image from "next/image";

type AvatarProps = {
  /** A kép címe; ha nincs, a név kezdőbetűi látszanak */
  url: string | null;
  name: string;
  size?: number;
};

/** Kerek profilkép, kép nélkül arany alapon a név kezdőbetűivel. */
export function Avatar({ url, name, size = 48 }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={size}
        height={size}
        // A kép már 512 px-es webp a tárhelyen – nem kell újra optimalizálni
        unoptimized
        className="shrink-0 rounded-full border border-line object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-brass font-display font-bold text-background"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
