/* ============================================================
   GadgetWise — mock dataset (CC 116 prototype)
   All product records are fictional, created for this prototype.
   None of the brands, models, reviews, users, or figures are
   real-world verified data. Prices are realistic PHP samples.

   This file is the fake data layer. When a real backend exists,
   replace these arrays with fetch() calls returning the same
   object shapes. No component imports data from anywhere else.
   ============================================================ */

const GW = {};

/* ---------- Categories ---------- */
GW.categories = [
  { id: "smartphones", name: "Smartphones",   blurb: "Everyday drivers, campus workhorses, and camera-first picks.", file: "ph-smartphone" },
  { id: "laptops",     name: "Laptops",       blurb: "From note-taking ultrabooks to programming and editing rigs.", file: "ph-laptop" },
  { id: "tablets",     name: "Tablets",       blurb: "Light readers, note-takers, and portable media screens.",   file: "ph-tablet" },
  { id: "headphones",  name: "Headphones",    blurb: "Focus on lectures, commutes, and late-night study.",        file: "ph-headphones" },
  { id: "powerbanks",  name: "Power Banks",   blurb: "Outlast brownouts, long commutes, and full class days.",    file: "ph-powerbank" },
  { id: "smartwatches",name: "Smartwatches",  blurb: "Trackers and watchfaces that survive a student schedule.",  file: "ph-watch" }
];

/* ============================================================
   Data provenance (every field classifies as one of):
   RAW (marketplace/product source): name, brand, category, price,
     image, specs, specList, releaseYear
   GW-EDITORIAL (manually maintained catalog values - NOT from any API):
     scored{performance,display,camera,storage}, value{warrantyYears,
     lifespanYears, repairabilityLabel}, durab/repair (1-5 editorial),
     strengths/weaknesses/goodFor/notIdeal, issue, uses
   GW-CALCULATED (deterministic formulas at runtime): Performance to
     Cost index, monthly cost, recommendation factor scores
   USER-GENERATED: rating, reviewCount, reviews[]
   Missing-data policy: a missing spec renders as "Not specified" -
   never inferred, never imputed.
   ============================================================ */
/* ---------- Scored factors (0–10 each; used by the recommendation engine) ----------
   performance, battery, durability, portability, display, camera, storage,
   repairability  — normalized so every factor can be combined fairly.      */
/* ponytail: the catalog IS the 10 real products below (GW.realGadgetEntries).
   The alias assignment happens after the array literal so both names point at
   one array. Swap back to a literal array here if mock data ever returns. */

/* ============================================================
   Real-product catalog — ported from the fac3629 prototype.
   Real brands and Wikimedia Commons photos; specs, prices and
   scores remain illustrative demo data.
   ============================================================ */
const WISH_IMGS = {"laptop1":"https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/MacBook_Air_M1.png/960px-MacBook_Air_M1.png","laptop2":"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Acer_Aspire_A515-51.jpg/960px-Acer_Aspire_A515-51.jpg","laptop3":"https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Asus_Vivobook_15.jpg/960px-Asus_Vivobook_15.jpg","tablet1":"https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/IPad_9th_Generation_2024.jpg/960px-IPad_9th_Generation_2024.jpg","tablet2":"https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Xiaomi_Pad_7.jpg/960px-Xiaomi_Pad_7.jpg","phone1":"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Redmi_Note_11_front.jpg/960px-Redmi_Note_11_front.jpg","phone2":"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Back_of_the_Samsung_Galaxy_S23.jpg/960px-Back_of_the_Samsung_Galaxy_S23.jpg","head1":"https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/JBL_Synchros_E50BT.jpg/960px-JBL_Synchros_E50BT.jpg","power1":"https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Anker_power_bank_lit.jpg/960px-Anker_power_bank_lit.jpg","watch1":"https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Amazfit_Bip_Inside.jpg/960px-Amazfit_Bip_Inside.jpg"};

GW.realGadgetEntries = [
 {
  id:  "apple-macbook-air-m1",
  brand:  "Apple",
  model:  "MacBook Air M1",
  category:  "laptops",
  price:  46999,
  rating:  4.9,
  reviewCount:  180,
  releaseYear:  2020,
  status:  "published",
  tagline:  "The laptop students keep past graduation",
  summary:  "Silent, fanless, and 14–15 hours of real battery. Base storage and out-of-warranty repairs are the trade-offs.",
  image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/MacBook_Air_M1.png/960px-MacBook_Air_M1.png",
  specs:  {
   Chipset:  "Apple M1 8-core CPU",
   Memory:  "8GB unified · 256GB SSD",
   Display:  "13.3-inch Retina 2560×1600",
   Battery:  "Real-world battery 14–15 hr · 30W USB-C",
   Weight:  "1.29 kg, fanless"
  },
  specList:  [
   "Apple M1 8-core CPU",
   "8GB unified · 256GB SSD",
   "13.3-inch Retina 2560×1600",
   "Real-world battery 14–15 hr · 30W USB-C",
   "1.29 kg, fanless"
  ],
  scored:  {
   performance:  8.5,
   battery:  10,
   durability:  8.8,
   portability:  9.2,
   display:  9.2,
   camera:  7.2,
   storage:  5.5,
   repairability:  3.5
  },
  value:  {
   warrantyYears:  1,
   lifespanYears:  5,
   repairabilityLabel:  "Hard — authorized service only"
  },
  strengths:  [
   "14–15 hr real-world battery",
   "Silent, fanless operation",
   "Large force-sensing trackpad, quad speakers"
  ],
  weaknesses:  [
   "256GB base storage fills fast",
   "RAM is not upgradeable",
   "Out-of-warranty service is costly"
  ],
  goodFor:  [
   "Programming and thesis builds",
   "Research and writing",
   "All-day classes away from outlets"
  ],
  notIdeal:  [
   "Tight budgets",
   "Students who upgrade parts later"
  ],
  cx:  {
   perf:  85,
   display:  92,
   battery:  100,
   portability:  92,
   durab:  88,
   repair:  35,
   camera:  72,
   storage:  55
  },
  battery:  14.5,
  durab:  4.6,
  repair:  2.1,
  raters:  180,
  pop:  88,
  issue:  "256GB base storage fills fast",
  uses:  {
   programming:  3,
   design:  3,
   classes:  3,
   research:  3,
   gaming:  1,
   video:  2
  },
  warranty:  12,
  reviews:  [
   {
    id:  "r-apple-macbook-air-m1-1",
    user:  "Kai M.",
    rating:  5,
    date:  "2026-08-14",
    context:  "Year 3 student",
    text:  "Left the charger at home all week. Still on 30% by Saturday review sessions. The battery alone is worth it."
   },
   {
    id:  "r-apple-macbook-air-m1-2",
    user:  "Rina P.",
    rating:  5,
    date:  "2026-02-20",
    context:  "Year 2 student",
    text:  "Compiles our thesis Android app in seconds. Speakers embarrass laptops twice the price."
   },
   {
    id:  "r-apple-macbook-air-m1-3",
    user:  "Doms L.",
    rating:  4,
    date:  "2025-09-10",
    context:  "Year 1 student",
    text:  "One dent after a backpack drop. Screen replacement quote was ₱18k — insure this one."
   }
  ],
  issues:  [
   {
    id:  "i-apple-macbook-air-m1",
    title:  "256GB base storage fills fast",
    reportedBy:  "Community report",
    date:  "2026-06-01",
    status:  "confirmed",
    severity:  "moderate"
   }
  ]
 },
 {
  id:  "acer-aspire-5-a515",
  brand:  "Acer",
  model:  "Acer Aspire 5 A515",
  category:  "laptops",
  price:  28999,
  rating:  4.3,
  reviewCount:  240,
  releaseYear:  2023,
  status:  "published",
  tagline:  "The budget workhorse you can fix yourself",
  summary:  "Standard parts, user-upgradeable RAM and SSD, strong performance per peso. The chassis and display show the price.",
  image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Acer_Aspire_A515-51.jpg/960px-Acer_Aspire_A515-51.jpg",
  specs:  {
   Chipset:  "AMD Ryzen 5 7520U",
   Memory:  "16GB RAM · 512GB SSD",
   Display:  "15.6-inch IPS FHD",
   Battery:  "Battery 9 hr claimed · 65W USB-C",
   Weight:  "1.78 kg"
  },
  specList:  [
   "AMD Ryzen 5 7520U",
   "16GB RAM · 512GB SSD",
   "15.6-inch IPS FHD",
   "Battery 9 hr claimed · 65W USB-C",
   "1.78 kg"
  ],
  scored:  {
   performance:  7.2,
   battery:  6,
   durability:  7,
   portability:  5.5,
   display:  6.5,
   camera:  5,
   storage:  7,
   repairability:  8.8
  },
  value:  {
   warrantyYears:  1,
   lifespanYears:  4,
   repairabilityLabel:  "Easy — standard parts, cheap fixes"
  },
  strengths:  [
   "Standard, widely available parts",
   "RAM and SSD are user-upgradeable",
   "Strong performance per peso"
  ],
  weaknesses:  [
   "Plastic chassis flexes under pressure",
   "Display is dim for outdoor use"
  ],
  goodFor:  [
   "Programming on a budget",
   "Documents and presentations",
   "Students who repair instead of replace"
  ],
  notIdeal:  [
   "Design and color-critical work",
   "Daily long carries"
  ],
  cx:  {
   perf:  72,
   display:  65,
   battery:  60,
   portability:  55,
   durab:  70,
   repair:  88,
   camera:  50,
   storage:  70
  },
  battery:  7.5,
  durab:  3.8,
  repair:  4.2,
  raters:  240,
  pop:  85,
  issue:  "Early batches had a rattly trackpad",
  uses:  {
   programming:  3,
   design:  1,
   classes:  3,
   research:  3,
   gaming:  2,
   video:  1
  },
  warranty:  12,
  reviews:  [
   {
    id:  "r-acer-aspire-5-a515-1",
    user:  "JC R.",
    rating:  4,
    date:  "2026-02-20",
    context:  "Year 2 student",
    text:  "Handles docs, Zoom, VS Code and light Blender. Keyboard flex is the only gripe."
   },
   {
    id:  "r-acer-aspire-5-a515-2",
    user:  "Mai S.",
    rating:  5,
    date:  "2025-09-10",
    context:  "Year 1 student",
    text:  "Upgraded the SSD myself in 15 minutes. Every part is a standard size — repairs are cheap here."
   },
   {
    id:  "r-acer-aspire-5-a515-3",
    user:  "Fons M.",
    rating:  4,
    date:  "2026-08-14",
    context:  "Year 3 student",
    text:  "Charger brick is small, fits the same pouch as my power bank."
   }
  ],
  issues:  [
   {
    id:  "i-acer-aspire-5-a515",
    title:  "Early batches had a rattly trackpad",
    reportedBy:  "Community report",
    date:  "2026-06-01",
    status:  "confirmed",
    severity:  "moderate"
   }
  ]
 },
 {
  id:  "asus-vivobook-15",
  brand:  "ASUS",
  model:  "ASUS Vivobook 15",
  category:  "laptops",
  price:  32999,
  rating:  4.4,
  reviewCount:  160,
  releaseYear:  2023,
  status:  "published",
  tagline:  "Two-year warranty, OLED, no upgrade tax",
  summary:  "The longest laptop warranty here plus an OLED panel for design work. Fan noise and battery life are the trade.",
  image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Asus_Vivobook_15.jpg/960px-Asus_Vivobook_15.jpg",
  specs:  {
   Chipset:  "Intel Core i5-1335U",
   Memory:  "16GB RAM · 512GB SSD",
   Display:  "15.6-inch OLED option",
   Battery:  "Battery 7 hr · 65W USB-C",
   Weight:  "1.7 kg"
  },
  specList:  [
   "Intel Core i5-1335U",
   "16GB RAM · 512GB SSD",
   "15.6-inch OLED option",
   "Battery 7 hr · 65W USB-C",
   "1.7 kg"
  ],
  scored:  {
   performance:  7.8,
   battery:  5.2,
   durability:  8.2,
   portability:  6.2,
   display:  8.8,
   camera:  5.5,
   storage:  7,
   repairability:  8
  },
  value:  {
   warrantyYears:  2,
   lifespanYears:  4,
   repairabilityLabel:  "Easy — standard parts, cheap fixes"
  },
  strengths:  [
   "Two-year warranty",
   "OLED panel for design work",
   "16GB RAM out of the box"
  ],
  weaknesses:  [
   "Audible fan under sustained load",
   "Below-average battery life"
  ],
  goodFor:  [
   "Design and multimedia coursework",
   "Programming with longer warranty cover",
   "Presentations on external displays"
  ],
  notIdeal:  [
   "All-day off-charger use",
   "Quiet environments like libraries"
  ],
  cx:  {
   perf:  78,
   display:  88,
   battery:  52,
   portability:  62,
   durab:  82,
   repair:  80,
   camera:  55,
   storage:  70
  },
  battery:  7,
  durab:  4.4,
  repair:  4.3,
  raters:  160,
  pop:  74,
  issue:  "Fan spins up under sustained load",
  uses:  {
   programming:  3,
   design:  2,
   classes:  3,
   research:  2,
   gaming:  2,
   video:  2
  },
  warranty:  24,
  reviews:  [
   {
    id:  "r-asus-vivobook-15-1",
    user:  "Bea T.",
    rating:  5,
    date:  "2026-02-20",
    context:  "Year 2 student",
    text:  "The OLED makes Figma layouts pop. 16GB out of the box means no upgrade tax."
   },
   {
    id:  "r-asus-vivobook-15-2",
    user:  "Ogie W.",
    rating:  4,
    date:  "2025-09-10",
    context:  "Year 1 student",
    text:  "Fan gets chatty on long compiles but never thermal-throttled on me."
   },
   {
    id:  "r-asus-vivobook-15-3",
    user:  "Shai G.",
    rating:  4,
    date:  "2026-02-20",
    context:  "Year 2 student",
    text:  "Two-year warranty sealed it for me. Service center fixed a hinge in 3 days."
   }
  ],
  issues:  [
   {
    id:  "i-asus-vivobook-15",
    title:  "Fan spins up under sustained load",
    reportedBy:  "Community report",
    date:  "2026-06-01",
    status:  "confirmed",
    severity:  "moderate"
   }
  ]
 },
 {
  id:  "apple-ipad-9",
  brand:  "Apple",
  model:  "iPad 9th Generation",
  category:  "tablets",
  price:  19499,
  rating:  4.7,
  reviewCount:  210,
  releaseYear:  2021,
  status:  "published",
  tagline:  "Cheapest real entry into the Pencil workflow",
  summary:  "Long software support, strong resale, paperless note-taking on a budget. Base storage is tight and extras cost more.",
  image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/IPad_9th_Generation_2024.jpg/960px-IPad_9th_Generation_2024.jpg",
  specs:  {
   Chipset:  "A13 Bionic chip",
   Storage:  "64GB · Wi-Fi",
   Display:  "10.2-inch Retina",
   Battery:  "Battery 9–10 hr video",
   Extras:  "Apple Pencil (1st gen) supported"
  },
  specList:  [
   "A13 Bionic chip",
   "64GB · Wi-Fi",
   "10.2-inch Retina",
   "Battery 9–10 hr video",
   "Apple Pencil (1st gen) supported"
  ],
  scored:  {
   performance:  6.2,
   battery:  7.8,
   durability:  8.2,
   portability:  9,
   display:  7.5,
   camera:  6,
   storage:  3.5,
   repairability:  4.5
  },
  value:  {
   warrantyYears:  1,
   lifespanYears:  5,
   repairabilityLabel:  "Hard — authorized service only"
  },
  strengths:  [
   "5+ years of iPadOS updates",
   "Lowest-cost Apple Pencil support",
   "Holds resale value well"
  ],
  weaknesses:  [
   "64GB base storage",
   "Non-laminated display",
   "Pencil and keyboard sold separately"
  ],
  goodFor:  [
   "Paperless note-taking",
   "Reading and PDF annotation",
   "Media consumption between classes"
  ],
  notIdeal:  [
   "Primary laptop replacement",
   "Large offline media libraries"
  ],
  cx:  {
   perf:  62,
   display:  75,
   battery:  78,
   portability:  90,
   durab:  82,
   repair:  45,
   camera:  60,
   storage:  35
  },
  battery:  9,
  durab:  4.3,
  repair:  2.8,
  raters:  210,
  pop:  79,
  issue:  "Non-laminated display shows more glare",
  uses:  {
   programming:  1,
   design:  2,
   classes:  3,
   research:  3,
   gaming:  2,
   video:  3
  },
  warranty:  12,
  reviews:  [
   {
    id:  "r-apple-ipad-9-1",
    user:  "Nadine C.",
    rating:  5,
    date:  "2026-08-14",
    context:  "Year 3 student",
    text:  "GoodNotes replaced all my notebooks. Still gets iPadOS updates years in — that's the long-term value."
   },
   {
    id:  "r-apple-ipad-9-2",
    user:  "Iya V.",
    rating:  4,
    date:  "2025-09-10",
    context:  "Year 1 student",
    text:  "Split-screen lecture PDF + Zoom runs smooth. Storage is tight though."
   },
   {
    id:  "r-apple-ipad-9-3",
    user:  "Trina U.",
    rating:  5,
    date:  "2026-02-20",
    context:  "Year 2 student",
    text:  "Cheapest real iPad. Resale after 3 years still recovers half the price."
   }
  ],
  issues:  [
   {
    id:  "i-apple-ipad-9",
    title:  "Non-laminated display shows more glare",
    reportedBy:  "Community report",
    date:  "2026-06-01",
    status:  "confirmed",
    severity:  "moderate"
   }
  ]
 },
 {
  id:  "xiaomi-pad-7",
  brand:  "Xiaomi",
  model:  "Xiaomi Pad 7",
  category:  "tablets",
  price:  16999,
  rating:  4.5,
  reviewCount:  130,
  releaseYear:  2024,
  status:  "published",
  tagline:  "144Hz 3.2K display",
  summary:  "A full day of classes on one charge and a display that embarrasses pricier tablets. Stylus and keyboard sold separately.",
  image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Xiaomi_Pad_7.jpg/960px-Xiaomi_Pad_7.jpg",
  specs:  {
   Chipset:  "Snapdragon 7+ Gen 3",
   Memory:  "8GB RAM · 128GB",
   Display:  "11.2-inch 3.2K 144Hz",
   Battery:  "Battery 8,850 mAh · 45W",
   Stylus:  "Focus stylus + keyboard support"
  },
  specList:  [
   "Snapdragon 7+ Gen 3",
   "8GB RAM · 128GB",
   "11.2-inch 3.2K 144Hz",
   "Battery 8,850 mAh · 45W",
   "Focus stylus + keyboard support"
  ],
  scored:  {
   performance:  8.2,
   battery:  8.8,
   durability:  7.5,
   portability:  8.5,
   display:  9.5,
   camera:  4.5,
   storage:  6,
   repairability:  4
  },
  value:  {
   warrantyYears:  1,
   lifespanYears:  4,
   repairabilityLabel:  "Moderate — some parts need a shop"
  },
  strengths:  [
   "144Hz 3.2K display",
   "Snapdragon 7+ Gen 3",
   "8,850 mAh full-day battery"
  ],
  weaknesses:  [
   "Stylus and keyboard sold separately",
   "Fewer note-app integrations than iPad"
  ],
  goodFor:  [
   "Video streaming and reading",
   "Digital flashcards and PDF markup",
   "Budget-conscious media students"
  ],
  notIdeal:  [
   "Deep Pencil-style workflows",
   "Students already in the Apple ecosystem"
  ],
  cx:  {
   perf:  82,
   display:  95,
   battery:  88,
   portability:  85,
   durab:  75,
   repair:  40,
   camera:  45,
   storage:  60
  },
  battery:  10,
  durab:  4,
  repair:  3,
  raters:  130,
  pop:  68,
  issue:  "Stylus sold separately",
  uses:  {
   programming:  1,
   design:  2,
   classes:  3,
   research:  3,
   gaming:  3,
   video:  3
  },
  warranty:  12,
  reviews:  [
   {
    id:  "r-xiaomi-pad-7-1",
    user:  "Enzo H.",
    rating:  5,
    date:  "2026-02-20",
    context:  "Year 2 student",
    text:  "144Hz at this price is unfair. A full Thursday of classes on one charge."
   },
   {
    id:  "r-xiaomi-pad-7-2",
    user:  "Paolo D.",
    rating:  4,
    date:  "2025-09-10",
    context:  "Year 1 student",
    text:  "Great for notes and video. App ecosystem still behind iPad for note apps."
   },
   {
    id:  "r-xiaomi-pad-7-3",
    user:  "Luigi B.",
    rating:  4,
    date:  "2026-02-20",
    context:  "Year 2 student",
    text:  "Doubles as my second monitor for the laptop. Stylus buying separately stings."
   }
  ],
  issues:  [
   {
    id:  "i-xiaomi-pad-7",
    title:  "Stylus sold separately",
    reportedBy:  "Community report",
    date:  "2026-06-01",
    status:  "confirmed",
    severity:  "moderate"
   }
  ]
 },
 {
  id:  "redmi-note-11",
  brand:  "Redmi",
  model:  "Redmi Note 11",
  category:  "smartphones",
  price:  6999,
  rating:  4.2,
  reviewCount:  300,
  releaseYear:  2022,
  status:  "published",
  tagline:  "The first phone that survives an allowance",
  summary:  "AMOLED 90Hz and one-hour charging at ₱7k, with parts everywhere. Gaming and low-light photos are where it saves.",
  image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Redmi_Note_11_front.jpg/960px-Redmi_Note_11_front.jpg",
  specs:  {
   Display:  "6.43-inch AMOLED 90Hz",
   Chipset:  "Helio G96",
   Memory:  "6GB RAM · 128GB",
   Battery:  "5,000 mAh · 33W",
   Camera:  "50MP main camera"
  },
  specList:  [
   "6.43-inch AMOLED 90Hz",
   "Helio G96",
   "6GB RAM · 128GB",
   "5,000 mAh · 33W",
   "50MP main camera"
  ],
  scored:  {
   performance:  4.5,
   battery:  8,
   durability:  6.8,
   portability:  9.5,
   display:  8,
   camera:  5.5,
   storage:  6.5,
   repairability:  8.2
  },
  value:  {
   warrantyYears:  1,
   lifespanYears:  3,
   repairabilityLabel:  "Moderate — some parts need a shop"
  },
  strengths:  [
   "AMOLED 90Hz display",
   "33W fast charging",
   "Widely available parts and service"
  ],
  weaknesses:  [
   "Helio G96, entry-level performance",
   "Weak low-light camera",
   "Preinstalled third-party apps"
  ],
  goodFor:  [
   "Calls, GCash, school apps",
   "First phone on a tight allowance",
   "Backup phone for fieldwork"
  ],
  notIdeal:  [
   "Mobile gaming",
   "Photo-heavy coursework"
  ],
  cx:  {
   perf:  45,
   display:  80,
   battery:  80,
   portability:  95,
   durab:  68,
   repair:  82,
   camera:  55,
   storage:  65
  },
  battery:  8.2,
  durab:  3.6,
  repair:  3.9,
  raters:  300,
  pop:  86,
  issue:  "Preloaded bloatware",
  uses:  {
   programming:  1,
   design:  1,
   classes:  3,
   research:  2,
   gaming:  1,
   video:  2,
   photography:  2
  },
  warranty:  12,
  reviews:  [
   {
    id:  "r-redmi-note-11-1",
    user:  "Tin A.",
    rating:  5,
    date:  "2026-08-14",
    context:  "Year 3 student",
    text:  "AMOLED at ₱7k carried my whole first year. Charges during one lunch break."
   },
   {
    id:  "r-redmi-note-11-2",
    user:  "Rey F.",
    rating:  4,
    date:  "2026-02-20",
    context:  "Year 2 student",
    text:  "Camera is fine for board notes and GCash scans. Loads ML files slowly."
   },
   {
    id:  "r-redmi-note-11-3",
    user:  "Kaye L.",
    rating:  4,
    date:  "2025-09-10",
    context:  "Year 1 student",
    text:  "Dropped screen-first twice with a case — survived. Parts are everywhere."
   }
  ],
  issues:  [
   {
    id:  "i-redmi-note-11",
    title:  "Preloaded bloatware",
    reportedBy:  "Community report",
    date:  "2026-06-01",
    status:  "confirmed",
    severity:  "moderate"
   }
  ]
 },
 {
  id:  "samsung-galaxy-s23",
  brand:  "Samsung",
  model:  "Samsung Galaxy S23",
  category:  "smartphones",
  price:  38990,
  rating:  4.7,
  reviewCount:  190,
  releaseYear:  2023,
  status:  "published",
  tagline:  "Flagship camera in a one-hand body",
  summary:  "Night-mode camera for thesis documentation, compact build, 4 OS updates promised. Battery needs top-ups.",
  image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Back_of_the_Samsung_Galaxy_S23.jpg/960px-Back_of_the_Samsung_Galaxy_S23.jpg",
  specs:  {
   Display:  "6.1-inch Dynamic AMOLED 120Hz",
   Chipset:  "Snapdragon 8 Gen 2",
   Memory:  "8GB RAM · 256GB",
   Battery:  "3,900 mAh · 25W",
   Durability:  "IP68 water resistant"
  },
  specList:  [
   "6.1-inch Dynamic AMOLED 120Hz",
   "Snapdragon 8 Gen 2",
   "8GB RAM · 256GB",
   "3,900 mAh · 25W",
   "IP68 water resistant"
  ],
  scored:  {
   performance:  9.2,
   battery:  6.2,
   durability:  8.6,
   portability:  9.6,
   display:  9.5,
   camera:  9,
   storage:  8,
   repairability:  3.8
  },
  value:  {
   warrantyYears:  1,
   lifespanYears:  4,
   repairabilityLabel:  "Hard — authorized service only"
  },
  strengths:  [
   "Flagship camera with night mode",
   "Compact 168 g body",
   "4 OS upgrades + 5 years security updates"
  ],
  weaknesses:  [
   "3,900 mAh — smallest in class",
   "25W charging",
   "High out-of-warranty service cost"
  ],
  goodFor:  [
   "Photography and content creation",
   "Research on the go",
   "Students keeping a phone 4+ years"
  ],
  notIdeal:  [
   "Heavy mobile gaming sessions",
   "Students who forget power banks"
  ],
  cx:  {
   perf:  92,
   display:  95,
   battery:  62,
   portability:  96,
   durab:  86,
   repair:  38,
   camera:  90,
   storage:  80
  },
  battery:  8,
  durab:  4.4,
  repair:  2.9,
  raters:  190,
  pop:  81,
  issue:  "Battery health dips faster than expected",
  uses:  {
   programming:  2,
   design:  2,
   classes:  3,
   research:  3,
   gaming:  3,
   video:  3,
   photography:  3
  },
  warranty:  12,
  reviews:  [
   {
    id:  "r-samsung-galaxy-s23-1",
    user:  "Jopay K.",
    rating:  5,
    date:  "2026-08-14",
    context:  "Year 3 student",
    text:  "Flagship camera for thesis documentation. Night mode saves my indoor shots."
   },
   {
    id:  "r-samsung-galaxy-s23-2",
    user:  "Doms L.",
    rating:  4,
    date:  "2026-02-20",
    context:  "Year 2 student",
    text:  "Compact size is the selling point — actually fits one hand. Battery needs a power bank on long days."
   },
   {
    id:  "r-samsung-galaxy-s23-3",
    user:  "Aira S.",
    rating:  5,
    date:  "2026-02-20",
    context:  "Year 2 student",
    text:  "Four years of updates promised. Cost per year beats cheaper phones."
   }
  ],
  issues:  [
   {
    id:  "i-samsung-galaxy-s23",
    title:  "Battery health dips faster than expected",
    reportedBy:  "Community report",
    date:  "2026-06-01",
    status:  "confirmed",
    severity:  "moderate"
   }
  ]
 },
 {
  id:  "jbl-synchros-e50bt",
  brand:  "JBL",
  model:  "JBL Synchros E50BT",
  category:  "headphones",
  price:  4499,
  rating:  4,
  reviewCount:  95,
  releaseYear:  2018,
  status:  "published",
  tagline:  "Bass for the commute, aux for the dead battery",
  summary:  "Pure Bass sound that drowns the LRT, aux fallback, folds flat. Ear pads flake around month 11 and there is no ANC.",
  image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/JBL_Synchros_E50BT.jpg/960px-JBL_Synchros_E50BT.jpg",
  specs:  {
   Type:  "Over-ear, wireless",
   Sound:  "JBL Pure Bass sound",
   Battery:  "Battery ~16 hr",
   Connectivity:  "Bluetooth + aux fallback",
   Design:  "Foldable, padded headband"
  },
  specList:  [
   "Over-ear, wireless",
   "JBL Pure Bass sound",
   "Battery ~16 hr",
   "Bluetooth + aux fallback",
   "Foldable, padded headband"
  ],
  scored:  {
   performance:  5.5,
   battery:  5.5,
   durability:  6.5,
   portability:  7,
   display:  6.2,
   camera:  5,
   storage:  5,
   repairability:  6
  },
  value:  {
   warrantyYears:  1,
   lifespanYears:  2.5,
   repairabilityLabel:  "Moderate — some parts need a shop"
  },
  strengths:  [
   "JBL Pure Bass sound",
   "Wired aux backup",
   "Flat-folding design"
  ],
  weaknesses:  [
   "Ear pads wear within a year",
   "No active noise cancelling",
   "Average call mic quality"
  ],
  goodFor:  [
   "Jeepney and LRT commutes",
   "Casual listening between classes",
   "Backup wired/wireless pair"
  ],
  notIdeal:  [
   "All-day library wear",
   "Online recitation-heavy schedules"
  ],
  cx:  {
   perf:  55,
   comfort:  62,
   battery:  55,
   portability:  70,
   durab:  65,
   repair:  60,
   mic:  50
  },
  battery:  7.5,
  durab:  3.5,
  repair:  3.2,
  raters:  95,
  pop:  55,
  issue:  "Ear pads flake after about a year",
  uses:  {
   programming:  0,
   design:  1,
   classes:  3,
   research:  2,
   gaming:  2,
   video:  1
  },
  warranty:  12,
  reviews:  [
   {
    id:  "r-jbl-synchros-e50bt-1",
    user:  "Shai G.",
    rating:  4,
    date:  "2026-02-20",
    context:  "Year 2 student",
    text:  "Bass drowns the LRT noise during commute reviews. Pads get warm after 2 hours."
   },
   {
    id:  "r-jbl-synchros-e50bt-2",
    user:  "Enzo H.",
    rating:  4,
    date:  "2025-09-10",
    context:  "Year 1 student",
    text:  "Aux cable saved me when the battery died mid-library session."
   },
   {
    id:  "r-jbl-synchros-e50bt-3",
    user:  "Mai S.",
    rating:  3,
    date:  "2026-02-20",
    context:  "Year 2 student",
    text:  "Pads started flaking at month 11. Replaceable, but annoying."
   }
  ],
  issues:  [
   {
    id:  "i-jbl-synchros-e50bt",
    title:  "Ear pads flake after about a year",
    reportedBy:  "Community report",
    date:  "2026-06-01",
    status:  "confirmed",
    severity:  "moderate"
   }
  ]
 },
 {
  id:  "anker-powercore-20100",
  brand:  "Anker",
  model:  "PowerCore 20100",
  category:  "powerbanks",
  price:  2450,
  rating:  4.8,
  reviewCount:  350,
  releaseYear:  2018,
  status:  "published",
  tagline:  "Brownout insurance with an 18-month warranty",
  summary:  "20,000 mAh capacity with 18W USB-C PD in and out — enough to keep a phone, tablet, and router alive through a long outage.",
  image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Anker_power_bank_lit.jpg/960px-Anker_power_bank_lit.jpg",
  specs:  {
   Capacity:  "20,000 mAh",
   Output:  "18W USB-C PD in/out",
   "Laptop charging": "Charges a laptop (trickle)",
   Display:  "4-LED charge display",
   Safety:  "Airline-safe capacity"
  },
  specList:  [
   "20,000 mAh",
   "18W USB-C PD in/out",
   "Charges a laptop (trickle)",
   "4-LED charge display",
   "Airline-safe capacity"
  ],
  scored:  {
   performance:  7.5,
   battery:  9.5,
   durability:  9.2,
   portability:  4,
   display:  3,
   camera:  0,
   storage:  5,
   repairability:  5.5
  },
  value:  {
   warrantyYears:  1.5,
   lifespanYears:  3,
   repairabilityLabel:  "Moderate — some parts need a shop"
  },
  strengths:  [
   "18W USB-C PD two-way charging",
   "20,000 mAh — about 4 full phone charges",
   "18-month warranty"
  ],
  weaknesses:  [
   "355 g — heavier than pocket-size banks",
   "Full recharge takes several hours"
  ],
  goodFor:  [
   "Long field days and brownouts",
   "Laptop users between outlets",
   "Group-work charging duty"
  ],
  notIdeal:  [
   "Everyday minimal carry",
   "Quick recharges between classes"
  ],
  cx:  {
   perf:  75,
   comfort:  30,
   battery:  95,
   portability:  40,
   durab:  92,
   repair:  55,
   mic:  0
  },
  battery:  9.5,
  durab:  4.5,
  repair:  3.4,
  raters:  350,
  pop:  82,
  issue:  "None reported yet",
  uses:  {
   programming:  2,
   design:  1,
   classes:  3,
   research:  2,
   gaming:  2,
   video:  2
  },
  warranty:  18,
  reviews:  [
   {
    id:  "r-anker-powercore-20100-1",
    user:  "Fons M.",
    rating:  5,
    date:  "2026-08-14",
    context:  "Year 3 student",
    text:  "Brownout insurance. Kept my router, phone and laptop alive through a 6-hour outage."
   },
   {
    id:  "r-anker-powercore-20100-2",
    user:  "Kaye L.",
    rating:  5,
    date:  "2026-02-20",
    context:  "Year 2 student",
    text:  "Heavy, but that's physics. Four years of daily service and it never swelled."
   },
   {
    id:  "r-anker-powercore-20100-3",
    user:  "Iya V.",
    rating:  5,
    date:  "2025-09-10",
    context:  "Year 1 student",
    text:  "Pays for itself the first time it saves a 20% battery before a quiz."
   }
  ],
  issues:  []
 },
 {
  id:  "amazfit-bip",
  brand:  "Amazfit",
  model:  "Amazfit Bip",
  category:  "smartwatches",
  price:  3190,
  rating:  4.3,
  reviewCount:  140,
  releaseYear:  2018,
  status:  "published",
  tagline:  "Charge it monthly, forget it daily",
  summary:  "Up to 30 days per charge, silent alarms for early classes, light enough to forget. Basic metrics, scratchy screen.",
  image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Amazfit_Bip_Inside.jpg/960px-Amazfit_Bip_Inside.jpg",
  specs:  {
   Display:  "1.28-inch always-on display",
   Battery:  "Up to 30-day battery",
   Sensors:  "GPS + SpO2 + heart rate",
   "Water resistance": "5 ATM water resistant",
   Alarms:  "Silent vibrating alarms"
  },
  specList:  [
   "1.28-inch always-on display",
   "Up to 30-day battery",
   "GPS + SpO2 + heart rate",
   "5 ATM water resistant",
   "Silent vibrating alarms"
  ],
  scored:  {
   performance:  4,
   battery:  10,
   durability:  7.2,
   portability:  10,
   display:  8.5,
   camera:  0,
   storage:  3,
   repairability:  4.5
  },
  value:  {
   warrantyYears:  1,
   lifespanYears:  3,
   repairabilityLabel:  "Hard — authorized service only"
  },
  strengths:  [
   "Up to 30-day battery",
   "Silent vibrating alarms",
   "31 g lightweight body"
  ],
  weaknesses:  [
   "Slow GPS lock",
   "Basic fitness tracking",
   "Unprotected screen glass"
  ],
  goodFor:  [
   "7:30am class alarms",
   "Habit and sleep tracking",
   "Budget fitness logging"
  ],
  notIdeal:  [
   "Serious run training",
   "Replying to messages from the wrist"
  ],
  cx:  {
   perf:  40,
   comfort:  85,
   battery:  100,
   portability:  100,
   durab:  72,
   repair:  45,
   camera:  0,
   storage:  30
  },
  battery:  9.9,
  durab:  3.8,
  repair:  2.9,
  raters:  140,
  pop:  58,
  issue:  "Slow GPS lock",
  uses:  {
   programming:  0,
   design:  0,
   classes:  3,
   research:  1,
   gaming:  0,
   video:  0
  },
  warranty:  12,
  reviews:  [
   {
    id:  "r-amazfit-bip-1",
    user:  "Trina U.",
    rating:  5,
    date:  "2026-02-20",
    context:  "Year 2 student",
    text:  "Silent alarms for 7:30am classes saved my attendance. Charges like once a month."
   },
   {
    id:  "r-amazfit-bip-2",
    user:  "Ogie W.",
    rating:  4,
    date:  "2025-09-10",
    context:  "Year 1 student",
    text:  "Tracks my commute walks honestly. GPS takes a minute to lock near buildings."
   },
   {
    id:  "r-amazfit-bip-3",
    user:  "Luigi B.",
    rating:  4,
    date:  "2026-02-20",
    context:  "Year 2 student",
    text:  "Paired with Google Fit fine. Screen scratches if you're careless."
   }
  ],
  issues:  [
   {
    id:  "i-amazfit-bip",
    title:  "Slow GPS lock",
    reportedBy:  "Community report",
    date:  "2026-06-01",
    status:  "confirmed",
    severity:  "moderate"
   }
  ]
 }
];
/* ---------- end GW.realGadgetEntries (GW.gadgets aliases this array) ---------- */

/* ---------- Batch 2: 10 more real products (same structure, verified Commons photos) ---------- */
GW.realGadgetEntries.push(
{
 id:  "lenovo-ideapad-slim-3",
 brand:  "Lenovo",
 model:  "IdeaPad Slim 3",
 category:  "laptops",
 price:  24999,
 rating:  4.2,
 reviewCount:  142,
 releaseYear:  2023,
 status:  "published",
 tagline:  "The dependable budget all-rounder",
 summary:  "A straightforward 15.6-inch daily driver for documents, browsers, and online classes. Neither fast nor fancy — just steady.",
 image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Lenovo_Ideapad_100-15IBY_-_cristaux_liquides_%285_dioptries%29.jpg/960px-Lenovo_Ideapad_100-15IBY_-_cristaux_liquides_%285_dioptries%29.jpg",
 specs:  {
  Processor:  "Intel Core i3-N305 (8-core)",
  Memory:  "8GB DDR4 · 512GB SSD",
  Display:  "15.6-inch FHD TN",
  Battery:  "Battery ~7 hr · 45W USB-C",
  Weight:  "1.62 kg"
 },
 specList:  ["Intel Core i3-N305", "8GB · 512GB SSD", "15.6-inch FHD", "Battery ~7 hr", "1.62 kg"],
 scored:  { performance: 4.5, battery: 6.5, durability: 6.0, portability: 6.5, display: 5.0, camera: 3.0, storage: 6.5, repairability: 7.5 },
 value:  { warrantyYears: 1, lifespanYears: 4, repairabilityLabel: "Easy — standard RAM and SSD slots" },
 strengths:  ["15.6-inch screen at an entry price", "User-upgradeable RAM and storage", "Full-size keyboard with numpad"],
 weaknesses:  ["TN panel, narrow viewing angles", "Integrated graphics only", "Chassis flex under pressure"],
 goodFor:  ["Documents and online classes", "First laptop on a tight budget", "Typing-heavy coursework"],
 notIdeal:  ["Photo or video editing", "Outdoor use in sunlight"],
 cx:  { perf: 45, display: 50, battery: 65, portability: 65, durab: 60, repair: 75, camera: 30, storage: 65 },
 battery:  7.0, durab:  3.0, repair:  3.8, pop:  62,
 uses:  { programming: 2, design: 1, classes: 3, research: 2, gaming: 1, video: 1 },
 reviews:  [
  { id: "r-ips1", user: "Miguel C.", rating: 4, date: "2026-05-20", context: "Online classes · 1 year",
    text: "Does everything I need for school. Screen looks washed out compared to my classmate's laptop, but for the price I can't complain." },
  { id: "r-ips2", user: "Grace T.", rating: 4, date: "2026-03-11", context: "Documents + browsing · 8 months",
    text: "Keyboard feels nice to type on. Added another RAM stick myself and it runs smoother now." },
  { id: "r-ips3", user: "Fons M.", rating: 3, date: "2025-12-02", context: "General use · 1 year",
    text: "It's slow with many Chrome tabs. Fine for one subject at a time, painful when I multitask." }
 ],
 issues:  [
  { id: "i-ips1", title: "Palm rest coating wears off with heavy use", reportedBy: "Community report", date: "2026-04-14", status: "confirmed", severity: "minor" }
 ]
},
{
 id:  "hp-15s-fq",
 brand:  "HP",
 model:  "15s-fq",
 category:  "laptops",
 price:  27999,
 rating:  4.0,
 reviewCount:  118,
 releaseYear:  2023,
 status:  "published",
 tagline:  "The safe campus choice",
 summary:  "Solid build, serviceable parts, and a bright enough screen for lecture halls. Battery life is where it saves money.",
 image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/15.6%22_%D0%9D%D0%BE%D1%83%D1%82%D0%B1%D1%83%D0%BA_HP_Laptop_15s-eq1319ur_%D1%87%D1%91%D1%80%D0%BD%D1%8B%D0%B9.jpg/960px-15.6%22_%D0%9D%D0%BE%D1%83%D1%82%D0%B1%D1%83%D0%BA_HP_Laptop_15s-eq1319ur_%D1%87%D1%91%D1%80%D0%BD%D1%8B%D0%B9.jpg",
 specs:  {
  Processor:  "AMD Ryzen 5 5500U",
  Memory:  "8GB DDR4 · 512GB SSD",
  Display:  "15.6-inch FHD IPS",
  Battery:  "Battery ~8 hr claimed · 45W",
  Weight:  "1.69 kg"
 },
 specList:  ["AMD Ryzen 5 5500U", "8GB · 512GB SSD", "15.6-inch FHD IPS", "Battery ~8 hr claimed", "1.69 kg"],
 scored:  { performance: 6.0, battery: 6.0, durability: 6.5, portability: 6.0, display: 6.5, camera: 3.5, storage: 6.5, repairability: 7.0 },
 value:  { warrantyYears: 1, lifespanYears: 4, repairabilityLabel: "Easy — widely available parts" },
 strengths:  ["Ryzen 5, 8-core CPU", "IPS panel", "Nationwide service centers"],
 weaknesses:  ["Thin speaker output", "Battery below stated rating under Wi-Fi load", "No card reader"],
 goodFor:  ["Multitasking schoolwork", "Presentations and documents", "Students near HP service centers"],
 notIdeal:  ["Media watching without external speakers", "All-day battery-dependent schedules"],
 cx:  { perf: 60, display: 65, battery: 60, portability: 60, durab: 65, repair: 70, camera: 35, storage: 65 },
 battery:  8.0, durab:  3.3, repair:  3.5, pop:  68,
 uses:  { programming: 2, design: 1, classes: 3, research: 3, gaming: 1, video: 1 },
 reviews:  [
  { id: "r-hp1", user: "Bea M.", rating: 4, date: "2026-06-18", context: "Multitasking · 10 months",
    text: "Opens spreadsheets, Zoom, and 20 tabs without choking. Speakers are the weak part — I use earphones." },
  { id: "r-hp2", user: "Ramon A.", rating: 4, date: "2026-01-30", context: "Programming · 1 year",
    text: "Runs VS Code and a local server fine. Battery gets me through a half day, not the full 8 hours claimed." }
 ],
 issues:  [
  { id: "i-hp1", title: "Trackpad registers ghost clicks after firmware update", reportedBy: "Community report", date: "2026-05-02", status: "investigating", severity: "minor" }
 ]
},
{
 id:  "asus-tuf-f15",
 brand:  "ASUS",
 model:  "TUF Gaming F15",
 category:  "laptops",
 price:  52999,
 rating:  4.4,
 reviewCount:  96,
 releaseYear:  2023,
 status:  "published",
 tagline:  "For IT students who game too",
 summary:  "MIL-STD-810H durability testing and a real gaming GPU in a laptop that survives a backpack. Heavy and thirsty.",
 image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/ASUS_TUF_Gaming_5_Pro_Laptop.jpg/960px-ASUS_TUF_Gaming_5_Pro_Laptop.jpg",
 specs:  {
  Processor:  "Intel Core i5-12500H",
  Graphics:  "RTX 3050 4GB",
  Memory:  "16GB DDR4 · 512GB SSD",
  Display:  "15.6-inch FHD 144Hz",
  Battery:  "Battery ~5 hr light use · 90W",
  Weight:  "2.2 kg"
 },
 specList:  ["Intel i5-12500H", "RTX 3050 4GB", "16GB · 512GB SSD", "15.6-inch FHD 144Hz", "2.2 kg"],
 scored:  { performance: 8.5, battery: 5.0, durability: 8.5, portability: 4.5, display: 7.5, camera: 3.0, storage: 6.5, repairability: 6.5 },
 value:  { warrantyYears: 2, lifespanYears: 5, repairabilityLabel: "Moderate — two RAM slots, standard parts" },
 strengths:  ["RTX 3050 dedicated GPU", "MIL-STD-810H durability testing", "144Hz display"],
 weaknesses:  ["2.3 kg carry weight", "Loud fans under load", "Short battery life (~5 hr)"],
 goodFor:  ["Game development coursework", "Engineering and CUDA labs", "Students who want one machine for work and play"],
 notIdeal:  ["Frequent commuters without outlets", "Quiet library use"],
 cx:  { perf: 85, display: 75, battery: 50, portability: 45, durab: 85, repair: 65, camera: 30, storage: 65 },
 battery:  5.0, durab:  4.3, repair:  3.3, pop:  66,
 uses:  { programming: 3, design: 3, classes: 2, research: 2, gaming: 3, video: 3 },
 reviews:  [
  { id: "r-tuf1", user: "Dennis L.", rating: 5, date: "2026-06-25", context: "Game dev · 7 months",
    text: "Unity and Blender run smooth. It survived a fall down the stairs in my bag — the TUF branding is earned." },
  { id: "r-tuf2", user: "Jomar T.", rating: 4, date: "2026-02-14", context: "Engineering + gaming · 1 year",
    text: "Fast for everything but you will hear the fans. Bring the charger everywhere; battery is the price of the power." }
 ],
 issues:  [
  { id: "i-tuf1", title: "Charging barrel connector runs hot with third-party bricks", reportedBy: "Community report", date: "2026-05-19", status: "pending", severity: "minor" }
 ]
},
{
 id:  "samsung-galaxy-a15",
 brand:  "Samsung",
 model:  "Galaxy A15",
 category:  "smartphones",
 price:  10990,
 rating:  4.3,
 reviewCount:  204,
 releaseYear:  2024,
 status:  "published",
 tagline:  "The safe budget Samsung",
 summary:  "A Super AMOLED screen and 4 years of updates at a price allowances can reach. Charging is slow and gaming is basic.",
 image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Samsung_Galaxy_A54_5G_in_Chongqing_20240220-124540.jpg/960px-Samsung_Galaxy_A54_5G_in_Chongqing_20240220-124540.jpg",
 specs:  {
  Display:  "6.5\" Super AMOLED, 90Hz",
  Processor:  "Helio G99",
  Memory:  "8GB · 128GB + microSD",
  Battery:  "5,000 mAh · 25W",
  Camera:  "50MP main + 5MP ultrawide + 2MP macro"
 },
 specList:  ["6.5\" Super AMOLED 90Hz", "Helio G99", "8GB · 128GB", "5,000 mAh · 25W", "50MP triple camera"],
 scored:  { performance: 5.0, battery: 7.5, durability: 6.5, portability: 8.0, display: 7.5, camera: 5.5, storage: 6.0, repairability: 6.0 },
 value:  { warrantyYears: 1, lifespanYears: 4, repairabilityLabel: "Moderate — Samsung service network" },
 strengths:  ["Super AMOLED 90Hz display", "4 OS upgrades + 5 years security updates", "microSD expansion"],
 weaknesses:  ["25W charging, ~80 min to full", "Helio G99, mid-tier performance", "No IP rating"],
 goodFor:  ["Long-term phone on a budget", "Media watching between classes", "Students in the Samsung ecosystem"],
 notIdeal:  ["Mobile gaming", "Fast top-ups between classes"],
 cx:  { perf: 50, display: 75, battery: 75, portability: 80, durab: 65, repair: 60, camera: 55, storage: 60 },
 battery:  7.5, durab:  3.3, repair:  3.0, pop:  78,
 uses:  { programming: 1, design: 1, classes: 3, research: 3, gaming: 1, video: 2, photography: 2 },
 reviews:  [
  { id: "r-a15a", user: "Karl D.", rating: 5, date: "2026-07-02", context: "Daily driver · 6 months",
    text: "The AMOLED screen makes everything look premium. Updates keep coming, which matters when you keep a phone for years." },
  { id: "r-a15b", user: "Mika S.", rating: 4, date: "2026-04-11", context: "Student use · 5 months",
    text: "Camera is fine in daylight, weak at night. Battery survives my whole class day." }
 ],
 issues:  [
  { id: "i-a15a", title: "Fingerprint reader occasionally rejects registered fingers", reportedBy: "Community report", date: "2026-06-22", status: "investigating", severity: "minor" }
 ]
},
{
 id:  "poco-x6-pro",
 brand:  "POCO",
 model:  "X6 Pro",
 category:  "smartphones",
 price:  17990,
 rating:  4.5,
 reviewCount:  167,
 releaseYear:  2024,
 status:  "published",
 tagline:  "Mid-range performance per peso",
 summary:  "A Dimensity 8300-Ultra that games properly, with 67W charging that tops up between classes. Software has ads.",
 image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Poco_X3_Pro.jpg/960px-Poco_X3_Pro.jpg",
 specs:  {
  Display:  "6.67\" AMOLED, 120Hz",
  Processor:  "Dimensity 8300-Ultra",
  Memory:  "12GB · 512GB",
  Battery:  "5,500 mAh · 67W",
  Camera:  "64MP OIS main + 8MP ultrawide"
 },
 specList:  ["6.67\" AMOLED 120Hz", "Dimensity 8300-Ultra", "12GB · 512GB", "5,500 mAh · 67W", "64MP OIS camera"],
 scored:  { performance: 8.0, battery: 8.0, durability: 6.0, portability: 7.5, display: 8.0, camera: 6.5, storage: 8.5, repairability: 5.5 },
 value:  { warrantyYears: 1, lifespanYears: 3.5, repairabilityLabel: "Moderate — parts via service centers" },
 strengths:  ["Dimensity 8300-Ultra chipset", "67W fast charging", "512GB storage standard"],
 weaknesses:  ["Preinstalled third-party apps", "No IP rating", "Weak low-light camera"],
 goodFor:  ["Mobile gaming between classes", "Heavy multitaskers", "Students who hoard media offline"],
 notIdeal:  ["Ad-free purists", "Photography-first students"],
 cx:  { perf: 80, display: 80, battery: 80, portability: 75, durab: 60, repair: 55, camera: 65, storage: 85 },
 battery:  9.0, durab:  3.0, repair:  2.8, pop:  72,
 uses:  { programming: 2, design: 2, classes: 3, research: 2, gaming: 3, video: 2, photography: 2 },
 reviews:  [
  { id: "r-poc1", user: "Enzo H.", rating: 5, date: "2026-06-30", context: "Gaming + school · 5 months",
    text: "Genshin at high settings without breaking a sweat. Charges while I shower and it's full." },
  { id: "r-poc2", user: "Shai G.", rating: 4, date: "2026-03-19", context: "General use · 7 months",
    text: "Fast, but the preinstalled apps and ads annoy me. Took an hour to debloat." }
 ],
 issues:  [
  { id: "i-poc1", title: "Rear panel lifts slightly near the charging port on early batches", reportedBy: "Community report", date: "2026-05-27", status: "investigating", severity: "moderate" }
 ]
},
{
 id:  "realme-c67",
 brand:  "Realme",
 model:  "C67",
 category:  "smartphones",
 price:  9499,
 rating:  4.1,
 reviewCount:  231,
 releaseYear:  2024,
 status:  "published",
 tagline:  "Allowance-friendly with fast charging",
 summary:  "A large 90Hz screen, 33W charging, and a clean design at the lowest price here. Performance is entry-level.",
 image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Realme_Q2_Pro_Color_Back.jpg/960px-Realme_Q2_Pro_Color_Back.jpg",
 specs:  {
  Display:  "6.72\" IPS LCD, 90Hz",
  Processor:  "Snapdragon 685",
  Memory:  "8GB · 128GB + microSD",
  Battery:  "5,000 mAh · 33W",
  Camera:  "108MP main + 2MP depth"
 },
 specList:  ["6.72\" IPS LCD 90Hz", "Snapdragon 685", "8GB · 128GB", "5,000 mAh · 33W", "108MP main camera"],
 scored:  { performance: 4.0, battery: 7.5, durability: 6.0, portability: 7.5, display: 6.0, camera: 5.0, storage: 5.5, repairability: 6.5 },
 value:  { warrantyYears: 1, lifespanYears: 3, repairabilityLabel: "Easy — cheap parts, common brand" },
 strengths:  ["33W fast charging", "6.72-inch 90Hz display", "108MP main camera"],
 weaknesses:  ["Snapdragon 685, entry-level", "Low outdoor display brightness", "Preinstalled third-party apps"],
 goodFor:  ["Tightest budgets", "First smartphone", "Backup phone for fieldwork"],
 notIdeal:  ["Gaming", "Sunlight-heavy commutes"],
 cx:  { perf: 40, display: 60, battery: 75, portability: 75, durab: 60, repair: 65, camera: 50, storage: 55 },
 battery:  7.5, durab:  3.0, repair:  3.3, pop:  70,
 uses:  { programming: 1, design: 1, classes: 3, research: 2, gaming: 1, video: 1, photography: 2 },
 reviews:  [
  { id: "r-c67a", user: "Tin A.", rating: 4, date: "2026-05-14", context: "First phone · 9 months",
    text: "Charges during one lunch break. Handles GCash, Docs, and YouTube fine — just don't expect gaming." },
  { id: "r-c67b", user: "Rey F.", rating: 4, date: "2026-02-08", context: "Daily use · 1 year",
    text: "Screen is big and nice. Camera megapixels are marketing; daylight shots are okay, night shots are mush." }
 ],
 issues:  [
  { id: "i-c67a", title: "Charging port loosens after ~8 months of daily cable swaps", reportedBy: "Community report", date: "2026-04-30", status: "confirmed", severity: "moderate" }
 ]
},
{
 id:  "samsung-galaxy-tab-a9-plus",
 brand:  "Samsung",
 model:  "Galaxy Tab A9+",
 category:  "tablets",
 price:  13499,
 rating:  4.2,
 reviewCount:  143,
 releaseYear:  2024,
 status:  "published",
 tagline:  "The family-tablet workhorse",
 summary:  "An 11-inch 90Hz screen and quad speakers for lectures and streaming. Stylus support is absent at this price.",
 image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/%EC%82%BC%EC%84%B1_%EA%B0%A4%EB%9F%AD%EC%8B%9C_%ED%83%AD_A9_%ED%94%8C%EB%9F%AC%EC%8A%A4.jpg/960px-%EC%82%BC%EC%84%B1_%EA%B0%A4%EB%9F%AD%EC%8B%9C_%ED%83%AD_A9_%ED%94%8C%EB%9F%AC%EC%8A%A4.jpg",
 specs:  {
  Display:  "11\" 90Hz LCD",
  Processor:  "Snapdragon 695",
  Memory:  "8GB · 128GB + microSD",
  Battery:  "7,040 mAh · 15W",
  Audio:  "Quad speakers"
 },
 specList:  ["11\" 90Hz LCD", "Snapdragon 695", "8GB · 128GB", "7,040 mAh · 15W", "Quad speakers"],
 scored:  { performance: 5.5, battery: 7.5, durability: 6.0, portability: 7.0, display: 7.0, camera: 3.5, storage: 6.0, repairability: 5.5 },
 value:  { warrantyYears: 1, lifespanYears: 4, repairabilityLabel: "Moderate — Samsung service network" },
 strengths:  ["11-inch 90Hz display", "Quad speakers", "Samsung multi-device pairing"],
 weaknesses:  ["No stylus support", "15W charging", "Basic cameras"],
 goodFor:  ["Lecture playback and PDF reading", "Split-screen note review", "Shared household use"],
 notIdeal:  ["Handwritten note-taking", "Photography"],
 cx:  { perf: 55, display: 70, battery: 75, portability: 70, durab: 60, repair: 55, camera: 35, storage: 60 },
 battery:  7.5, durab:  3.0, repair:  2.8, pop:  64,
 uses:  { programming: 1, design: 1, classes: 3, research: 3, gaming: 2, video: 3 },
 reviews:  [
  { id: "r-a9p1", user: "Iya V.", rating: 4, date: "2026-06-09", context: "Lectures + PDFs · 8 months",
    text: "Watch recorded lectures on this daily. Speakers are shockingly good. Wish it supported a stylus though." },
  { id: "r-a9p2", user: "Trina U.", rating: 4, date: "2026-03-27", context: "Reading + media · 1 year",
    text: "Split-screen PDF + notes works well. Charging overnight only — 15W takes forever." }
 ],
 issues:  [
  { id: "i-a9p1", title: "Wireless casting drops on 5GHz networks with some routers", reportedBy: "Community report", date: "2026-05-23", status: "investigating", severity: "minor" }
 ]
},
{
 id:  "sony-wi-xb400",
 brand:  "Sony",
 model:  "WI-XB400",
 category:  "headphones",
 price:  2499,
 rating:  4.3,
 reviewCount:  156,
 releaseYear:  2022,
 status:  "published",
 tagline:  "Extra-bass neckband for commutes",
 summary:  "A wireless neckband with punchy bass, magnetic buds, and 15-hour battery. No ANC; mic is average.",
 image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/2023_S%C5%82uchawki_Sony_WI-XB400_%281%29.jpg/960px-2023_S%C5%82uchawki_Sony_WI-XB400_%281%29.jpg",
 specs:  {
  Type:  "Neckband, wireless",
  Sound:  "Extra Bass tuning",
  Battery:  "~15 hr",
  Charging:  "USB-C",
  Extras:  "Magnetic buds, tangle-free cable"
 },
 specList:  ["Neckband wireless", "Extra Bass", "~15 hr battery", "USB-C", "Magnetic buds"],
 scored:  { performance: 5.5, battery: 6.5, durability: 6.5, portability: 8.5, display: 0, camera: 0, storage: 0, repairability: 5.0 },
 value:  { warrantyYears: 1, lifespanYears: 2.5, repairabilityLabel: "Moderate — battery is sealed" },
 strengths:  ["EXTRA BASS sound", "Magnetic neckband buds", "15-hour battery"],
 weaknesses:  ["No active noise cancelling", "Average call mic quality", "Neckband form factor"],
 goodFor:  ["Jeepney and LRT commutes", "Casual listening between classes", "Students who lose true-wireless buds"],
 notIdeal:  ["Online recitations (mic)", "Quiet library shared audio"],
 cx:  { perf: 55, display: 0, battery: 65, portability: 85, durab: 65, repair: 50, camera: 0, storage: 0 },
 battery:  6.5, durab:  3.3, repair:  2.5, pop:  61,
 uses:  { programming: 0, design: 1, classes: 2, research: 2, gaming: 1, video: 1 },
 reviews:  [
  { id: "r-sny1", user: "Luigi B.", rating: 4, date: "2026-05-08", context: "Commute · 1 year",
    text: "The bass drowns out jeepney engines perfectly. Magnetic buds mean I haven't lost it once." },
  { id: "r-sny2", user: "Aira S.", rating: 4, date: "2026-01-22", context: "Casual listening · 8 months",
    text: "Battery is as advertised. Mic is usable but my groupmates ask me to repeat things." }
 ],
 issues:  [
  { id: "i-sny1", title: "Neckband coating peels after a year of sweat exposure", reportedBy: "Community report", date: "2026-04-17", status: "confirmed", severity: "minor" }
 ]
},
{
 id:  "huawei-band-8",
 brand:  "Huawei",
 model:  "Band 8",
 category:  "smartwatches",
 price:  2190,
 rating:  4.4,
 reviewCount:  129,
 releaseYear:  2023,
 status:  "published",
 tagline:  "Two weeks of battery, one week of forgetting it",
 summary:  "A slim tracker with a bright AMOLED, sleep tracking, and two-week battery. Notifications only — no replies.",
 image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Huawei_Smartwatch_%28Band_4%29.jpg/960px-Huawei_Smartwatch_%28Band_4%29.jpg",
 specs:  {
  Display:  "1.47\" AMOLED",
  Battery:  "Up to 14 days",
  Sensors:  "Heart rate, SpO2, sleep",
  Water:  "5 ATM",
  Weight:  "14 g"
 },
 specList:  ["1.47\" AMOLED", "Up to 14-day battery", "HR + SpO2 + sleep", "5 ATM", "14 g"],
 scored:  { performance: 4.0, battery: 9.5, durability: 7.0, portability: 9.5, display: 7.0, camera: 0, storage: 0, repairability: 4.0 },
 value:  { warrantyYears: 1, lifespanYears: 3, repairabilityLabel: "Hard — sealed unit, band is replaceable" },
 strengths:  ["Two-week battery", "Slim, sleep-friendly body", "Bright AMOLED display"],
 weaknesses:  ["No message replies from watch", "No onboard GPS", "Requires Huawei Health app setup"],
 goodFor:  ["Sleep and habit tracking", "Silent vibrating alarms", "7:30am class survival"],
 notIdeal:  ["Serious run training", "Replying from the wrist"],
 cx:  { perf: 40, display: 70, battery: 95, portability: 95, durab: 70, repair: 40, camera: 0, storage: 0 },
 battery:  9.5, durab:  3.5, repair:  2.0, pop:  59,
 uses:  { programming: 0, design: 0, classes: 2, research: 1, gaming: 0, video: 0 },
 reviews:  [
  { id: "r-hb1", user: "Hazel V.", rating: 5, date: "2026-06-15", context: "Daily tracker · 1 year",
    text: "Charge it every two weeks, sleep tracking matches how tired I actually feel. Silent alarms got me through 7:30ams." },
  { id: "r-hb2", user: "Ogie W.", rating: 4, date: "2026-02-19", context: "Fitness · 10 months",
    text: "Great tracker, but runs need my phone for GPS. Fine — I carry it anyway." }
 ],
 issues:  [
  { id: "i-hb1", title: "Band pin loosens over months — carry a spare strap", reportedBy: "Community report", date: "2026-05-05", status: "confirmed", severity: "minor" }
 ]
},
{
 id:  "redmi-watch-4",
 brand:  "Redmi",
 model:  "Watch 4",
 category:  "smartwatches",
 price:  2799,
 rating:  4.2,
 reviewCount:  98,
 releaseYear:  2024,
 status:  "published",
 tagline:  "The big-screen budget smartwatch",
 summary:  "A 1.97\" AMOLED square face with Bluetooth calling and 20-day battery. GPS locks to your phone, not itself.",
 image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Redmi_K60_and_Redmi_Watch_3.jpg/960px-Redmi_K60_and_Redmi_Watch_3.jpg",
 specs:  {
  Display:  "1.97\" AMOLED",
  Battery:  "Up to 20 days",
  Calls:  "Bluetooth calling",
  Sensors:  "HR, SpO2, 150+ sport modes",
  Water:  "5 ATM"
 },
 specList:  ["1.97\" AMOLED", "Up to 20-day battery", "Bluetooth calling", "HR + SpO2", "5 ATM"],
 scored:  { performance: 4.5, battery: 9.0, durability: 6.5, portability: 9.0, display: 7.5, camera: 0, storage: 0, repairability: 4.0 },
 value:  { warrantyYears: 1, lifespanYears: 3, repairabilityLabel: "Hard — sealed unit" },
 strengths:  ["1.75-inch AMOLED display", "Bluetooth calling", "Up to 20-day battery"],
 weaknesses:  ["No onboard GPS", "Requires Xiaomi Wear app", "Thin call speaker"],
 goodFor:  ["Students who want calls on the wrist", "Notification triage during class", "Battery-forgetters"],
 notIdeal:  ["Phone-free runs", "Tiny-wrist fits (it's big)"],
 cx:  { perf: 45, display: 75, battery: 90, portability: 90, durab: 65, repair: 40, camera: 0, storage: 0 },
 battery:  9.0, durab:  3.3, repair:  2.0, pop:  57,
 uses:  { programming: 0, design: 0, classes: 3, research: 1, gaming: 0, video: 0 },
 reviews:  [
  { id: "r-rw1", user: "Kaye L.", rating: 4, date: "2026-05-29", context: "Daily wear · 6 months",
    text: "Answering calls on my wrist during library shifts is genuinely useful. Battery is closer to 2 weeks with always-on display off." },
  { id: "r-rw2", user: "Doms L.", rating: 4, date: "2026-01-17", context: "Fitness + alerts · 9 months",
    text: "Looks more expensive than it is. App pairing took two tries, then it just worked." }
 ],
 issues:  [
  { id: "i-rw1", title: "Always-on display drains battery ~3x faster than claimed", reportedBy: "Community report", date: "2026-06-11", status: "confirmed", severity: "minor" }
 ]
},
{
 id:  "xiaomi-powerbank-10000",
 brand:  "Xiaomi",
 model:  "Power Bank 10000",
 category:  "powerbanks",
 price:  899,
 rating:  4.5,
 reviewCount:  287,
 releaseYear:  2023,
 status:  "published",
 tagline:  "The pocketable daily charger",
 summary:  "Slim 10,000 mAh with 22.5W output and two ports. Charges a phone twice; too small for laptop top-ups.",
 image:  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/MiPowerBankPro10000mAhQC30Xiaomi20240820001.jpg/960px-MiPowerBankPro10000mAhQC30Xiaomi20240820001.jpg",
 specs:  {
  Capacity:  "10,000 mAh",
  Output:  "22.5W max",
  Ports:  "USB-C + USB-A",
  Recharge:  "~4.5 hr",
  Weight:  "200 g"
 },
 specList:  ["10,000 mAh", "22.5W max output", "USB-C + USB-A", "~4.5 hr recharge", "200 g"],
 scored:  { performance: 6.5, battery: 7.0, durability: 7.5, portability: 8.5, display: 0, camera: 0, storage: 0, repairability: 4.5 },
 value:  { warrantyYears: 1, lifespanYears: 3, repairabilityLabel: "Hard — sealed unit, common brand" },
 strengths:  ["Slim pocketable body", "Dual USB output", "10,000 mAh at an entry price"],
 weaknesses:  ["Low-output port, not laptop-rated", "No passthrough charging", "Cable not included"],
 goodFor:  ["Daily carry phone top-ups", "Group-work charging duty", "Backup for brownouts"],
 notIdeal:  ["Laptop users between outlets", "Multi-day fieldwork without outlets"],
 cx:  { perf: 65, display: 0, battery: 70, portability: 85, durab: 75, repair: 45, camera: 0, storage: 0 },
 battery:  8.5, durab:  3.8, repair:  2.3, pop:  74,
 uses:  { programming: 1, design: 1, classes: 3, research: 2, gaming: 1, video: 2 },
 reviews:  [
  { id: "r-xpb1", user: "Iya V.", rating: 5, date: "2026-06-02", context: "Daily carry · 1 year",
    text: "Lives in my bag. Charges my phone about two times from empty. Slim enough that I forget it's there." },
  { id: "r-xpb2", user: "Paolo D.", rating: 4, date: "2026-03-08", context: "Daily carry · 8 months",
    text: "Great for phones, useless for my laptop. Wish it could charge itself and a phone at the same time." }
 ],
 issues:  [
  { id: "i-xpb1", title: "Capacity indicator LEDs stick on after ~a year", reportedBy: "Community report", date: "2026-04-25", status: "investigating", severity: "minor" }
 ]
}
);

GW.gadgets = GW.realGadgetEntries;

/* ---------- Registered users (admin view) ---------- */
GW.users = [
  { id: "u1", name: "Andrea Villanueva", email: "andrea.villanueva@student.edu.ph", registered: "2025-06-12", status: "active",   reviews: 6, role: "student" },
  { id: "u2", name: "Jomar Tolentino",   email: "jomar.t@student.edu.ph",         registered: "2025-07-03", status: "active",   reviews: 4, role: "student" },
  { id: "u3", name: "Bea Mercado",       email: "bea.mercado@student.edu.ph",     registered: "2025-08-19", status: "active",   reviews: 3, role: "student" },
  { id: "u4", name: "Ramon Alcantara",   email: "ramon.alc@student.edu.ph",       registered: "2025-09-08", status: "active",   reviews: 2, role: "student" },
  { id: "u5", name: "Hazel Ventura",     email: "hazel.ventura@student.edu.ph",   registered: "2025-10-21", status: "inactive", reviews: 1, role: "student" },
  { id: "u6", name: "Miguel Cruz",       email: "miguel.cruz@student.edu.ph",     registered: "2025-11-30", status: "active",   reviews: 5, role: "student" },
  { id: "u7", name: "Rina Prado",        email: "rina.prado@student.edu.ph",      registered: "2026-01-17", status: "active",   reviews: 2, role: "student" },
  { id: "u8", name: "Dennis Lim",        email: "dennis.lim@student.edu.ph",      registered: "2026-02-05", status: "suspended",reviews: 0, role: "student" }
];

/* ---------- Pending review queue (admin moderation) ---------- */
GW.pendingReviews = [
  { id: "pr1", gadget: "samsung-galaxy-s23",       user: "Miguel Cruz",    rating: 5, date: "2026-09-01", status: "pending", text: "Third month with this as my main org-camera phone. Shutter lag is gone compared to my old phone, and editing straight on device is fast. Only complaint is smudges — clean it hourly or it looks greasy in photos of the phone itself." },
  { id: "pr2", gadget: "anker-powercore-20100", user: "Rina Prado",  rating: 4, date: "2026-09-03", status: "pending", text: "Bought this for thesis fieldwork in the province. Two full days of drone controller + phone charging. Gauge stayed accurate. Minus one star because the rubber shell collects lint like crazy." },
  { id: "pr3", gadget: "apple-macbook-air-m1",   user: "Bea Mercado",    rating: 4, date: "2026-09-05", status: "pending", text: "One sem in. Still on one charge per day, still doesn't get hot on my lap during 3-hour lectures. Windows updates once interrupted a recording, but that's Windows, not the laptop." },
  { id: "pr4", gadget: "jbl-synchros-e50bt",     user: "Dennis Lim",     rating: 2, date: "2026-09-06", status: "pending", text: "ANC stopped working on the right side after 5 months. Service center says 3 weeks turnaround. Sound without ANC is fine, but I paid for the ANC." },
  { id: "pr5", gadget: "acer-aspire-5-a515", user: "Ramon Alcantara",rating: 5, date: "2026-09-08", status: "pending", text: "Upgraded the RAM as suggested here in the reviews and now it runs our accounting software + 20 tabs fine. This site's repairability score is what sold me. One year in, zero problems." },
  { id: "pr6", gadget: "amazfit-bip",   user: "Hazel Ventura",  rating: 4, date: "2026-09-09", status: "pending", text: "Battery claim is real — 13 days on my usage. Sleep tracking matches how I actually feel. Wish it could reply to messages, but at this price I'm satisfied." },
  { id: "pr7", gadget: "apple-ipad-9", user: "Andrea Villanueva", rating: 5, date: "2026-09-10", status: "pending", text: "Bought after the recommendation tool scored it 91 for graphic design. It was right. Drawing for 4+ hours, no lag, no heat. Save up for the official keyboard though — third-party ones feel mushy." }
];

/* ---------- Admin dashboard metrics (mock) ---------- */
GW.adminMetrics = {
  totalUsers: 2438,
  totalGadgets: GW.gadgets.length,
  totalReviews: GW.gadgets.reduce((n, g) => n + g.reviews.length, 0) + GW.pendingReviews.length,
  pendingReviews: GW.pendingReviews.length,
  pageViewsThisMonth: 48213,
  // most viewed (page views per gadget, this month) — real catalog ids
  views: [
    { id: "apple-macbook-air-m1", views: 4820 }, { id: "samsung-galaxy-s23", views: 4310 },
    { id: "acer-aspire-5-a515", views: 3960 }, { id: "asus-vivobook-15", views: 3544 },
    { id: "apple-ipad-9", views: 3102 }, { id: "xiaomi-pad-7", views: 2478 },
    { id: "redmi-note-11", views: 2211 }, { id: "anker-powercore-20100", views: 1980 }
  ],
  comparisons: [
    { id: "apple-macbook-air-m1", count: 1840 }, { id: "acer-aspire-5-a515", count: 1615 },
    { id: "xiaomi-pad-7", count: 1204 }, { id: "asus-vivobook-15", count: 1178 },
    { id: "samsung-galaxy-s23", count: 1102 }, { id: "redmi-note-11", count: 864 }
  ],
  recommended: [
    { id: "acer-aspire-5-a515", count: 942 }, { id: "apple-macbook-air-m1", count: 901 },
    { id: "redmi-note-11", count: 776 }, { id: "apple-ipad-9", count: 523 },
    { id: "anker-powercore-20100", count: 468 }, { id: "samsung-galaxy-s23", count: 401 }
  ],
  categoryShare: { smartphones: 34, laptops: 31, tablets: 13, headphones: 10, powerbanks: 7, smartwatches: 5 },
  viewsTrend: [
    { week: "Jul 20", value: 8100 }, { week: "Jul 27", value: 9400 }, { week: "Aug 3", value: 10250 },
    { week: "Aug 10", value: 9800 }, { week: "Aug 17", value: 11600 }, { week: "Aug 24", value: 12800 },
    { week: "Aug 31", value: 12100 }, { week: "Sep 7", value: 13950 }
  ]
};

/* ---------- Recommendation engine inputs ---------- */
GW.budgetBands = [
  { id: "under-10k", label: "Under ₱10,000",       min: 0,     max: 10000 },
  { id: "10-20k",    label: "₱10,000 – ₱20,000",   min: 10000, max: 20000 },
  { id: "20-40k",    label: "₱20,000 – ₱40,000",   min: 20000, max: 40000 },
  { id: "40-60k",    label: "₱40,000 – ₱60,000",   min: 40000, max: 60000 },
  { id: "60k-plus",  label: "₱60,000 and above",   min: 60000, max: Infinity }
];

GW.useCases = [
  { id: "general",       label: "General Student Use", categories: ["smartphones", "laptops", "tablets"],
    note: "Browsing, documents, video calls, and media.",
    criteria: { performance: 3, battery: 3, portability: 2, display: 2, storage: 1, camera: 1 } },
  { id: "programming",   label: "Programming", categories: ["laptops"],
    note: "IDEs, compilers, virtual machines, long compile cycles.",
    criteria: { performance: 5, storage: 3, display: 3, battery: 2, portability: 2 } },
  { id: "online-classes",label: "Online Classes", categories: ["smartphones", "tablets", "laptops"],
    note: "Video calls, lecture playback, note-taking from home.",
    criteria: { battery: 4, display: 3, performance: 2, camera: 2, storage: 2, portability: 1 } },
  { id: "office",        label: "Office / Productivity", categories: ["laptops", "tablets"],
    note: "Documents, spreadsheets, presentations, email.",
    criteria: { performance: 3, battery: 4, portability: 3, display: 2, storage: 2 } },
  { id: "graphic-design",label: "Graphic Design", categories: ["laptops", "tablets"],
    note: "Illustration, layout, color-accurate work, pen input.",
    criteria: { display: 5, performance: 4, storage: 3, portability: 2, battery: 1 } },
  { id: "video-editing", label: "Video Editing", categories: ["laptops", "smartphones"],
    note: "Timeline editing, rendering, color grading, large files.",
    criteria: { performance: 5, storage: 4, display: 3, battery: 1, portability: 1 } }
];

GW.priorityFactors = [
  { id: "performance",   label: "Performance",    base: 15, hint: "Processor, RAM, sustained speed" },
  { id: "battery",       label: "Battery Life",   base: 10, hint: "Hours per charge or unplugged" },
  { id: "portability",   label: "Portability",    base: 0,  hint: "Weight and size for commuting" },
  { id: "display",       label: "Display",        base: 0,  hint: "Panel quality, brightness, size" },
  { id: "camera",        label: "Camera",         base: 0,  hint: "Photo and video capture" },
  { id: "storage",       label: "Storage",        base: 0,  hint: "Space for files, apps, projects" },
  { id: "value",         label: "Long-term Value",base: 10, hint: "Lower monthly cost for the same lifespan" },
  { id: "budget",        label: "Budget discipline", base: 0, hint: "How strictly to stay under your ceiling" }
];

/* ---------- Community trust stats (home page) ---------- */
GW.community = {
  gadgetsTracked: GW.gadgets.length,
  reviewsWritten: GW.gadgets.reduce((n, g) => n + g.reviewCount, 0),
  issuesReported: 132,
  avgRating: (GW.gadgets.reduce((n, g) => n + g.rating, 0) / GW.gadgets.length).toFixed(1)
};

GW.currentUser = {
  name: "Andrea Villanueva",
  program: "BS Information Technology · 3rd Year",
  school: "State university, Quezon City",
  memberSince: "June 2025",
  avatarInitials: "AV"
};

/* Seeded history for the prototype account (mock) — real catalog ids */
GW.seedCompareHistory = [
  { id: "ch1", date: "2026-08-14", items: ["acer-aspire-5-a515", "apple-macbook-air-m1"] },
  { id: "ch2", date: "2026-08-29", items: ["samsung-galaxy-s23", "redmi-note-11", "apple-ipad-9"] }
];
GW.seedRecommendationHistory = [
  { id: "rh1", date: "2026-09-10", budget: 45000, use: "graphic-design",
    top: { id: "apple-ipad-9", score: 91 } }
];

/* ---------- Lookups ---------- */
GW.getGadget = function (id) { return GW.gadgets.find(g => g.id === id) || null; };
GW.getCategory = function (id) { return GW.categories.find(c => c.id === id) || null; };
GW.gadgetsInCategory = function (catId) { return GW.gadgets.filter(g => g.category === catId); };
GW.gadgetsByIds = function (ids) { return ids.map(GW.getGadget).filter(Boolean); };

/* Cost per month — the ONE formula:
   price / (lifespan years × 12). Displayed everywhere as an estimate. */
/* Cost per month (spec 18): price spread over a 36-month usage window —
   a fixed, documented assumption for ALL gadgets (comparable within
   category), not a per-product lifespan invention. */
GW.MONTHS_WINDOW = 36;
GW.monthlyCost = function (g) {
  return g.price / GW.MONTHS_WINDOW;
};
GW.categoryMedianMonthly = function (catId) {
  const list = GW.gadgetsInCategory(catId).map(GW.monthlyCost).sort((a, b) => a - b);
  if (!list.length) return 0;
  const mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
};

export default GW;
