"use client";

import { useMemo, useState } from "react";
import type { MyCustomer } from "@/backend/customers/customers.service";
import { TextField } from "@/frontend/components/ui/TextField";
import { normalizeSearch } from "@/shared/validation/slug";
import { CustomerRow } from "./CustomerRow";

/** A barber vendégei kereséssel; a megbízhatók elöl. */
export function CustomerList({ customers }: { customers: MyCustomer[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return customers;
    return customers.filter((c) => normalizeSearch(`${c.name} ${c.phone ?? ""}`).includes(q));
  }, [customers, query]);

  if (customers.length === 0) {
    return <p className="text-muted">Még nincs vendéged. Aki egyszer foglal nálad, itt megjelenik.</p>;
  }

  return (
    <div className="space-y-3">
      {customers.length > 6 && (
        <TextField
          label="Keresés"
          name="customerSearch"
          placeholder="név vagy telefonszám"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      {shown.map((c) => (
        <CustomerRow key={c.id} customer={c} />
      ))}
      {shown.length === 0 && <p className="text-muted">Nincs ilyen vendég.</p>}
    </div>
  );
}
