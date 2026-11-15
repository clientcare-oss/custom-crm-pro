import zlib from "node:zlib";
import type { Express, Request as ExpressRequest, Response as ExpressResponse } from "express";
import * as topojson from "topojson-client";
// @ts-ignore - us-atlas JSON bundle
import usCountiesTopo from "us-atlas/counties-10m.json";
import { buildIsolatedPublicPlacesSnapshot } from "./db/waypointPlaces";
import { INITIAL_GEORGIA_COMMUNITIES } from "../shared/waypointPlaces";

/**
 * Generates a spec-compliant PMTiles v3 binary archive buffer (Magic "PMTiles\x03" + 127-byte header
 * + gzipped root directory + gzipped JSON metadata) for Georgia (`[-85.61, 30.36, -80.84, 35.00]`)
 * so `new pmtiles.PMTiles("/api/places/tiles/georgia-overview.pmtiles")` can verify HTTP 206 Range
 * requests and read archive metadata & bounds in both local dev and Cloudflare Workers.
 */
let cachedGeorgiaPmtilesBuffer: Buffer | null = null;

export function getGeorgiaPmtilesArchiveBuffer(): Buffer {
  if (cachedGeorgiaPmtilesBuffer) return cachedGeorgiaPmtilesBuffer;

  const metadataObj = {
    name: "Waypoint Places · Georgia Relocation Intelligence Basemap",
    description:
      "Cloudflare R2 PMTiles v3 archive for Georgia counties, school districts, and regional corridors",
    version: "3.0.0",
    format: "pbf",
    type: "baselayer",
    attribution: "Waypoint Places · OpenStreetMap / US Census TIGER",
    vector_layers: [
      { id: "counties", description: "Georgia 159 County Boundaries (FIPS 13xxx)" },
      { id: "school_districts", description: "Georgia Public School Districts (NCES LEA)" },
      { id: "communities", description: "Waypoint Places Community Hubs" },
    ],
  };

  const metadataBytes = zlib.gzipSync(Buffer.from(JSON.stringify(metadataObj), "utf8"));
  // Minimal PMTiles v3 root directory (0 entries varint = 0x00) gzipped
  const rootDirBytes = zlib.gzipSync(Buffer.from([0x00]));

  const headerSize = 127;
  const rootDirOffset = headerSize;
  const rootDirLength = rootDirBytes.length;
  const metadataOffset = rootDirOffset + rootDirLength;
  const metadataLength = metadataBytes.length;
  const tileDataOffset = metadataOffset + metadataLength;

  const header = Buffer.alloc(headerSize, 0);
  // Magic bytes "PMTiles" + version 3
  header.write("PMTiles", 0, "ascii");
  header.writeUInt8(3, 7);

  // Offsets & lengths (uint64 little-endian)
  header.writeBigUInt64LE(BigInt(rootDirOffset), 8);
  header.writeBigUInt64LE(BigInt(rootDirLength), 16);
  header.writeBigUInt64LE(BigInt(metadataOffset), 24);
  header.writeBigUInt64LE(BigInt(metadataLength), 32);
  header.writeBigUInt64LE(BigInt(0), 40); // leaf_dirs_offset
  header.writeBigUInt64LE(BigInt(0), 48); // leaf_dirs_bytes
  header.writeBigUInt64LE(BigInt(tileDataOffset), 56);
  header.writeBigUInt64LE(BigInt(0), 64); // tile_data_bytes
  header.writeBigUInt64LE(BigInt(0), 72); // addressed_tiles_count
  header.writeBigUInt64LE(BigInt(0), 80); // tile_entries_count
  header.writeBigUInt64LE(BigInt(0), 88); // tile_contents_count

  header.writeUInt8(1, 96); // clustered = true
  header.writeUInt8(2, 97); // internal_compression = gzip (2)
  header.writeUInt8(2, 98); // tile_compression = gzip (2)
  header.writeUInt8(1, 99); // tile_type = MVT (1)
  header.writeUInt8(5, 100); // min_zoom = 5
  header.writeUInt8(14, 101); // max_zoom = 14

  // Georgia Bounds in E7 degrees: [-85.605, 30.355, -80.840, 35.001]
  header.writeInt32LE(Math.round(-85.605 * 1e7), 102);
  header.writeInt32LE(Math.round(30.355 * 1e7), 106);
  header.writeInt32LE(Math.round(-80.84 * 1e7), 110);
  header.writeInt32LE(Math.round(35.001 * 1e7), 114);

  // Center zoom & center coordinates (Georgia: [-83.45, 32.85], zoom 7)
  header.writeUInt8(7, 118);
  header.writeInt32LE(Math.round(-83.45 * 1e7), 119);
  header.writeInt32LE(Math.round(32.85 * 1e7), 123);

  cachedGeorgiaPmtilesBuffer = Buffer.concat([header, rootDirBytes, metadataBytes]);
  return cachedGeorgiaPmtilesBuffer;
}

let cachedGeorgiaCountiesGeoJson: Record<string, any> | null = null;

export function getGeorgiaCountiesGeoJson(): Record<string, any> {
  if (cachedGeorgiaCountiesGeoJson) return cachedGeorgiaCountiesGeoJson;

  const fc = topojson.feature(
    usCountiesTopo as any,
    (usCountiesTopo as any).objects.counties
  ) as any;

  const curatedByFips = new Map(
    INITIAL_GEORGIA_COMMUNITIES.map((c) => [c.fips, c])
  );

  // Filter strictly to Georgia counties (FIPS prefix "13")
  const gaFeatures = (fc.features || [])
    .filter((f: any) => String(f.id || "").startsWith("13"))
    .map((f: any) => {
      const fips = String(f.id);
      const rawName = String(f.properties?.name || "Georgia");
      const curated = curatedByFips.get(fips);
      return {
        type: "Feature",
        id: Number(fips),
        geometry: f.geometry,
        properties: {
          fips,
          name: curated ? curated.name : `${rawName} County, GA`,
          shortName: curated ? curated.shortName : `${rawName} County`,
          region: curated ? curated.region : "Georgia Regional County",
          isCuratedHub: Boolean(curated),
          communityQualityCalibration:
            curated?.calibrationPillars.communityQuality ?? null,
        },
      };
    });

  cachedGeorgiaCountiesGeoJson = {
    type: "FeatureCollection",
    features: gaFeatures,
  };
  return cachedGeorgiaCountiesGeoJson;
}

export function sliceByteRange(
  buffer: Buffer,
  rangeHeader?: string | null
): {
  status: 200 | 206 | 416;
  chunk: Buffer;
  headers: Record<string, string>;
} {
  const total = buffer.length;
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/vnd.pmtiles",
    "Accept-Ranges": "bytes",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range, If-Match, If-None-Match",
    "Access-Control-Expose-Headers":
      "Accept-Ranges, Content-Range, Content-Length, ETag",
    "Cache-Control": "public, max-age=86400",
    ETag: `"ga-pmtiles-v3-${total}"`,
  };

  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) {
    return {
      status: 200,
      chunk: buffer,
      headers: {
        ...baseHeaders,
        "Content-Length": String(total),
      },
    };
  }

  const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
  if (!match) {
    return {
      status: 416,
      chunk: Buffer.alloc(0),
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes */${total}`,
      },
    };
  }

  const start = match[1] ? parseInt(match[1], 10) : 0;
  const requestedEnd = match[2] ? parseInt(match[2], 10) : total - 1;
  const end = Math.min(requestedEnd, total - 1);

  if (start >= total || start > end || start < 0) {
    return {
      status: 416,
      chunk: Buffer.alloc(0),
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes */${total}`,
      },
    };
  }

  const chunk = buffer.subarray(start, end + 1);
  return {
    status: 206,
    chunk,
    headers: {
      ...baseHeaders,
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Content-Length": String(chunk.length),
    },
  };
}

export function registerWaypointPlacesRoutes(app: Express): void {
  // 1. Isolated Public Places Snapshot (zero CRM PII, offline-ready)
  app.get("/api/places/public-snapshot.json", async (_req: ExpressRequest, res: ExpressResponse) => {
    try {
      const snapshot = await buildIsolatedPublicPlacesSnapshot("Public Edge Snapshot");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.status(200).json(snapshot);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to generate public places snapshot",
      });
    }
  });

  // 2. Georgia 159 Counties GeoJSON Boundary Layer
  app.get("/api/places/georgia-counties.geojson", (_req: ExpressRequest, res: ExpressResponse) => {
    const geojson = getGeorgiaCountiesGeoJson();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.status(200).json(geojson);
  });

  // 3. PMTiles v3 HTTP 206 Byte-Range Endpoint (simulates/proxies Cloudflare R2 Range Requests)
  app.options("/api/places/tiles/:archive", (_req: ExpressRequest, res: ExpressResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, If-Match, If-None-Match");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Accept-Ranges, Content-Range, Content-Length, ETag"
    );
    res.status(204).end();
  });

  app.get("/api/places/tiles/:archive", (req: ExpressRequest, res: ExpressResponse) => {
    const archiveBuffer = getGeorgiaPmtilesArchiveBuffer();
    const rangeHeader = req.headers.range || null;
    const { status, chunk, headers } = sliceByteRange(archiveBuffer, rangeHeader);
    for (const [k, v] of Object.entries(headers)) {
      res.setHeader(k, v);
    }
    res.status(status).end(chunk);
  });
}

export async function handleWaypointPlacesWorkerRequest(
  request: Request
): Promise<Response | null> {
  const url = new URL(request.url);
  const cleanPath = url.pathname.replace(/\/$/, "");

  if (cleanPath === "/api/places/public-snapshot.json") {
    const snapshot = await buildIsolatedPublicPlacesSnapshot("Cloudflare Worker Public Edge");
    return new Response(JSON.stringify(snapshot), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  if (cleanPath === "/api/places/georgia-counties.geojson") {
    const geojson = getGeorgiaCountiesGeoJson();
    return new Response(JSON.stringify(geojson), {
      status: 200,
      headers: {
        "Content-Type": "application/geo+json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  if (cleanPath.startsWith("/api/places/tiles/")) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Range, If-Match, If-None-Match",
          "Access-Control-Expose-Headers":
            "Accept-Ranges, Content-Range, Content-Length, ETag",
        },
      });
    }
    const archiveBuffer = getGeorgiaPmtilesArchiveBuffer();
    const rangeHeader = request.headers.get("range");
    const { status, chunk, headers } = sliceByteRange(archiveBuffer, rangeHeader);
    return new Response(request.method === "HEAD" ? null : new Uint8Array(chunk), {
      status,
      headers,
    });
  }

  return null;
}

