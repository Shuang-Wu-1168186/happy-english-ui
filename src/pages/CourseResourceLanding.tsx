import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { api, value } from "../lib/api";
import type { Entry } from "../lib/api";

type CatalogResponse = { items?: Entry[] };

export function CourseResourceLanding() {
  const { resource = "" } = useParams();
  const [destination, setDestination] = useState("");

  useEffect(() => {
    let active = true;
    api<CatalogResponse>("/learning/modules")
      .then((result) => {
        if (!active) return;
        const module = (result.items || []).find(
          (item) => value(item, "route_key") === resource,
        );
        setDestination(module ? `/course-modules/${module.id}` : "/");
      })
      .catch(() => active && setDestination("/"));
    return () => {
      active = false;
    };
  }, [resource]);

  if (destination) return <Navigate replace to={destination} />;
  return <div className="empty">正在打开课程专区…</div>;
}
