export const LEAGUE_LOGOS: Record<string, string> = {
  "premier-league": "/logos/leagues/premier-league.png",
  "la-liga": "/logos/leagues/la-liga.png",
  "serie-a": "/logos/leagues/serie-a.png",
  "bundesliga": "/logos/leagues/bundesliga.png",
  "ligue-1": "/logos/leagues/ligue-1.png",
  "champions-league": "/logos/leagues/champions-league.png",
  "national-teams": "/logos/leagues/national-teams.png",
};

/**
 * The 8 top-level "buckets" the site is built around. Used by the navbar,
 * the homepage tile grid, and the products-page filter sidebar so they all
 * stay in sync. `slug` is the URL-safe id, `href` is the destination link.
 *
 *   - Six football leagues live under /league/:slug
 *   - "Morocco" is a single team — its destination is /team/morocco
 *   - "Retro" is a category filter on the catalogue
 */
export const MAIN_NAV_BUCKETS = [
  { slug: "premier-league",    name: "Premier League",   short: "Premier",    href: "/league/premier-league",   logo: "/logos/leagues/premier-league.png",   tone: "purple"  },
  { slug: "la-liga",           name: "La Liga",          short: "La Liga",    href: "/league/la-liga",          logo: "/logos/leagues/la-liga.png",          tone: "red"     },
  { slug: "serie-a",           name: "Serie A",          short: "Serie A",    href: "/league/serie-a",          logo: "/logos/leagues/serie-a.png",          tone: "blue"    },
  { slug: "bundesliga",        name: "Bundesliga",       short: "Bundesliga", href: "/league/bundesliga",       logo: "/logos/leagues/bundesliga.png",       tone: "rose"    },
  { slug: "ligue-1",           name: "Ligue 1",          short: "Ligue 1",    href: "/league/ligue-1",          logo: "/logos/leagues/ligue-1.png",          tone: "navy"    },
  { slug: "champions-league",  name: "Champions League", short: "Champions",  href: "/league/champions-league", logo: "/logos/leagues/champions-league.png", tone: "gold"    },
  { slug: "morocco",           name: "Morocco",          short: "Morocco",    href: "/team/morocco",            logo: "/logos/national-teams/morocco.png",   tone: "green"   },
  { slug: "retro",             name: "Retro",            short: "Retro",      href: "/products?category=retro", logo: null,                                  tone: "vintage" },
] as const;

export type NavBucket = (typeof MAIN_NAV_BUCKETS)[number];

// NBA team crests — saved locally from ESPN's CDN (see scripts/download-nba-logos.mjs)
export const NBA_TEAM_LOGOS: Record<string, string> = {
  "atlanta-hawks": "/logos/nba/atlanta-hawks.png",
  "boston-celtics": "/logos/nba/boston-celtics.png",
  "brooklyn-nets": "/logos/nba/brooklyn-nets.png",
  "chicago-bulls": "/logos/nba/chicago-bulls.png",
  "cleveland-cavaliers": "/logos/nba/cleveland-cavaliers.png",
  "dallas-mavericks": "/logos/nba/dallas-mavericks.png",
  "denver-nuggets": "/logos/nba/denver-nuggets.png",
  "golden-state-warriors": "/logos/nba/golden-state-warriors.png",
  "houston-rockets": "/logos/nba/houston-rockets.png",
  "los-angeles-clippers": "/logos/nba/los-angeles-clippers.png",
  "los-angeles-lakers": "/logos/nba/los-angeles-lakers.png",
  "memphis-grizzlies": "/logos/nba/memphis-grizzlies.png",
  "miami-heat": "/logos/nba/miami-heat.png",
  "milwaukee-bucks": "/logos/nba/milwaukee-bucks.png",
  "new-york-knicks": "/logos/nba/new-york-knicks.png",
  "oklahoma-city-thunder": "/logos/nba/oklahoma-city-thunder.png",
  "philadelphia-76ers": "/logos/nba/philadelphia-76ers.png",
  "phoenix-suns": "/logos/nba/phoenix-suns.png",
  "san-antonio-spurs": "/logos/nba/san-antonio-spurs.png",
  "toronto-raptors": "/logos/nba/toronto-raptors.png",
  "charlotte-hornets": "/logos/nba/charlotte-hornets.png",
  "detroit-pistons": "/logos/nba/detroit-pistons.png",
  "indiana-pacers": "/logos/nba/indiana-pacers.png",
  "minnesota-timberwolves": "/logos/nba/minnesota-timberwolves.png",
  "new-orleans-pelicans": "/logos/nba/new-orleans-pelicans.png",
  "orlando-magic": "/logos/nba/orlando-magic.png",
  "portland-trail-blazers": "/logos/nba/portland-trail-blazers.png",
  "sacramento-kings": "/logos/nba/sacramento-kings.png",
  "utah-jazz": "/logos/nba/utah-jazz.png",
  "washington-wizards": "/logos/nba/washington-wizards.png",
};

export const NATIONAL_TEAM_CRESTS: Record<string, string> = {
  "morocco": "/logos/national-teams/morocco.png",
  "argentina": "/logos/national-teams/argentina.png",
  "brazil": "/logos/national-teams/brazil.png",
  "france": "/logos/national-teams/france.png",
  "germany": "/logos/national-teams/germany.png",
  "spain": "/logos/national-teams/spain.png",
  "england": "/logos/national-teams/england.png",
  "portugal": "/logos/national-teams/portugal.png",
  "italy": "/logos/national-teams/italy.png",
  "netherlands": "/logos/national-teams/netherlands.png",
  "belgium": "/logos/national-teams/belgium.png",
  "japan": "/logos/national-teams/japan.png",
  "croatia": "/logos/national-teams/croatia.png",
  "uruguay": "/logos/national-teams/uruguay.png",
  "colombia": "/logos/national-teams/colombia.png",
  "mexico": "/logos/national-teams/mexico.png",
  "usa": "/logos/national-teams/usa.png",
  "senegal": "/logos/national-teams/senegal.png",
  "nigeria": "/logos/national-teams/nigeria.png",
  "egypt": "/logos/national-teams/egypt.png",
  "algeria": "/logos/national-teams/algeria.png",
  "turkey": "/logos/national-teams/turkey.png",
  "denmark": "/logos/national-teams/denmark.png",
  "poland": "/logos/national-teams/poland.png",
  "cameroon": "/logos/national-teams/cameroon.png",
  "south-korea": "/logos/national-teams/south-korea.png",
  "saudi-arabia": "/logos/national-teams/saudi-arabia.png",
  "canada": "/logos/national-teams/canada.png",
  "australia": "/logos/national-teams/australia.png",
  "ghana": "/logos/national-teams/ghana.png",
  "switzerland": "/logos/national-teams/switzerland.png",
  "scotland": "/logos/national-teams/scotland.png",
  "wales": "/logos/national-teams/wales.png",
  "tunisia": "/logos/national-teams/tunisia.png",
  "ecuador": "/logos/national-teams/ecuador.png",
  "serbia": "/logos/national-teams/serbia.png",
};

export const COUNTRY_FLAGS: { name: string; slug: string; code: string }[] = [
  { name: "Morocco", slug: "morocco", code: "ma" },
  { name: "Argentina", slug: "argentina", code: "ar" },
  { name: "Brazil", slug: "brazil", code: "br" },
  { name: "France", slug: "france", code: "fr" },
  { name: "Germany", slug: "germany", code: "de" },
  { name: "Spain", slug: "spain", code: "es" },
  { name: "England", slug: "england", code: "gb-eng" },
  { name: "Portugal", slug: "portugal", code: "pt" },
  { name: "Italy", slug: "italy", code: "it" },
  { name: "Netherlands", slug: "netherlands", code: "nl" },
  { name: "Belgium", slug: "belgium", code: "be" },
  { name: "Japan", slug: "japan", code: "jp" },
  { name: "Croatia", slug: "croatia", code: "hr" },
  { name: "Uruguay", slug: "uruguay", code: "uy" },
  { name: "Colombia", slug: "colombia", code: "co" },
  { name: "Mexico", slug: "mexico", code: "mx" },
  { name: "USA", slug: "usa", code: "us" },
  { name: "Senegal", slug: "senegal", code: "sn" },
  { name: "Nigeria", slug: "nigeria", code: "ng" },
  { name: "Egypt", slug: "egypt", code: "eg" },
  { name: "Algeria", slug: "algeria", code: "dz" },
  { name: "Turkey", slug: "turkey", code: "tr" },
  { name: "Denmark", slug: "denmark", code: "dk" },
  { name: "Poland", slug: "poland", code: "pl" },
  { name: "Cameroon", slug: "cameroon", code: "cm" },
  { name: "South Korea", slug: "south-korea", code: "kr" },
  { name: "Saudi Arabia", slug: "saudi-arabia", code: "sa" },
  { name: "Canada", slug: "canada", code: "ca" },
  { name: "Australia", slug: "australia", code: "au" },
  { name: "Ghana", slug: "ghana", code: "gh" },
  { name: "Serbia", slug: "serbia", code: "rs" },
  { name: "Switzerland", slug: "switzerland", code: "ch" },
  { name: "Scotland", slug: "scotland", code: "gb-sct" },
  { name: "Wales", slug: "wales", code: "gb-wls" },
  { name: "Tunisia", slug: "tunisia", code: "tn" },
  { name: "Ecuador", slug: "ecuador", code: "ec" },
];

export const CLUB_LOGOS: Record<string, string> = {
  // Premier League
  "manchester-united": "https://crests.football-data.org/66.png",
  "manchester-city":   "https://crests.football-data.org/65.png",
  "arsenal":           "https://crests.football-data.org/57.png",
  "chelsea":           "https://crests.football-data.org/61.png",
  "liverpool":         "https://crests.football-data.org/64.png",
  "tottenham-hotspur": "https://crests.football-data.org/73.png",
  "newcastle-united":  "https://crests.football-data.org/67.png",
  "aston-villa":       "https://crests.football-data.org/58.png",
  "west-ham-united":   "https://crests.football-data.org/563.png",
  "brighton-hove-albion": "https://crests.football-data.org/397.png",
  "wolverhampton-wanderers": "https://crests.football-data.org/76.png",
  "crystal-palace":    "https://crests.football-data.org/354.png",
  "brentford":         "https://crests.football-data.org/402.png",
  "nottingham-forest": "https://crests.football-data.org/351.png",
  "fulham":            "https://crests.football-data.org/63.png",
  "everton":           "https://crests.football-data.org/62.png",
  "tottenham":         "https://crests.football-data.org/73.png",
  "wolverhampton":     "https://crests.football-data.org/76.png",
  "west-ham":          "https://crests.football-data.org/563.png",
  "brighton":          "https://crests.football-data.org/397.png",
  "leeds-united":      "https://crests.football-data.org/341.png",
  "leicester-city":    "https://crests.football-data.org/338.png",
  "burnley":           "https://crests.football-data.org/328.png",
  "bournemouth":       "https://crests.football-data.org/1044.png",
  // La Liga
  "barcelona":         "https://crests.football-data.org/81.png",
  "real-madrid":       "https://crests.football-data.org/86.png",
  "atletico-madrid":   "https://crests.football-data.org/78.png",
  "sevilla":           "https://crests.football-data.org/559.png",
  "real-betis":        "https://crests.football-data.org/90.png",
  "real-sociedad":     "https://crests.football-data.org/92.png",
  "villarreal":        "https://crests.football-data.org/94.png",
  "athletic-bilbao":   "https://crests.football-data.org/77.png",
  "valencia":          "https://crests.football-data.org/95.png",
  "osasuna":           "https://crests.football-data.org/87.png",
  "fc-barcelona":     "https://crests.football-data.org/81.png",
  "celta-vigo":       "https://crests.football-data.org/558.png",
  "espanyol":         "https://crests.football-data.org/80.png",
  "girona":           "https://crests.football-data.org/298.png",
  "deportivo-alaves": "https://crests.football-data.org/263.png",
  "granada":          "https://crests.football-data.org/83.png",
  "rayo-vallecano":   "https://crests.football-data.org/87.png",
  // Serie A
  "juventus":          "https://crests.football-data.org/109.png",
  "inter-milan":       "https://crests.football-data.org/108.png",
  "ac-milan":          "https://crests.football-data.org/98.png",
  "napoli":            "https://crests.football-data.org/113.png",
  "roma":              "https://crests.football-data.org/100.png",
  "lazio":             "https://crests.football-data.org/110.png",
  "atalanta":          "https://crests.football-data.org/102.png",
  "fiorentina":        "https://crests.football-data.org/99.png",
  "torino":            "https://crests.football-data.org/586.png",
  "as-roma":          "https://crests.football-data.org/100.png",
  "bologna":          "https://crests.football-data.org/103.png",
  "cagliari":         "https://crests.football-data.org/104.png",
  "genoa":            "https://crests.football-data.org/107.png",
  "parma":            "https://crests.football-data.org/112.png",
  "venezia":          "https://crests.football-data.org/454.png",
  // Bundesliga
  "bayern-munich":     "https://crests.football-data.org/5.png",
  "borussia-dortmund": "https://crests.football-data.org/4.png",
  "rb-leipzig":        "https://crests.football-data.org/721.png",
  "bayer-leverkusen":  "https://crests.football-data.org/3.png",
  "borussia-monchengladbach": "https://crests.football-data.org/15.png",
  "eintracht-frankfurt": "https://crests.football-data.org/19.png",
  "werder-bremen":     "https://crests.football-data.org/12.png",
  "sc-freiburg":       "https://crests.football-data.org/17.png",
  "freiburg":         "https://crests.football-data.org/17.png",
  "schalke-04":       "https://crests.football-data.org/6.png",
  "stuttgart":        "https://crests.football-data.org/10.png",
  "union-berlin":     "https://crests.football-data.org/28.png",
  "wolfsburg":        "https://crests.football-data.org/11.png",
  // Ligue 1
  "paris-saint-germain": "https://crests.football-data.org/524.png",
  "psg":               "https://crests.football-data.org/524.png",
  "olympique-lyon":    "https://crests.football-data.org/523.png",
  "olympique-marseille": "https://crests.football-data.org/516.png",
  "as-monaco":         "https://crests.football-data.org/548.png",
  "lille":             "https://crests.football-data.org/521.png",
  "nice":              "https://crests.football-data.org/522.png",
  "rennes":            "https://crests.football-data.org/529.png",
  "lyon":             "https://crests.football-data.org/523.png",
  "lens":             "https://crests.football-data.org/546.png",
  "brest":            "https://crests.football-data.org/512.png",
  "toulouse":         "https://crests.football-data.org/511.png",
  "strasbourg":       "https://crests.football-data.org/530.png",
  // Liga Portuguesa
  "benfica":           "https://crests.football-data.org/496.png",
  "porto":             "https://crests.football-data.org/503.png",
  "sporting-cp":       "https://crests.football-data.org/498.png",
  // Eredivisie
  "ajax":              "https://crests.football-data.org/674.png",
  "psv-eindhoven":     "https://crests.football-data.org/678.png",
  "feyenoord":         "https://crests.football-data.org/675.png",
  // Saudi Pro League
  "al-hilal":          "https://crests.football-data.org/1920.png",
  "al-nassr":          "https://crests.football-data.org/1919.png",
  // F1 Teams (verified Wikipedia thumbnails)
  "red-bull-racing":   "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Red_Bull_Racing_-_2021_Logo.svg/250px-Red_Bull_Racing_-_2021_Logo.svg.png",
  "ferrari":           "https://upload.wikimedia.org/wikipedia/en/thumb/d/df/Scuderia_Ferrari_HP_logo_24.svg/250px-Scuderia_Ferrari_HP_logo_24.svg.png",
  "mercedes-amg-f1":   "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Mercedes_AMG_Petronas_F1_Logo.svg/250px-Mercedes_AMG_Petronas_F1_Logo.svg.png",
  "mclaren-f1":        "https://upload.wikimedia.org/wikipedia/en/thumb/e/e5/McLaren_F1_logo.svg/250px-McLaren_F1_logo.svg.png",
  "alpine-f1":         "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Alpine_F1_Team_Logo.svg/250px-Alpine_F1_Team_Logo.svg.png",
  "aston-martin-f1":   "https://upload.wikimedia.org/wikipedia/en/thumb/1/15/Aston_Martin_Aramco_2024_logo.png/250px-Aston_Martin_Aramco_2024_logo.png",
  "williams-f1":       "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Atlassian_Williams_F1_Team_logo.svg/250px-Atlassian_Williams_F1_Team_logo.svg.png",
  "rb-f1":             "https://upload.wikimedia.org/wikipedia/en/thumb/2/2b/VCARB_F1_logo.svg/250px-VCARB_F1_logo.svg.png",
  "kick-sauber":       "https://upload.wikimedia.org/wikipedia/commons/9/94/Logo_sauber_2023.jpg",
  "haas-f1":           "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/TGR_Haas_F1_Team_Logo_%282026%29.svg/250px-TGR_Haas_F1_Team_Logo_%282026%29.svg.png",
};

export const BRAND_LOGOS = [
  { name: "Nike", logo: "/logos/brands/nike.svg" },
  { name: "Adidas", logo: "/logos/brands/adidas.svg" },
  { name: "Puma", logo: "/logos/brands/puma.svg" },
  { name: "New Balance", logo: "/logos/brands/new-balance.svg" },
  { name: "Umbro", logo: "/logos/brands/umbro.svg" },
  { name: "Kappa", logo: "/logos/brands/kappa.svg" },
  { name: "Joma", logo: "/logos/brands/joma.svg" },
  { name: "Hummel", logo: "/logos/brands/hummel.svg" },
  { name: "Le Coq Sportif", logo: "/logos/brands/le-coq-sportif.svg" },
];

/**
 * The seven leagues we host in the database after the Nov-2026 refactor.
 * "National Teams" is a tiny league that only carries Morocco — used as the
 * parent for the Morocco team so /team/morocco can resolve via Prisma.
 *
 * The team lists below are seed defaults: the database refactor script uses
 * them to (re-)create the team rows for each league, and the admin-panel
 * "+ Team" button can add more on the fly.
 */
export const LEAGUES_DATA = [
  {
    name: "Premier League",
    slug: "premier-league",
    teams: [
      "Manchester United", "Manchester City", "Arsenal", "Chelsea", "Liverpool",
      "Newcastle United", "Tottenham", "Aston Villa", "Brighton", "Everton",
      "West Ham", "Fulham", "Bournemouth", "Crystal Palace", "Nottingham Forest",
      "Brentford", "Wolverhampton", "Leicester City", "Leeds United", "Burnley",
    ],
  },
  {
    name: "La Liga",
    slug: "la-liga",
    teams: [
      "Real Madrid", "FC Barcelona", "Atletico Madrid", "Real Betis", "Valencia",
      "Villarreal", "Real Sociedad", "Sevilla", "Celta Vigo", "Girona",
      "Espanyol", "Osasuna", "Rayo Vallecano", "Deportivo Alaves", "Granada",
    ],
  },
  {
    name: "Serie A",
    slug: "serie-a",
    teams: [
      "Inter Milan", "AC Milan", "Napoli", "Juventus", "AS Roma",
      "Lazio", "Fiorentina", "Atalanta", "Bologna", "Torino",
      "Venezia", "Como", "Parma", "Genoa", "Cagliari",
    ],
  },
  {
    name: "Bundesliga",
    slug: "bundesliga",
    teams: [
      "Bayern Munich", "Borussia Dortmund", "Bayer Leverkusen", "RB Leipzig",
      "Eintracht Frankfurt", "Wolfsburg", "Stuttgart", "Borussia Monchengladbach",
      "Freiburg", "Union Berlin", "Schalke 04", "Werder Bremen",
    ],
  },
  {
    name: "Ligue 1",
    slug: "ligue-1",
    teams: [
      "Paris Saint-Germain", "Olympique Marseille", "Lyon", "Lille", "Lens",
      "AS Monaco", "Nice", "Rennes", "Strasbourg", "Toulouse", "Brest",
    ],
  },
  {
    name: "Champions League",
    slug: "champions-league",
    teams: [
      "Real Madrid", "Manchester City", "Bayern Munich", "Paris Saint-Germain",
      "Arsenal", "FC Barcelona", "Atletico Madrid", "AC Milan", "Inter Milan",
      "Juventus", "Borussia Dortmund", "Bayer Leverkusen", "Liverpool",
      "Chelsea", "Porto", "Benfica", "Ajax", "Napoli",
    ],
  },
  {
    name: "National Teams",
    slug: "national-teams",
    teams: ["Morocco"],
  },
];

/**
 * Clubs that feature on the Champions League page.
 * These teams each live in their domestic league (La Liga, Premier League, etc.),
 * so the Champions League page renders them as a virtual view over those clubs.
 */
export const CHAMPIONS_LEAGUE_CLUBS: string[] = [
  "real-madrid", "fc-barcelona", "atletico-madrid",
  "manchester-city", "arsenal", "liverpool", "chelsea",
  "bayern-munich", "borussia-dortmund", "bayer-leverkusen",
  "paris-saint-germain",
  "ac-milan", "inter-milan", "juventus", "napoli",
  "benfica", "porto", "ajax",
];

export const CATEGORIES = [
  { name: "Jerseys", slug: "jersey" },
  { name: "Track Suits", slug: "tracksuit" },
  { name: "Retro Shirts", slug: "retro" },
  { name: "Training", slug: "training" },
  { name: "Shorts", slug: "shorts" },
  { name: "Kids Kit", slug: "kids" },
];

export const SIZES = ["S", "M", "L", "XL", "XXL", "XXXL"];
