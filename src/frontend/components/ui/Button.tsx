import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  // Arany gradiens, rámutatva fénycsík fut végig rajta és arany fénye lesz
  primary:
    "ct-shine bg-[linear-gradient(135deg,#e2bb73,#d4a95e_45%,#b88c42)] text-background shadow-[0_6px_20px_-8px_rgb(212_169_94/0.55)] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-10px_rgb(212_169_94/0.7)]",
  secondary:
    "border border-line bg-transparent text-foreground hover:-translate-y-0.5 hover:border-brass hover:text-brass hover:shadow-[0_10px_24px_-14px_rgb(212_169_94/0.6)]",
  ghost: "text-muted hover:text-foreground",
  danger: "bg-danger text-background hover:-translate-y-0.5 hover:brightness-110",
};

/** A gombok közös stílusa – a LinkButton is ezt használja, hogy ugyanúgy nézzen ki. */
export function buttonClasses(variant: ButtonVariant = "primary", fullWidth = false): string {
  return [
    "inline-flex min-h-13 items-center justify-center gap-2.5 rounded-lg px-6 text-base font-semibold",
    "transition duration-200 ease-out active:translate-y-0 active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-60",
    VARIANTS[variant],
    fullWidth ? "w-full" : "",
  ].join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; fullWidth?: boolean };

/** Nagy, jól nyomható gomb (mobilra méretezve). */
export function Button({ variant, fullWidth, className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={`${buttonClasses(variant, fullWidth)} ${className}`} {...props} />;
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; fullWidth?: boolean };

/** Gombnak kinéző link (másik oldalra visz). */
export function LinkButton({ variant, fullWidth, className = "", ...props }: LinkButtonProps) {
  return <Link className={`${buttonClasses(variant, fullWidth)} ${className}`} {...props} />;
}
