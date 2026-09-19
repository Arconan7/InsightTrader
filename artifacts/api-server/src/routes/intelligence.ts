import { Router, type IRouter, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";

const router: IRouter = Router();

// Load fixture
const fixturePath = path.resolve(process.cwd(), "fixtures/trade-signals-dataset.json");
let dataset: any = { summary: {}, signals: [], disclosures: [], politicians: [], news: [] };

try {
  dataset = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
} catch (e) {
  console.warn("Could not load fixtures/trade-signals-dataset.json in api-server:", e);
}

// GET /api/summary
router.get("/summary", (_req: Request, res: Response) => {
  res.json(dataset.summary);
});

// GET /api/signals
router.get("/signals", (req: Request, res: Response) => {
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
  res.json(dataset.politicians);
});

// GET /api/disclosures
router.get("/disclosures", (req: Request, res: Response) => {
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
  res.json(dataset.news);
});

export default router;

