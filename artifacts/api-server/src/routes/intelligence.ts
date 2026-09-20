import { Router, type IRouter, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";

const router: IRouter = Router();

// Cache path vs fallback fixture
const liveCachePath = path.resolve(process.cwd(), "data/live-intelligence-cache.json");
const fixturePath = path.resolve(process.cwd(), "fixtures/trade-signals-dataset.json");

const LANXESS_TICKERS = new Set(["LXS.DE", "LNXSF", "LNXSY", "LXS"]);

function isLanxessItem(item: any): boolean {
  if (!item) return false;
  if (typeof item === "string") {
    const s = item.trim().toUpperCase();
    return LANXESS_TICKERS.has(s) || s.includes("LANXESS");
  }
  const ticker = (item.ticker || item.symbol || "").trim().toUpperCase();
  if (ticker && LANXESS_TICKERS.has(ticker)) return true;
  const text = `${item.companyName || ""} ${item.name || ""} ${item.headline || ""} ${item.title || ""}`.toUpperCase();
  return text.includes("LANXESS");
}

function sanitize(data: any): any {
  if (!data) return data;
  const clean = { ...data };
  if (Array.isArray(clean.signals)) clean.signals = clean.signals.filter((s: any) => !isLanxessItem(s));
  if (Array.isArray(clean.disclosures)) clean.disclosures = clean.disclosures.filter((d: any) => !isLanxessItem(d));
  if (Array.isArray(clean.news)) clean.news = clean.news.filter((n: any) => !isLanxessItem(n));
  if (Array.isArray(clean.quotes)) clean.quotes = clean.quotes.filter((q: any) => !isLanxessItem(q));
  if (Array.isArray(clean.politicians)) clean.politicians = clean.politicians.filter((p: any) => !isLanxessItem(p));
  if (Array.isArray(clean.trumpPosts)) clean.trumpPosts = clean.trumpPosts.filter((t: any) => !isLanxessItem(t));
  return clean;
}

function getDataset(): any {
  if (fs.existsSync(liveCachePath)) {
    try {
      return sanitize(JSON.parse(fs.readFileSync(liveCachePath, "utf-8")));
    } catch (e) {
      console.warn("Could not load data/live-intelligence-cache.json:", e);
    }
  }
  if (fs.existsSync(fixturePath)) {
    try {
      return sanitize(JSON.parse(fs.readFileSync(fixturePath, "utf-8")));
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

// GET /api/performance
router.get("/performance", async (_req: Request, res: Response) => {
  try {
    const { getBenchmarkPerformance } = (await import(
      "../../../../lib/data-feed/live-intelligence-service.mjs"
    )) as any;
    res.json(getBenchmarkPerformance());
  } catch {
    const dataset = getDataset();
    res.json(dataset.benchmarkPerformance || dataset.summary?.benchmarkPerformance || {});
  }
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
    const { refreshLiveIntelligence } = (await import(
      "../../../../lib/data-feed/live-intelligence-service.mjs"
    )) as any;
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
  const id = String(req.params.id);
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

// GET /api/tickers
router.get("/tickers", async (_req: Request, res: Response) => {
  try {
    const { getTrackedTickers } = (await import(
      "../../../../lib/data-feed/live-intelligence-service.mjs"
    )) as any;
    res.json(getTrackedTickers());
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch tracked tickers", message: err.message });
  }
});

// POST /api/tickers
router.post("/tickers", async (req: Request, res: Response) => {
  try {
    const { ticker } = req.body || {};
    const { addUserTrackedTicker } = (await import(
      "../../../../lib/data-feed/live-intelligence-service.mjs"
    )) as any;
    const result = await addUserTrackedTicker(ticker);
    res.json(result);
  } catch (err: any) {
    const status = err.message?.includes("Invalid") || err.message?.includes("LANXESS") || err.message?.includes("already tracked")
      ? 400
      : 500;
    res.status(status).json({ error: err.message });
  }
});

// DELETE /api/tickers/:ticker
router.delete("/tickers/:ticker", async (req: Request, res: Response) => {
  try {
    const ticker = String(req.params.ticker);
    const { removeUserTrackedTicker } = (await import(
      "../../../../lib/data-feed/live-intelligence-service.mjs"
    )) as any;
    const result = removeUserTrackedTicker(ticker);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/trump-posts
router.get("/trump-posts", async (_req: Request, res: Response) => {
  try {
    const { getCachedTrumpPosts } = (await import(
      "../../../../lib/data-feed/trump-tracker.mjs"
    )) as any;
    res.json(getCachedTrumpPosts());
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch Trump posts", message: err.message });
  }
});

export default router;

