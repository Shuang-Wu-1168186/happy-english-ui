import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { api, idValue, value } from "../lib/api";
import type { Entry } from "../lib/api";
import {
  courseLandingPath,
  usesOriginalStudyPage,
} from "../lib/course-routes";

type CatalogResponse = { items?: Entry[] };

export function CourseResourceLanding() {
  const { resource = "" } = useParams();
  const [destination, setDestination] = useState("");
  const originalStudyPath = usesOriginalStudyPage(resource)
    ? courseLandingPath(resource)
    : "";

  useEffect(() => {
    if (originalStudyPath) return;
    let active = true;
    api<CatalogResponse>("/learning/modules")
      .then((result) => {
        if (!active) return;
        const module = (result.items || []).find(
          (item) => value(item, "route_key") === resource,
        );
        setDestination(module ? `/course-modules/${idValue(module)}` : "/");
      })
      .catch(() => active && setDestination("/"));
    return () => {
      active = false;
    };
  }, [resource, originalStudyPath]);

  if (originalStudyPath) return <Navigate replace to={originalStudyPath} />;
  if (destination) return <Navigate replace to={destination} />;
  return <div className="empty">正在打开课程专区…</div>;
}
