import type { ReactNode } from "react";
import { Avatar } from "@/frontend/components/ui/Avatar";
import { Eyebrow } from "@/frontend/components/ui/Eyebrow";
import { Icon } from "@/frontend/components/ui/Icon";

type ProfileHeroProps = {
  eyebrow: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  address: string;
  phone: string;
  instagram: string | null;
  /** Gombok (pl. „Időpontot foglalok”) */
  actions?: ReactNode;
};

/** Barber vagy egység oldalának nyitó része: név, bemutatkozás, cím, telefon, Instagram. */
export function ProfileHero({ eyebrow, name, avatarUrl, bio, address, phone, instagram, actions }: ProfileHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_10%,rgba(212,169,94,0.16),transparent_55%)]"
      />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-6 px-5 py-12 sm:py-16">
        <div>
          <Eyebrow pill>{eyebrow}</Eyebrow>
        </div>
        <div className="flex items-center gap-5">
          {avatarUrl && <Avatar url={avatarUrl} name={name} size={96} />}
          <h1 className="text-5xl font-bold sm:text-6xl">{name}</h1>
        </div>
        {bio && <p className="max-w-2xl text-lg text-muted">{bio}</p>}
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-muted">
          <li className="flex items-center gap-2">
            <Icon name="mapPin" size={18} className="text-brass" /> {address}
          </li>
          <li className="flex items-center gap-2">
            <Icon name="phone" size={18} className="text-brass" />
            <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-foreground">
              {phone}
            </a>
          </li>
          {instagram && <li>@{instagram}</li>}
        </ul>
        {actions && <div className="flex flex-col gap-3 sm:flex-row">{actions}</div>}
      </div>
    </section>
  );
}
