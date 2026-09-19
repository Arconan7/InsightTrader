import { Router, type IRouter, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";

const router: IRouter = Router();

// Cache path vs fallback fixture
const liveCachePath = path.resolve(process.cwd(), "data/live-intelligence-cache.json");
const fixturePath = path.resolve(process.cwd(), "fixtures/trade-signals-dataset.json");

function getDataset(): any {
  if (fs.existsSync(liveCachePath)) {
    try {
      return JSON.parse(fs.readFileSync(liveCachePath, "utf-8"));
    } catch (e) {
      console.warn("Could not load data/live-intelligence-cache.json:", e);
    }
  }
  if (fs.existsSync(fixturePath)) {
    try {
      return JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    } catch (e) {
      console.warn("Could not load fixtures/trade-signals-dataset.json:", e);
    }
  }
  return { summary: {}, signals: [], disclosures: [], politicians: [], news: [] };
}

// GET /api/summary
router.get("/summary", (_req: Request, res: Response) => {
  const dataset = getDataset();
  res.json(dataset.summary);
});

// GET /api/status
router.get("/status", (_req: Request, res: Response) => {
  const dataset = getDataset();
  res.json({
    mode: dataset.summary?.dataSourceMode || "LIVE_PUBLIC_FEEDS",
    lastUpdated: dataset.summary?.lastUpdatedIso,
    activeSignals: dataset.signals?.length || 0,
    disclosuresCount: dataset.disclosures?.length || 0,
    newsCount: dataset.news?.length || 0,
    sources: dataset.summary?.dataSources || [
      "U.S. House of Representatives Clerk (disclosures-clerk.house.gov)",
      "Yahoo Finance RSS & Live Quotes",
      "Google News Policy RSS",
    ],
  });
});

// POST /api/refresh
router.post("/refresh", async (_req: Request, res: Response) => {
  try {
    // Dynamically import live service if in Node runtime
    const { refreshLiveIntelligence } = await import(
      "../../../../lib/data-feed/live-intelligence-service.mjs"
    );
    const fresh = await refreshLiveIntelligence();
    res.json(fresh);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to refresh live intelligence", message: err.message });
  }
});

// GET /api/signals
router.get("/signals", (req: Request, res: Response) => {
  const dataset = getDataset();
  const { direction, ticker, minConfidence } = req.query;
  let results = dataset.signals;

  if (direction && typeof direction === "string") {
    results = results.filter((s: any) => s.direction === direction.toUpperCase());
  }
  if (ticker && typeof ticker === "string") {
    results = results.filter((s: any) => s.ticker.toUpperCase() === ticker.toUpperCase());
  }
  if (minConfidence) {
    results = results.filter((s: any) => s.confidenceScorePct >= Number(minConfidence));
  }

  res.json(results);
});

// GET /api/signals/:id
router.get("/signals/:id", (req: Request, res: Response) => {
  const dataset = getDataset();
  const { id } = req.params;
  const signal = dataset.signals.find(
    (s: any) => s.id === id || s.ticker.toUpperCase() === id.toUpperCase()
  );
  if (!signal) {
    res.status(404).json({ error: "Signal not found", id });
    return;
  }
  res.json(signal);
});

// GET /api/politicians
router.get("/politicians", (_req: Request, res: Response) => {
  const dataset = getDataset();
  res.json(dataset.politicians);
});

// GET /api/disclosures
router.get("/disclosures", (req: Request, res: Response) => {
  const dataset = getDataset();
  const { ticker, politicianId } = req.query;
  let results = dataset.disclosures;

  if (ticker && typeof ticker === "string") {
    results = results.filter((d: any) => d.ticker.toUpperCase() === ticker.toUpperCase());
  }
  if (politicianId && typeof politicianId === "string") {
    results = results.filter((d: any) => d.politicianId === politicianId);
  }

  res.json(results);
});

// GET /api/news
router.get("/news", (_req: Request, res: Response) => {
  const dataset = getDataset();
  res.json(dataset.news);
});

// GET /api/quotes
router.get("/quotes", (_req: Request, res: Response) => {
  const dataset = getDataset();
  res.json(dataset.quotes || []);
});

export default router;
