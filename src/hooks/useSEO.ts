import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  language?: 'fr' | 'en';
  structuredData?: object;
}

export const useSEO = ({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
  canonicalUrl,
  language = 'fr',
  structuredData
}: SEOProps) => {
  useEffect(() => {
    // Mettre à jour le titre de la page
    if (title) {
      document.title = title;
    }

    // Mettre à jour la description
    if (description) {
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      }
    }

    // Mettre à jour les mots-clés
    if (keywords) {
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) {
        metaKeywords.setAttribute('content', keywords);
      }
    }

    // Mettre à jour la langue
    document.documentElement.lang = language;

    // Mettre à jour les métadonnées Open Graph
    if (ogTitle) {
      const ogTitleMeta = document.querySelector('meta[property="og:title"]');
      if (ogTitleMeta) {
        ogTitleMeta.setAttribute('content', ogTitle);
      }
    }

    if (ogDescription) {
      const ogDescMeta = document.querySelector('meta[property="og:description"]');
      if (ogDescMeta) {
        ogDescMeta.setAttribute('content', ogDescription);
      }
    }

    if (ogImage) {
      const ogImageMeta = document.querySelector('meta[property="og:image"]');
      if (ogImageMeta) {
        ogImageMeta.setAttribute('content', ogImage);
      }
    }

    // Mettre à jour l'URL canonique
    if (canonicalUrl) {
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', canonicalUrl);
    }

    // Ajouter des données structurées dynamiques
    if (structuredData) {
      const existingScript = document.querySelector('#dynamic-structured-data');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');
      script.id = 'dynamic-structured-data';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, canonicalUrl, language, structuredData]);
};

// Hook pour générer des données structurées pour les clubs
export const useClubStructuredData = (clubs: any[], language: 'fr' | 'en') => {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": language === 'fr' ? "Clubs de Course à Pied en France" : "Running Clubs in France",
    "description": language === 'fr' 
      ? "Liste des clubs de course à pied référencés sur notre carte interactive"
      : "List of running clubs referenced on our interactive map",
    "numberOfItems": clubs.length,
    "itemListElement": clubs.slice(0, 10).map((club, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "SportsClub",
        "name": language === 'en' && club.properties.name_en 
          ? club.properties.name_en 
          : club.properties.name,
        "description": language === 'en' && club.properties.description_en 
          ? club.properties.description_en 
          : club.properties.description,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": club.properties.city,
          "addressCountry": "FR"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": club.geometry.coordinates[1],
          "longitude": club.geometry.coordinates[0]
        },
        "sport": language === 'fr' ? "Course à pied" : "Running",
        "url": club.properties.social?.website || null
      }
    }))
  };
}; 