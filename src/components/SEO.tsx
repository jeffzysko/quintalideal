import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  keywords?: string;
  jsonLd?: Record<string, unknown>;
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function SEO({ title, description, canonical, ogImage, keywords, jsonLd }: SEOProps) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    setMeta("name", "description", description);
    if (keywords) setMeta("name", "keywords", keywords);
    setLink("canonical", canonical);

    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:locale", "pt_BR");
    setMeta("property", "og:site_name", "Quintal Ideal");
    if (ogImage) {
      setMeta("property", "og:image", ogImage);
      setMeta("property", "og:image:width", "1200");
      setMeta("property", "og:image:height", "630");
    }

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    if (ogImage) setMeta("name", "twitter:image", ogImage);

    let scriptEl: HTMLScriptElement | null = null;
    if (jsonLd) {
      scriptEl = document.createElement("script");
      scriptEl.type = "application/ld+json";
      scriptEl.text = JSON.stringify(jsonLd);
      scriptEl.dataset.seo = "page";
      document.head.appendChild(scriptEl);
    }

    return () => {
      document.title = prevTitle;
      if (scriptEl) scriptEl.remove();
    };
  }, [title, description, canonical, ogImage, keywords, jsonLd]);

  return null;
}
