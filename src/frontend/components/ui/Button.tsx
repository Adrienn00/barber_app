import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brass text-background hover:bg-brass-dark",
  secondary: "border border-line bg-transparent text-foreground hover:border-brass hover:text-brass",
  ghost: "text-muted hover:text-foreground",
  danger: "bg-danger text-background hover:brightness-110",
};

/** A gombok közös stílusa – a LinkButton is ezt használja, hogy ugyanúgy nézzen ki. */
export function buttonClasses(variant: ButtonVariant = "primary", fullWidth = false): string {
  return [
    "inline-flex min-h-13 items-center justify-center gap-2.5 rounded-lg px-6 text-base font-semibold transition",
    "disabled:cursor-not-allowed disabled:opacity-60",
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
