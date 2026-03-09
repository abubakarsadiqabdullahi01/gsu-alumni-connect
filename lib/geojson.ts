// src/lib/geojson.ts
// Fetches ONCE at build time, cached by Next.js indefinitely
// No client-side fetch, no loading state needed

const NIGERIA_GEOJSON_URL =
    "https://temikeezy.github.io/nigeria-geojson-data/data/full.json";

export async function getNigeriaGeoJSON() {
    const res = await fetch(NIGERIA_GEOJSON_URL, {
        next: {
            revalidate: 60 * 60 * 24 * 7, // re-fetch once per week max
            tags: ["nigeria-geojson"],
        },
    });

    if (!res.ok) throw new Error("Failed to load Nigeria GeoJSON");

    return res.json();
}