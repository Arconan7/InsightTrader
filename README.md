# InsightTrader
*"If you can't beat 'em, join 'em."*
Insider trading, or at least the threat of insider trading, has become a hotbutton topic across the political atmosphere of our nation. InsightTrader takes in a wide array of political stocktrading information from congressmen and senators, general news sources, and POTUS social media posts and uses Nemotron to distill many datapoints into actionable stocktrading decisions.

---

## Repository Structure

```
InsightTrader/
├── server.mjs                         # Primary unified production server (Dashboard + REST API)
├── src/
│   └── services/
│       ├── nemotronService.mjs        # Real NVIDIA NIM API client with heuristic fallback
│       ├── disclosureService.mjs      # Congressional disclosure normalizer
│       └── rssService.mjs             # News and wire RSS service
├── lib/
│   └── data-feed/
│       ├── live-intelligence-service.mjs # Central pipeline coordinator & caching
│       ├── congress-feed.mjs          # Official House Clerk PTR parser & Bioguide directory
│       ├── market-quotes.mjs          # Yahoo Finance equity & SPY quote fetcher
│       ├── rss-parser.mjs             # Financial and regulatory RSS parser
│       ├── signal-synthesizer.mjs     # 4-pillar evidentiary derivation & verdicts
│       ├── performance-evaluator.mjs  # T₀ forward paper-tracking & Student-t math
│       ├── trump-tracker.mjs          # Truth Social & policy context tracker
│       └── lanxess-filter.mjs         # Defensive security exclusion filter
├── fixtures/
│   ├── trade-signals-dataset.json     # Seed dataset with verified primary documents
│   ├── real-disclosures-cache.json    # Cached House Clerk PTR records
│   └── real-news-cache.json           # Cached regulatory news wire records
├── artifacts/
│   ├── trade-signal/                  # React + Vite web dashboard application
│   │   ├── src/pages/dashboard.tsx    # Live intelligence dashboard page
│   │   ├── src/pages/synthesize.tsx   # Nemotron interactive synthesis studio
│   │   └── src/types/intelligence.ts  # TypeScript type definitions with provenance
│   └── api-server/                    # Express API server package
├── package.json                       # Root package manifest
└── README.md                          # Project documentation and judging guide
```

---

## Regulatory & Compliance Notice

InsightTrader is an educational research and transparency tool designed for hackathon demonstration. 
- Signal performance is tracked prospectively from real-time genesis timestamps ($T_0$).
- InsightTrader does not fabricate historical entry discounts or backfilled outperformance.
- Past trading disclosures of public officials do not guarantee future investment performance.
- This platform does not provide registered investment advisory services.

---

## Team & Contact

Developed for **SteelHacks XIII**:

- **Isaac Geer** — *ibg12@pitt.edu*
- **Aidan Russell** — *acr163@pitt.edu*
- **Alex Mitasev** — *ajm674@pitt.edu*

---

### What does InsightTrader do?
InsightTrader is a political intelligence stock-tracking platform. It combines congressional trading disclosures, political and financial news, public statements, and live market data to generate stock signals.

The app:

- Tracks congressional stock disclosures and associates trades with individual members of Congress.
- Pulls live stock pricing and recent price history from Yahoo Finance.
- Aggregates financial, political, regulatory, and ticker-specific news through RSS feeds.
- Tracks public statements and posts from President Trump that might relate to tracked companies or industries.
- Uses NVIDIA Nemotron to synthesize these separate sources into a single investment thesis.
- Generates BUY, HOLD, and SELL verdicts with confidence scores, supporting evidence, catalysts, risks, and price targets.
- Lets users add their own stock tickers to track.
- Tracks performance against the S&P 500 through SPY.
- Calculates whether observed signals have historically outperformed the benchmark.
- Gives users direct source links so they can verify the information behind a signal instead of blindly trusting the model.

---

### How was it made?
Created in large part using Google Antigravity, InsightTrader uses:
- Frontend:
    - JavaScript/TypeScript
    - React
    - Vite
    - Tailwind CSS
    - Lucide Icons
    - React Query
    - *These create a dashboard centered around signals, sources, politicans, news, and live market information.*
- Backend:
    - Node.js
    - Express
    - REST-style API endpoints
    - *These create server-side caching and persistent tracked-ticker storage.*
- Data Pipleline:
    - U.S. House Clerk financial disclosure data
    - Congressional legislator metadata and Bioguide information
    - Yahoo Finance market quotes
    - Yahoo Finance and Google News RSS feeds, plus additional financial and policy feeds
    - Public presidential statements and social-media information
    - Congress.gov and other government sources for legislative context
- AI:
    - NVIDIA NIM API
    - nvidia/llama-3.1-nemotron-70b-instruct
    - A structured prompt asks Nemotron to evaluate congressional activity, committee relevance, transaction timing, news catalysts, legislative activity, risk, direction, and confidence.
    - *Nemotron returns structured JSON that InsightTrader turns into a readable stock signal.*
    - *The project also includes a deterministic fallback engine so synthesis still works when the Nemotron API is unavailable.*
    - **InsightTrader does more than just ask "Should I buy NVIDIA?" It takes in information from stock tickers, politics, news, and market context and uses Nemotron to help determine whether it would be best to buy, hold, or sell, creating insights for the individual's financial decisions.**

---

### Bumps Along the Way
#### Live vs Synthetic Data
We initially wanted to use synthetic data, though we believed it would be more dificult to generate fictitious datasets rather than simply pull real, preexisting information.

#### Source Traceability
We felt strongly that if AI were to be involved with our project to turn information into decisive information, that the user should be able to easily trace where that information came from. InsightTrader makes note of what sources contribute to the scoring of different stocks and hyperlinks to the original source.

#### API Fallback
InsightTrader keeps a tempporary cache of various sources so that the failure of one source does not hinder the entire application.

---

### What We're Proud Of
#### Source Transparency
Every insight is directly connected to the evidence that Nemotron used to reach its conclusions. Users can find direct links to filings, market information, news, and government sources. Additionally, it aggregates several sources of data from different corners of the internet and media as a whole and allows for the user to access each source individually should they so choose.

#### Dynamic Stock Trading
Users can enter extra tickers to track stocks in their own portfolio.

#### AI Integration
As the Nemotron track describes, our integration of Nemotron is "more than just a chatbot." It digests a wide array of information and uses it to provide actionable investment decisions.

---

### What We Learned
- Source attribution is important!
- Free tokens go brrrrrrrr
- Research is hard. Aggregating data is important!
- Keep backups of backups of backups. Maybe that 2004 CSC budget IS important!
- AI can do a great job at synthesizing information.
- Function < Form; A truly robust hack is better than a bland one.

### Potential Upgrades and Updates
- Expanding congressional coverage beyond set and select members of the house and senate.
- Expand historical backtesting (evaluating performance after 7, 30, 90, 180, and 365 days).
- Adding more political sources (committee hearings, bills, amendments, federal contracts, executive actions, SEC filings, etc).
- Event alerts?