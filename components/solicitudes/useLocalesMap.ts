import { useEffect, useState } from "react";
import { getLocales, Local } from "@/lib/api/locales";

export function useLocalesMap() {
  const [localesMap, setLocalesMap] = useState<Record<number, Local>>( {} );
  useEffect(() => {
    getLocales().then((locales) => {
      const map: Record<number, Local> = {};
      locales.forEach((l) => { map[l.id] = l; });
      setLocalesMap(map);
    });
  }, []);
  return localesMap;
}
