const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ─────────────────────────────────────────
// DB helpers
// ─────────────────────────────────────────
async function getBusiness(userId) {
  const r = await db.query('SELECT * FROM businesses WHERE user_id = $1', [userId]);
  return r.rows[0];
}

async function getBusinessContext(bizId) {
  const [invResult, salesResult, topProdsResult, riskResult] = await Promise.all([
    db.query(
      `SELECT p.name, p.current_stock, p.reorder_level,
         COALESCE(s.avg_daily, 0) as avg_daily
       FROM products p
       LEFT JOIN (
         SELECT product_id, SUM(quantity)::float/30 as avg_daily
         FROM sales WHERE business_id = $1 AND sale_date >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY product_id
       ) s ON s.product_id = p.id
       WHERE p.business_id = $1 AND p.is_active = TRUE ORDER BY p.name`,
      [bizId]
    ),
    db.query(
      `SELECT SUM(revenue) as rev30, SUM(quantity) as units30, COUNT(*) as orders30
       FROM sales WHERE business_id = $1 AND sale_date >= CURRENT_DATE - INTERVAL '30 days'`,
      [bizId]
    ),
    db.query(
      `SELECT p.name, SUM(s.revenue) as total_rev, SUM(s.quantity) as total_units
       FROM sales s JOIN products p ON s.product_id = p.id
       WHERE s.business_id = $1 AND s.sale_date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY p.name ORDER BY total_rev DESC LIMIT 5`,
      [bizId]
    ),
    db.query(
      `SELECT risk_type, severity, title, reason, recommended_action,
         (SELECT name FROM products WHERE id = risks.product_id) as product_name
       FROM risks WHERE business_id = $1 AND is_resolved = FALSE
       ORDER BY CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END LIMIT 10`,
      [bizId]
    ),
  ]);
  return {
    inventory: invResult.rows,
    sales30d: salesResult.rows[0],
    topProducts: topProdsResult.rows,
    risks: riskResult.rows,
  };
}

// ─────────────────────────────────────────
// General Knowledge Bank
// ─────────────────────────────────────────
const GENERAL_KB = [
  // ── Technology ──
  {
    keys: ['what is ai', 'what is artificial intelligence', 'explain ai', 'define ai'],
    answer: `**Artificial Intelligence (AI)** is the simulation of human intelligence by computer systems. It includes:\n\n• **Machine Learning** — systems that learn from data\n• **Natural Language Processing** — understanding human language\n• **Computer Vision** — interpreting images and video\n• **Robotics** — physical intelligent machines\n\nAI is used in search engines, recommendation systems, voice assistants, self-driving cars, and platforms like Operix AI itself.`
  },
  {
    keys: ['what is machine learning', 'explain machine learning', 'ml meaning'],
    answer: `**Machine Learning (ML)** is a branch of AI where systems learn from data to make predictions or decisions — without being explicitly programmed.\n\nThere are 3 main types:\n• **Supervised Learning** — learns from labeled examples (e.g. spam detection)\n• **Unsupervised Learning** — finds patterns in unlabeled data (e.g. customer clustering)\n• **Reinforcement Learning** — learns through rewards and penalties (e.g. game-playing AI)\n\nOperix AI uses **Linear Regression** (a supervised ML method) for demand forecasting.`
  },
  {
    keys: ['what is python', 'explain python', 'why use python'],
    answer: `**Python** is one of the world's most popular programming languages, known for its simplicity and readability.\n\nWhy developers love it:\n• Easy to learn and read\n• Huge library ecosystem (pandas, NumPy, scikit-learn, TensorFlow)\n• Used in web dev, data science, AI/ML, automation, and scripting\n• Large, active community\n\nPython powers the ML/analytics backend of Operix AI.`
  },
  {
    keys: ['what is javascript', 'what is js', 'explain javascript'],
    answer: `**JavaScript (JS)** is the programming language of the web. It runs in browsers and, via Node.js, on servers too.\n\nKey facts:\n• The only language natively understood by web browsers\n• Powers interactive UIs (React, Vue, Angular are built on it)\n• Node.js allows JS on the backend\n• TypeScript is a typed superset of JavaScript\n\nOperix AI's frontend is built with **React + TypeScript** (a JS-based stack).`
  },
  {
    keys: ['what is react', 'explain react', 'what is reactjs'],
    answer: `**React** is a JavaScript library by Meta for building user interfaces. It uses a component-based architecture where each piece of UI is a reusable component.\n\nKey concepts:\n• **Components** — independent, reusable UI pieces\n• **JSX** — HTML-like syntax inside JavaScript\n• **State & Props** — how data flows through components\n• **Virtual DOM** — efficient UI updates\n\nOperix AI's entire frontend is built with **React + TypeScript**.`
  },
  {
    keys: ['what is sql', 'explain sql', 'what is a database', 'what is postgresql'],
    answer: `**SQL (Structured Query Language)** is the standard language for managing relational databases.\n\n**PostgreSQL** is a powerful, open-source relational database known for:\n• Full SQL compliance\n• JSONB support (flexible data)\n• Strong performance and reliability\n• Used by companies like Apple, Instagram, and Spotify\n\nOperix AI stores all business, product, sales, and risk data in **PostgreSQL**.`
  },
  {
    keys: ['what is api', 'explain api', 'rest api', 'what is rest'],
    answer: `**API (Application Programming Interface)** is a way for two software systems to communicate.\n\nA **REST API** uses standard HTTP methods:\n• **GET** — retrieve data\n• **POST** — create data\n• **PUT/PATCH** — update data\n• **DELETE** — remove data\n\nAPIs return data in **JSON** format. Operix AI has a full REST API backend built with Node.js and Express that the React frontend calls for all data.`
  },
  {
    keys: ['what is cloud computing', 'explain cloud', 'what is aws', 'what is saas'],
    answer: `**Cloud computing** is delivering computing services (servers, storage, databases, software) over the internet.\n\n**Types:**\n• **IaaS** — Infrastructure (AWS EC2, virtual servers)\n• **PaaS** — Platform (Heroku, Railway — deploy apps)\n• **SaaS** — Software (Gmail, Slack, Operix AI — use via browser)\n\nMajor providers: **AWS**, **Google Cloud**, **Microsoft Azure**.\n\nOperix AI is a SaaS product — you access it through a browser with no installation.`
  },
  {
    keys: ['what is blockchain', 'explain blockchain', 'what is crypto', 'what is bitcoin'],
    answer: `**Blockchain** is a distributed ledger technology where data is stored in chained blocks across many computers — making it tamper-resistant.\n\n**Key properties:**\n• Decentralized — no single authority\n• Immutable — records can't be altered\n• Transparent — publicly verifiable\n\n**Bitcoin** is a cryptocurrency built on blockchain. **Ethereum** added programmable smart contracts.\n\nBlockchain is also used for supply chain tracking, digital identity, and NFTs.`
  },
  {
    keys: ['what is chatgpt', 'what is gpt', 'explain chatgpt', 'what is openai'],
    answer: `**ChatGPT** is a large language model (LLM) created by **OpenAI**. It can generate human-like text, answer questions, write code, translate languages, and more.\n\n**GPT** stands for *Generative Pre-trained Transformer* — a neural network architecture trained on massive amounts of text.\n\nKey versions: GPT-3, GPT-4, GPT-4o.\n\nOpenAI also makes **DALL-E** (image generation) and **Codex** (code generation). Competitors include Google's Gemini, Meta's LLaMA, and Anthropic's Claude.`
  },
  {
    keys: ['what is cybersecurity', 'explain cybersecurity', 'what is hacking', 'what is encryption'],
    answer: `**Cybersecurity** is the practice of protecting systems, networks, and data from digital attacks.\n\n**Key areas:**\n• **Encryption** — scrambling data so only authorized parties can read it\n• **Authentication** — verifying who you are (passwords, 2FA, biometrics)\n• **Firewalls** — blocking unauthorized network access\n• **Penetration Testing** — ethically hacking systems to find weaknesses\n\nCommon threats: phishing, ransomware, SQL injection, DDoS attacks.\n\nOperix AI uses JWT authentication, bcrypt password hashing, and HTTPS for security.`
  },

  // ── Business & Finance ──
  {
    keys: ['what is revenue', 'explain revenue', 'difference between revenue and profit'],
    answer: `**Revenue** is the total income a business earns from selling products or services — before any expenses are deducted. Also called *turnover* or *top line*.\n\n**Profit** is what remains after all expenses:\n• **Gross Profit** = Revenue − Cost of Goods Sold\n• **Operating Profit** = Gross Profit − Operating Expenses\n• **Net Profit** = Operating Profit − Taxes & Interest\n\nExample: If your store earns $50,000 in sales but spends $35,000 on costs, your net profit is $15,000.`
  },
  {
    keys: ['what is roi', 'explain roi', 'return on investment'],
    answer: `**ROI (Return on Investment)** measures how much profit you made relative to what you invested.\n\n**Formula:**\nROI = (Net Profit / Cost of Investment) × 100\n\n**Example:**\nYou spend $1,000 on marketing → it generates $3,500 in sales → profit is $2,500.\nROI = (2,500 / 1,000) × 100 = **250%**\n\nA positive ROI means the investment paid off. Businesses use ROI to compare different investment options and decide where to allocate budget.`
  },
  {
    keys: ['what is cash flow', 'explain cash flow', 'cash flow meaning'],
    answer: `**Cash flow** is the movement of money in and out of a business.\n\n• **Positive cash flow** — more money coming in than going out ✅\n• **Negative cash flow** — more going out than coming in ⚠️\n\n**3 types:**\n1. **Operating** — day-to-day business activities\n2. **Investing** — buying/selling assets\n3. **Financing** — loans, equity, dividends\n\nA business can be profitable but still fail due to poor cash flow. Managing it is critical — especially for small businesses and retail.`
  },
  {
    keys: ['what is supply chain', 'explain supply chain', 'supply chain management'],
    answer: `**Supply chain** is the entire network of people, companies, and processes involved in creating and delivering a product — from raw materials to the end customer.\n\n**Stages:**\n1. Raw material sourcing\n2. Manufacturing\n3. Warehousing\n4. Distribution\n5. Retail / Customer delivery\n\n**Supply Chain Management (SCM)** optimizes this flow to reduce costs and delays. Key risks: supplier disruptions, inventory shortages, demand spikes.\n\nOperix AI's inventory and demand forecasting modules directly support SCM decisions.`
  },
  {
    keys: ['what is kpi', 'explain kpi', 'key performance indicator'],
    answer: `**KPI (Key Performance Indicator)** is a measurable value that shows how effectively a business is achieving its objectives.\n\n**Common business KPIs:**\n• Revenue growth rate\n• Customer acquisition cost (CAC)\n• Net promoter score (NPS)\n• Inventory turnover rate\n• Gross margin %\n• Monthly active users (MAU)\n\nOperix AI tracks several KPIs on your dashboard: Total Revenue, Units Sold, Orders, Health Score, Sales Growth, and Forecasted Demand.`
  },
  {
    keys: ['what is inflation', 'explain inflation', 'why does inflation happen'],
    answer: `**Inflation** is the rate at which the general price level of goods and services rises over time — reducing purchasing power.\n\n**Causes:**\n• **Demand-pull** — too much money chasing too few goods\n• **Cost-push** — rising production costs passed to consumers\n• **Built-in** — wage-price spiral\n\n**Measured by:** Consumer Price Index (CPI), Producer Price Index (PPI).\n\n**Impact on businesses:** Higher raw material costs, reduced customer spending, pressure on profit margins. Central banks use interest rates to control inflation.`
  },
  {
    keys: ['what is ecommerce', 'what is e-commerce', 'explain ecommerce'],
    answer: `**E-commerce (Electronic Commerce)** is buying and selling products or services over the internet.\n\n**Types:**\n• **B2C** — Business to Consumer (Amazon, Shopify stores)\n• **B2B** — Business to Business (Alibaba, wholesale platforms)\n• **C2C** — Consumer to Consumer (eBay, Craigslist)\n• **D2C** — Direct to Consumer (brands selling without middlemen)\n\n**Key metrics:** Conversion rate, cart abandonment rate, average order value (AOV), customer lifetime value (CLV).\n\nE-commerce is one of the most common use cases for Operix AI.`
  },
  {
    keys: ['what is marketing', 'explain marketing', 'types of marketing'],
    answer: `**Marketing** is the process of promoting, selling, and distributing products or services to target customers.\n\n**Key types:**\n• **Digital Marketing** — SEO, social media, email, PPC ads\n• **Content Marketing** — blogs, videos, guides\n• **Brand Marketing** — building brand identity and awareness\n• **Product Marketing** — positioning and launching products\n• **Influencer Marketing** — partnering with social media personalities\n\n**The 4 Ps of Marketing:** Product, Price, Place, Promotion.\n\nData-driven marketing uses analytics (like sales trends in Operix AI) to make better decisions.`
  },

  // ── Science & General Knowledge ──
  {
    keys: ['what is climate change', 'explain climate change', 'global warming'],
    answer: `**Climate change** refers to long-term shifts in global temperatures and weather patterns. While some changes are natural, since the 1800s human activities are the main driver.\n\n**Main causes:**\n• Burning fossil fuels (coal, oil, gas) releases CO₂ and methane\n• Deforestation reduces CO₂ absorption\n• Industrial agriculture produces greenhouse gases\n\n**Effects:** Rising sea levels, extreme weather, ecosystem disruption, food insecurity.\n\n**Solutions:** Renewable energy (solar, wind), electric vehicles, carbon capture, sustainable agriculture, and international agreements like the Paris Accord.`
  },
  {
    keys: ['what is quantum computing', 'explain quantum computing'],
    answer: `**Quantum computing** uses quantum mechanics principles (superposition, entanglement) to perform computations that classical computers can't efficiently solve.\n\n**Classical bit:** either 0 or 1.\n**Qubit (quantum bit):** can be 0, 1, or both simultaneously (superposition).\n\n**Potential applications:**\n• Drug discovery and molecular simulation\n• Breaking/making encryption\n• Financial optimization\n• AI training acceleration\n\n**Key players:** IBM, Google, Microsoft, IonQ.\n\nQuantum computing is still largely experimental — practical, scalable quantum computers are years away from widespread use.`
  },
  {
    keys: ['what is space', 'explain space exploration', 'what is nasa', 'what is spacex'],
    answer: `**Space exploration** is the investigation of outer space using spacecraft, telescopes, and astronauts.\n\n**Key milestones:**\n• 1957 — Sputnik (first satellite, USSR)\n• 1969 — Apollo 11 (first humans on the Moon, NASA)\n• 1998 — International Space Station (ISS)\n• 2020s — Mars rovers, commercial spaceflight\n\n**SpaceX** (Elon Musk) revolutionized space with reusable rockets (Falcon 9) and is developing Starship for Mars missions.\n\n**NASA** plans to return humans to the Moon (Artemis program) and eventually send crewed missions to Mars.`
  },
  {
    keys: ['what is dna', 'explain dna', 'what is genetics'],
    answer: `**DNA (Deoxyribonucleic Acid)** is the molecule that carries genetic instructions for all living organisms.\n\nDNA is shaped like a **double helix** — two strands wound together, made of 4 base pairs: Adenine (A), Thymine (T), Guanine (G), Cytosine (C).\n\n**Genetics** is the study of genes — segments of DNA that encode traits like eye color, height, and disease risk.\n\n**Modern applications:**\n• CRISPR gene editing\n• Personalized medicine\n• Ancestry testing (23andMe, AncestralDNA)\n• Forensic science (DNA fingerprinting)`
  },
  {
    keys: ['what is the internet', 'how does internet work', 'explain internet'],
    answer: `**The Internet** is a global network of interconnected computers that communicate using standardized protocols (TCP/IP).\n\n**How it works:**\n1. Your device connects to an ISP (Internet Service Provider)\n2. ISPs connect to global backbone networks via fiber optic cables\n3. Data travels as packets, routed across networks\n4. DNS (Domain Name System) translates domain names to IP addresses\n\n**The Web vs. Internet:** The Internet is the infrastructure; the World Wide Web (HTTP/HTTPS) is one service on top of it.\n\nOver 5 billion people use the internet today.`
  },

  // ── Health & Lifestyle ──
  {
    keys: ['how to be productive', 'productivity tips', 'time management tips', 'how to focus'],
    answer: `**Productivity tips that actually work:**\n\n⏱️ **Time-blocking** — schedule specific tasks in fixed time slots\n📋 **Prioritize with the Eisenhower Matrix** — Urgent+Important first\n🍅 **Pomodoro Technique** — 25 min focus, 5 min break\n📵 **Eliminate distractions** — phone on silent, website blockers\n🧠 **Tackle hard tasks first** — when willpower is highest (morning)\n📝 **Write tomorrow's task list tonight** — reduces morning decision fatigue\n💤 **Sleep 7–8 hours** — sleep deprivation kills productivity more than anything\n\nConsistency beats intensity. Small daily habits compound into massive results.`
  },
  {
    keys: ['how to lose weight', 'weight loss tips', 'how to get fit', 'exercise tips'],
    answer: `**Evidence-based approach to fitness & weight management:**\n\n🥗 **Nutrition (80% of results):**\n• Caloric deficit = weight loss (burn more than you eat)\n• Prioritize protein (keeps you full, preserves muscle)\n• Reduce ultra-processed foods and added sugar\n• Hydrate — often hunger is actually thirst\n\n🏋️ **Exercise:**\n• Strength training preserves/builds muscle while losing fat\n• Cardio improves heart health and burns additional calories\n• Even 30 min of walking daily makes a difference\n\n💤 **Sleep & Stress:**\n• Poor sleep increases hunger hormones (ghrelin)\n• Chronic stress triggers cortisol, which promotes fat storage\n\nConsistency over weeks and months matters more than perfection.`
  },
  {
    keys: ['how to learn faster', 'study tips', 'how to memorize', 'learning techniques'],
    answer: `**Science-backed learning techniques:**\n\n🔁 **Spaced Repetition** — review material at increasing intervals (Anki app)\n🧪 **Active Recall** — test yourself instead of re-reading\n🗣️ **The Feynman Technique** — explain concepts in simple words\n🔗 **Interleaving** — mix different topics/subjects while studying\n✍️ **Handwriting notes** — better retention than typing\n🧘 **Sleep after learning** — consolidates memory during REM sleep\n🎯 **Focus sessions** — 45–90 min deep work, then break\n\nThe biggest mistake: passive re-reading. Active practice and testing is far more effective.`
  },
  {
    keys: ['how to reduce stress', 'stress management', 'mental health tips', 'anxiety tips'],
    answer: `**Effective stress and anxiety management:**\n\n🧘 **Mindfulness & Meditation** — even 10 min/day reduces cortisol\n🫁 **Deep breathing** — 4-7-8 technique (inhale 4s, hold 7s, exhale 8s)\n🏃 **Exercise** — releases endorphins, natural stress relief\n📵 **Digital detox** — limit news and social media consumption\n💬 **Talk about it** — friends, family, or a therapist\n📓 **Journaling** — writing out thoughts reduces mental load\n💤 **Prioritize sleep** — sleep debt dramatically worsens anxiety\n🌿 **Nature** — even a 20-minute walk outside lowers stress hormones\n\nChronic stress is serious — don't hesitate to seek professional help.`
  },

  // ── Math & Science basics ──
  {
    keys: ['what is compound interest', 'explain compound interest', 'power of compound interest'],
    answer: `**Compound interest** is earning interest on both your original money AND previously earned interest — making wealth grow exponentially over time.\n\n**Formula:** A = P(1 + r/n)^(nt)\n• P = Principal, r = rate, n = times/year, t = years\n\n**Example:**\n$10,000 at 8% annual return:\n• After 10 years: ~$21,589\n• After 20 years: ~$46,610\n• After 30 years: ~$100,627\n\nAlbert Einstein reportedly called it *"the eighth wonder of the world."*\n\nThe key lesson: **start early**. Time is the most powerful variable in compounding.`
  },
  {
    keys: ['what is statistics', 'explain statistics', 'mean median mode'],
    answer: `**Statistics** is the science of collecting, analyzing, and interpreting data.\n\n**Key measures:**\n• **Mean** — average (sum ÷ count)\n• **Median** — middle value when sorted\n• **Mode** — most frequently occurring value\n• **Standard Deviation** — how spread out the data is\n\n**Two branches:**\n• **Descriptive** — summarizes data (charts, averages)\n• **Inferential** — draws conclusions about a population from a sample\n\nStatistics is fundamental to data science, AI/ML, medical research, economics, and business analytics — including everything Operix AI calculates.`
  },

  // ── General curiosity ──
  {
    keys: ['what is the meaning of life', 'purpose of life', 'why are we here'],
    answer: `A question philosophers, scientists, and thinkers have wrestled with for millennia! 🤔\n\n**A few perspectives:**\n\n🔬 **Scientific:** Life exists due to evolutionary biology — organisms survive and reproduce. There's no cosmic "purpose" baked in.\n\n🧠 **Philosophical:**\n• Aristotle — Eudaimonia (flourishing, living virtuously)\n• Camus — create your own meaning in an indifferent universe\n• Nietzsche — will to power, self-overcoming\n\n🙏 **Religious:** Most traditions offer purpose through connection to the divine, service, moral living.\n\n💡 **Practical answer:** Most people find meaning through relationships, meaningful work, growth, creativity, and contribution.\n\nWhat's your answer? 😊`
  },
  {
    keys: ['tell me a joke', 'say a joke', 'make me laugh', 'funny joke'],
    answer: `Here are a few for you! 😄\n\n**Business-flavored:**\nWhy did the Excel spreadsheet go to therapy?\nBecause it had too many *unresolved issues* in the cells. 📊\n\n**Tech:**\nA SQL query walks into a bar, walks up to two tables and asks...\n"Can I JOIN you?" 🍺\n\n**Classic:**\nWhy do programmers prefer dark mode?\nBecause light attracts bugs. 🐛\n\n**Inventory one:**\nMy inventory app kept sending me alerts...\nTurns out I was running low on *humor* too. 📦\n\nHope that made you smile! 😊`
  },
  {
    keys: ['what is the best programming language', 'which language should i learn', 'best coding language'],
    answer: `The honest answer: **it depends on what you want to build.** But here's a quick guide:\n\n| Goal | Language |\n|---|---|\n| Web frontend | JavaScript / TypeScript |\n| Web backend | Node.js, Python, Go |\n| Data science / AI | Python |\n| Mobile apps | Swift (iOS), Kotlin (Android), React Native |\n| System programming | Rust, C, C++ |\n| Game development | C#, C++, GDScript |\n| Enterprise / backend | Java, C# |\n\n**Best first language to learn:** **Python** — simple syntax, huge community, used everywhere.\n\n**Most in-demand:** JavaScript (web) and Python (AI/data) are the two safest bets for jobs in 2024.`
  },
  {
    keys: ['how does gps work', 'explain gps', 'what is gps'],
    answer: `**GPS (Global Positioning System)** is a satellite-based navigation system operated by the US military (now civilian too).\n\n**How it works:**\n1. 30+ satellites orbit Earth, each broadcasting their exact location and time\n2. Your GPS device receives signals from 4+ satellites\n3. Using **trilateration** — measuring the time delay of each signal — your position is calculated\n4. More satellites = better accuracy (down to ~1–3 meters)\n\n**Who uses it:** Phones, cars, aircraft, ships, agriculture, military.\n\nSimilar systems: Russia's GLONASS, EU's Galileo, China's BeiDou.`
  },
  {
    keys: ['how to start a business', 'how to be an entrepreneur', 'startup tips', 'business advice'],
    answer: `**How to start a business — practical steps:**\n\n💡 **1. Validate your idea**\n• Does it solve a real problem?\n• Who is your target customer?\n• Is someone already doing it? (competition = good sign)\n\n📋 **2. Write a lean business plan**\n• Revenue model, target market, cost structure\n\n🛠️ **3. Build an MVP (Minimum Viable Product)**\n• The simplest version that delivers core value\n\n💰 **4. Figure out finances**\n• Bootstrap, find investors, or get a small business loan\n\n📣 **5. Get your first customers**\n• Talk to people. Sell before you build fully.\n\n📊 **6. Measure and iterate**\n• Track KPIs, listen to customers, improve constantly\n\nMost successful businesses started scrappy. Execution beats the perfect plan every time.`
  },
  {
    keys: ['what is the stock market', 'explain stocks', 'how to invest', 'investing tips'],
    answer: `**The stock market** is a marketplace where shares of publicly listed companies are bought and sold.\n\n**Key concepts:**\n• **Stock/Share** — a small ownership stake in a company\n• **Dividend** — regular cash payment to shareholders\n• **Bull market** — rising prices, optimistic investors\n• **Bear market** — falling prices, pessimistic investors\n• **Index** — a basket of stocks (S&P 500, Nifty 50, Dow Jones)\n\n**Beginner investing principles:**\n• Start early — compounding rewards time\n• Diversify — don't put all eggs in one basket\n• Index funds beat most active managers long-term\n• Invest regularly (SIP / Dollar Cost Averaging)\n• Don't try to time the market\n\n⚠️ *This is general information, not financial advice.*`
  },
  {
    keys: ['what is meditation', 'how to meditate', 'benefits of meditation'],
    answer: `**Meditation** is a mental practice of focused attention and awareness — training the mind like you train a muscle.\n\n**Proven benefits:**\n• Reduces stress and anxiety\n• Improves focus and concentration\n• Lowers blood pressure\n• Better emotional regulation\n• Improved sleep quality\n\n**How to start (5 minutes):**\n1. Sit comfortably, close your eyes\n2. Focus on your breath — in and out\n3. When your mind wanders (it will), gently bring it back\n4. Don't judge yourself — that IS the practice\n\n**Apps to try:** Headspace, Calm, Insight Timer (free)\n\nEven 5–10 minutes daily creates measurable changes in brain structure over weeks.`
  },
  {
    keys: ['tell me something interesting', 'fun fact', 'interesting fact', 'random fact', 'did you know'],
    answer: `Here are some genuinely fascinating facts! 🤓\n\n🧠 **Your brain** generates about 20 watts of electricity — enough to power a dim light bulb.\n\n🐙 **Octopuses** have 3 hearts, blue blood, and 9 brains (1 central + 1 per arm). Each arm can act semi-independently.\n\n🌍 **More trees** exist on Earth (~3 trillion) than stars in the Milky Way galaxy (~200–400 billion).\n\n⏱️ **If you removed all empty space** from atoms in the human body, the entire human race would fit in a sugar cube.\n\n🐝 **Honey** never spoils — archaeologists found edible 3,000-year-old honey in Egyptian tombs.\n\n💊 **Oxford University** is older than the Aztec Empire. Oxford started teaching around 1096 AD; the Aztecs founded Tenochtitlán in 1325 AD.\n\nWant more? Just ask! 🙂`
  },
  {
    keys: ['what time is it', 'what is todays date', 'what day is it today'],
    answer: () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return `📅 Today is **${dateStr}**\n⏰ Current server time is approximately **${timeStr}**\n\n*(Time is based on the server clock.)*`;
    }
  },
  {
    keys: ['who made you', 'who created you', 'who built you', 'what are you'],
    answer: `I'm **Operix Assistant**, the built-in AI for **Operix AI** — a business intelligence platform for small and medium-sized businesses.\n\nI was built as part of the Operix AI product.\n\n**My capabilities:**\n• 📊 Analyze your business sales and inventory data\n• ⚠️ Summarize risks and alerts\n• 💡 Give prioritized recommendations\n• 🌐 Answer general knowledge questions on tech, business, science, and more\n\nThink of me as a smart assistant that knows both your business data AND the world. Ask me anything!`
  },
  {
    keys: ['thank you', 'thanks', 'great', 'awesome', 'perfect', 'nice'],
    answer: `You're welcome! 😊 Happy to help.\n\nFeel free to ask me anything — whether it's about your business data, a general question, or just something you're curious about. I'm here!`
  },
  {
    keys: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    answer: () => {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      return `${greeting}! 👋 I'm **Operix Assistant**.\n\nI can help you with:\n• 📊 Your business data — sales, inventory, risks, forecasts\n• 💬 General questions — tech, business, science, health, and more\n\nWhat would you like to know today?`;
    }
  },
];

// ─────────────────────────────────────────
// Match question to general KB
// ─────────────────────────────────────────
function matchGeneral(q) {
  const lower = q.toLowerCase().trim();
  for (const entry of GENERAL_KB) {
    for (const key of entry.keys) {
      if (lower.includes(key) || key.includes(lower.substring(0, Math.min(lower.length, 20)))) {
        const ans = typeof entry.answer === 'function' ? entry.answer() : entry.answer;
        return ans;
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────
// Business-data answer engine
// ─────────────────────────────────────────
function generateBusinessAnswer(question, ctx, bizName) {
  const q = question.toLowerCase();
  const { inventory, sales30d, topProducts, risks } = ctx;

  const lowStock = inventory.filter(p => {
    const avgDaily = parseFloat(p.avg_daily) || 0;
    return avgDaily > 0 && p.current_stock / avgDaily < 14;
  });
  const outOfStock = inventory.filter(p => p.current_stock === 0);
  const rev = parseFloat(sales30d.rev30) || 0;
  const units = parseInt(sales30d.units30) || 0;
  const orders = parseInt(sales30d.orders30) || 0;

  if (q.includes('risk') || q.includes('problem') || q.includes('concern') || q.includes('issue') || q.includes('alert')) {
    if (risks.length === 0) return `Good news! No significant risks detected for **${bizName}** at this time. Keep monitoring regularly.`;
    const highRisks = risks.filter(r => r.severity === 'high');
    let answer = `Current risks detected for **${bizName}**:\n\n`;
    risks.slice(0, 5).forEach(r => {
      const emoji = r.severity === 'high' ? '🔴' : r.severity === 'medium' ? '🟠' : '🟡';
      answer += `${emoji} **${r.title}** (${r.severity.toUpperCase()})\n${r.reason}\n*Action: ${r.recommended_action}*\n\n`;
    });
    if (highRisks.length > 0) answer += `⚠️ ${highRisks.length} high-severity risk(s) need immediate attention.`;
    return answer;
  }

  if (q.includes('restock') || q.includes('reorder') || q.includes('low stock') || q.includes('out of stock')) {
    if (lowStock.length === 0 && outOfStock.length === 0) return `All products in **${bizName}** have adequate stock. No immediate reorder needed.`;
    let answer = `Products that need restocking:\n\n`;
    outOfStock.forEach(p => { answer += `🔴 **${p.name}** — Out of stock!\n`; });
    lowStock.forEach(p => {
      const avg = parseFloat(p.avg_daily) || 0;
      const days = avg > 0 ? Math.round(p.current_stock / avg) : '?';
      const suggest = avg > 0 ? Math.ceil(avg * 30) : '?';
      answer += `🟠 **${p.name}** — ${p.current_stock} units (~${days} days left). Suggested order: **${suggest} units**.\n`;
    });
    return answer;
  }

  if (q.includes('best') || q.includes('top') || q.includes('best-sell') || q.includes('bestsell')) {
    if (topProducts.length === 0) return `No sales data yet for **${bizName}**. Load demo data or upload your sales to see top products.`;
    let answer = `Top products for **${bizName}** (last 30 days):\n\n`;
    topProducts.forEach((p, i) => {
      answer += `**${i + 1}. ${p.name}** — $${parseFloat(p.total_rev).toFixed(0)} revenue · ${p.total_units} units\n`;
    });
    return answer;
  }

  if (q.includes('declin') || q.includes('worst') || q.includes('poor perform') || q.includes('falling')) {
    const declines = risks.filter(r => r.risk_type === 'decline');
    if (declines.length === 0) return `No significant sales declines detected for **${bizName}** recently.`;
    let answer = `Products with declining sales:\n\n`;
    declines.forEach(r => { answer += `🟠 **${r.product_name}** — ${r.reason}\n`; });
    return answer;
  }

  if (q.includes('sales') || q.includes('revenue') || q.includes('how am i doing') || q.includes('performance')) {
    if (rev === 0) return `No sales data yet for **${bizName}**. Please upload data or load the demo.`;
    let answer = `Sales performance for **${bizName}** (last 30 days):\n\n`;
    answer += `💰 **Revenue:** $${rev.toFixed(0)}\n`;
    answer += `📦 **Units Sold:** ${units}\n`;
    answer += `🛒 **Orders:** ${orders}\n`;
    if (topProducts.length > 0) answer += `\nTop performer: **${topProducts[0].name}** ($${parseFloat(topProducts[0].total_rev).toFixed(0)})`;
    return answer;
  }

  if (q.includes('focus') || q.includes('today') || q.includes('priority') || q.includes('what should i')) {
    const priorities = [];
    const highRisks = risks.filter(r => r.severity === 'high');
    if (highRisks.length > 0) priorities.push(`🔴 Address ${highRisks.length} high-severity risk(s): ${highRisks.map(r => r.product_name || r.title).join(', ')}`);
    if (outOfStock.length > 0) priorities.push(`🔴 Restock out-of-stock: ${outOfStock.map(p => p.name).join(', ')}`);
    if (lowStock.length > 0) priorities.push(`🟠 Review low stock: ${lowStock.slice(0, 3).map(p => p.name).join(', ')}`);
    if (priorities.length === 0) return `Everything looks stable for **${bizName}** today. Keep monitoring trends.`;
    return `**Today's priorities for ${bizName}:**\n\n${priorities.join('\n')}`;
  }

  if (q.includes('forecast') || q.includes('next month') || q.includes('future demand') || q.includes('predict')) {
    return `To see AI demand forecasts, visit the **Forecasts** page. It uses your sales history to project demand for 7, 30, or 90 days ahead using linear regression. At least 7 days of data per product is needed.`;
  }

  if (q.includes('inventory') || q.includes('stock level') || q.includes('how much stock')) {
    const healthy = inventory.filter(p => { const a = parseFloat(p.avg_daily) || 0; return a === 0 || p.current_stock / a >= 14; });
    return `**Inventory summary for ${bizName}:**\n\n📦 Total products: ${inventory.length}\n✅ Healthy: ${healthy.length}\n🟠 Low stock: ${lowStock.length}\n🔴 Out of stock: ${outOfStock.length}`;
  }

  return null; // no business match
}

// ─────────────────────────────────────────
// POST /api/assistant/chat
// ─────────────────────────────────────────
router.post('/chat', async (req, res, next) => {
  try {
    const biz = await getBusiness(req.user.id);
    if (!biz) return res.status(404).json({ error: 'Business not set up' });

    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required' });

    const q = message.trim();
    const ctx = await getBusinessContext(biz.id);

    // 1. Try business-specific answer first
    const bizAnswer = generateBusinessAnswer(q, ctx, biz.name);
    if (bizAnswer) return res.json({ message: bizAnswer, source: 'business' });

    // 2. Try general knowledge
    const genAnswer = matchGeneral(q);
    if (genAnswer) return res.json({ message: genAnswer, source: 'general' });

    // 3. Fallback — helpful nudge
    const fallback = `I can help with two things:\n\n**📊 Your Business Data (${biz.name}):**\n• "What are my biggest risks?"\n• "Which products need restocking?"\n• "How are my sales performing?"\n• "What should I focus on today?"\n\n**🌐 General Questions:**\n• "What is machine learning?"\n• "Explain compound interest"\n• "How to be more productive?"\n• "Tell me a fun fact"\n• "What is blockchain?"\n\nJust ask — I'll do my best to answer! 💬`;
    res.json({ message: fallback, source: 'fallback' });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
