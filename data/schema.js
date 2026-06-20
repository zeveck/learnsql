// Anime SQL Academy — database schema, seed data, and derived metadata.
//
// This module is the single source of truth for the in-browser SQLite database.
// SCHEMA_SQL builds the tables; SEED_SQL fills them with canon-verified rows.
// SCHEMA and RELATIONSHIPS are hand-maintained mirrors of the DDL (a test in
// tests/db.test.mjs enforces that they stay consistent with PRAGMA output).
//
// FK policy: foreign keys are left OFF (SQLite default) for a forgiving sandbox,
// so seed insert order is irrelevant. voice_actors is still declared before
// characters for a clean forward reference.
//
// SEED_SQL is a backtick template literal so the SQLite single-quote escaping
// ('') stays literal in the emitted SQL string.

/** Full DDL: creates every table. */
export const SCHEMA_SQL = `
CREATE TABLE studios (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, country TEXT, founded_year INTEGER
);
CREATE TABLE voice_actors (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'Japanese'
);
CREATE TABLE anime (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, studio_id INTEGER,
  release_year INTEGER NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'TV' CHECK (media_type IN ('TV','Film')),
  episode_count INTEGER,
  FOREIGN KEY (studio_id) REFERENCES studios(id)
);
CREATE TABLE episodes (
  id INTEGER PRIMARY KEY, anime_id INTEGER NOT NULL, episode_number INTEGER NOT NULL,
  title TEXT, air_date TEXT,
  UNIQUE (anime_id, episode_number),
  FOREIGN KEY (anime_id) REFERENCES anime(id)
);
CREATE TABLE characters (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, anime_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('hero','villain','anti-hero','supporting')),
  is_human INTEGER NOT NULL DEFAULT 1 CHECK (is_human IN (0,1)),
  rival_id INTEGER, mentor_id INTEGER, voice_actor_id INTEGER,
  FOREIGN KEY (anime_id) REFERENCES anime(id),
  FOREIGN KEY (rival_id) REFERENCES characters(id),
  FOREIGN KEY (mentor_id) REFERENCES characters(id),
  FOREIGN KEY (voice_actor_id) REFERENCES voice_actors(id)
);
CREATE TABLE factions (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, anime_id INTEGER,
  is_criminal INTEGER NOT NULL DEFAULT 0 CHECK (is_criminal IN (0,1)),
  FOREIGN KEY (anime_id) REFERENCES anime(id)
);
CREATE TABLE character_factions (
  character_id INTEGER NOT NULL, faction_id INTEGER NOT NULL, rank TEXT,
  PRIMARY KEY (character_id, faction_id),
  FOREIGN KEY (character_id) REFERENCES characters(id),
  FOREIGN KEY (faction_id) REFERENCES factions(id)
);
CREATE TABLE items (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  item_type TEXT CHECK (item_type IN ('weapon','vehicle','gadget','artifact')),
  description TEXT
);
CREATE TABLE character_items (
  character_id INTEGER NOT NULL, item_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1, notes TEXT,
  PRIMARY KEY (character_id, item_id),
  FOREIGN KEY (character_id) REFERENCES characters(id),
  FOREIGN KEY (item_id) REFERENCES items(id)
);
CREATE TABLE tropes (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT
);
CREATE TABLE character_tropes (
  character_id INTEGER NOT NULL, trope_id INTEGER NOT NULL,
  PRIMARY KEY (character_id, trope_id),
  FOREIGN KEY (character_id) REFERENCES characters(id),
  FOREIGN KEY (trope_id) REFERENCES tropes(id)
);
CREATE TABLE genres (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE
);
CREATE TABLE anime_genres (
  anime_id INTEGER NOT NULL, genre_id INTEGER NOT NULL,
  PRIMARY KEY (anime_id, genre_id),
  FOREIGN KEY (anime_id) REFERENCES anime(id),
  FOREIGN KEY (genre_id) REFERENCES genres(id)
);
CREATE TABLE voice_actor_roles (
  voice_actor_id INTEGER NOT NULL, character_id INTEGER NOT NULL,
  dub TEXT NOT NULL DEFAULT 'Japanese',
  PRIMARY KEY (voice_actor_id, character_id, dub),
  FOREIGN KEY (voice_actor_id) REFERENCES voice_actors(id),
  FOREIGN KEY (character_id) REFERENCES characters(id)
);
`;

/** Full seed: canon-verified INSERTs. The '' sequences are SQLite quote-escapes. */
export const SEED_SQL = `
INSERT INTO studios (id,name,country,founded_year) VALUES
 (1,'Madhouse','Japan',1972),(2,'Sunrise','Japan',1972),(3,'Tokyo Movie Shinsha','Japan',1964),
 (4,'Gainax','Japan',1984),(5,'Studio Gallop','Japan',1978),(6,'Toei Animation','Japan',1948),
 (7,'Bones','Japan',1998),(8,'Wit Studio','Japan',2012);

INSERT INTO voice_actors (id,name,language) VALUES
 (1,'Masaya Onosaka','Japanese'),(2,'Show Hayami','Japanese'),(3,'Koichi Yamadera','Japanese'),
 (4,'Megumi Hayashibara','Japanese'),(5,'Unsho Ishizuka','Japanese'),(6,'Norio Wakamoto','Japanese'),
 (7,'Megumi Ogata','Japanese'),(8,'Yuko Miyamura','Japanese'),(9,'Fumihiko Tachiki','Japanese'),
 (10,'Masako Nozawa','Japanese'),(11,'Ryo Horikawa','Japanese'),(12,'Toshio Furukawa','Japanese'),
 (13,'Mami Koyama','Japanese'),(14,'Megumi Toyoguchi','Japanese'),(15,'Mitsuaki Madono','Japanese'),
 (16,'Mayo Suzukaze','Japanese'),(17,'Steve Blum','English'),(18,'Mitsuo Iwata','Japanese');

INSERT INTO anime (id,title,studio_id,release_year,media_type,episode_count) VALUES
 (1,'Trigun',1,1998,'TV',26),(2,'Cowboy Bebop',2,1998,'TV',26),(3,'Akira',3,1988,'Film',1),
 (4,'Neon Genesis Evangelion',4,1995,'TV',26),(5,'Black Lagoon',1,2006,'TV',24),
 (6,'Rurouni Kenshin',5,1996,'TV',95),(7,'Dragon Ball Z',6,1989,'TV',291),
 (8,'Fullmetal Alchemist: Brotherhood',7,2009,'TV',64),(9,'Attack on Titan',8,2013,'TV',25),
 (10,'Cowboy Bebop: The Movie',NULL,2001,'Film',1);

INSERT INTO genres (id,name) VALUES
 (1,'Action'),(2,'Sci-Fi'),(3,'Space Western'),(4,'Mecha'),(5,'Psychological'),(6,'Crime'),
 (7,'Historical'),(8,'Martial Arts'),(9,'Cyberpunk'),(10,'Fantasy'),(11,'Neo-noir'),
 (12,'Drama'),(13,'Adventure'),(14,'Post-apocalyptic');

INSERT INTO anime_genres (anime_id,genre_id) VALUES
 (1,1),(1,3),(1,2),(2,1),(2,3),(2,11),(3,9),(3,2),(3,5),(4,4),(4,5),(4,2),(5,1),(5,6),(5,12),
 (6,1),(6,7),(6,8),(7,1),(7,8),(7,13),(8,1),(8,10),(8,13),(9,1),(9,12),(9,14);

INSERT INTO characters (id,name,anime_id,role,is_human,rival_id,mentor_id,voice_actor_id) VALUES
 (1,'Vash the Stampede',1,'hero',0,2,NULL,1),(2,'Millions Knives',1,'villain',0,1,NULL,2),
 (3,'Nicholas D. Wolfwood',1,'anti-hero',1,NULL,NULL,NULL),(4,'Meryl Stryfe',1,'supporting',1,NULL,NULL,NULL),
 (5,'Milly Thompson',1,'supporting',1,NULL,NULL,NULL),(6,'Legato Bluesummers',1,'villain',1,NULL,NULL,NULL),
 (7,'Spike Spiegel',2,'hero',1,8,9,3),(8,'Vicious',2,'villain',1,7,NULL,6),
 (9,'Jet Black',2,'supporting',1,NULL,NULL,5),(10,'Faye Valentine',2,'anti-hero',1,NULL,NULL,4),
 (11,'Edward',2,'supporting',1,NULL,NULL,NULL),(12,'Ein',2,'supporting',0,NULL,NULL,NULL),
 (13,'Julia',2,'supporting',1,NULL,NULL,NULL),
 (14,'Shotaro Kaneda',3,'hero',1,15,NULL,18),(15,'Tetsuo Shima',3,'villain',1,14,NULL,NULL),
 (16,'Kei',3,'supporting',1,NULL,NULL,13),(17,'Colonel Shikishima',3,'supporting',1,NULL,NULL,NULL),
 (18,'Akira',3,'supporting',1,NULL,NULL,NULL),
 (19,'Shinji Ikari',4,'hero',1,21,NULL,7),(20,'Rei Ayanami',4,'supporting',1,NULL,NULL,4),
 (21,'Asuka Langley Soryu',4,'supporting',1,19,NULL,8),(22,'Gendo Ikari',4,'villain',1,NULL,NULL,9),
 (23,'Misato Katsuragi',4,'supporting',1,NULL,NULL,NULL),(24,'Kaworu Nagisa',4,'anti-hero',1,NULL,NULL,NULL),
 (25,'Ryoji Kaji',4,'supporting',1,NULL,NULL,NULL),
 (26,'Revy',5,'anti-hero',1,NULL,NULL,14),(27,'Rock',5,'hero',1,NULL,NULL,15),
 (28,'Dutch',5,'supporting',1,NULL,NULL,NULL),(29,'Benny',5,'supporting',1,NULL,NULL,NULL),
 (30,'Balalaika',5,'villain',1,NULL,NULL,13),(31,'Roberta',5,'anti-hero',1,NULL,NULL,NULL),
 (32,'Hiko Seijuro XIII',6,'supporting',1,NULL,NULL,NULL),(33,'Himura Kenshin',6,'hero',1,35,32,16),
 (34,'Kamiya Kaoru',6,'supporting',1,NULL,NULL,NULL),(35,'Makoto Shishio',6,'villain',1,33,NULL,NULL),
 (36,'Sagara Sanosuke',6,'supporting',1,NULL,NULL,NULL),(37,'Myojin Yahiko',6,'supporting',1,NULL,33,NULL),
 (38,'Saito Hajime',6,'anti-hero',1,33,NULL,NULL),
 (39,'Master Roshi',7,'supporting',1,NULL,NULL,NULL),(40,'Son Goku',7,'hero',0,41,39,10),
 (41,'Vegeta',7,'anti-hero',0,40,NULL,11),(42,'Piccolo',7,'anti-hero',0,NULL,NULL,12),
 (43,'Son Gohan',7,'hero',0,NULL,42,10),(44,'Frieza',7,'villain',0,NULL,NULL,NULL),
 (45,'Cell',7,'villain',0,NULL,NULL,6),(46,'Krillin',7,'supporting',1,NULL,39,NULL),
 (47,'Bulma',7,'supporting',1,NULL,NULL,NULL),
 (48,'Edward Elric',8,'hero',1,NULL,NULL,NULL),(49,'Alphonse Elric',8,'hero',1,NULL,NULL,NULL),
 (50,'Roy Mustang',8,'supporting',1,NULL,NULL,NULL),(51,'Father',8,'villain',0,NULL,NULL,NULL),
 (52,'Eren Yeager',9,'hero',1,NULL,NULL,NULL),(53,'Mikasa Ackerman',9,'supporting',1,NULL,NULL,NULL),
 (54,'Levi Ackerman',9,'supporting',1,NULL,NULL,NULL),(55,'Reiner Braun',9,'villain',1,NULL,NULL,NULL);

INSERT INTO factions (id,name,anime_id,is_criminal) VALUES
 (1,'Gung-Ho Guns',1,1),(2,'Eye of Michael',1,1),(3,'Bernardelli Insurance Society',1,0),
 (4,'Red Dragon Syndicate',2,1),(5,'The Capsules',3,0),(6,'NERV',4,0),(7,'SEELE',4,1),
 (8,'Lagoon Company',5,0),(9,'Hotel Moscow',5,1),(10,'Juppongatana',6,1),
 (11,'Shinsengumi (Meiji Police)',6,0),(12,'Z Fighters',7,0),(13,'Frieza Force',7,1),
 (14,'Bounty Hunters Guild',NULL,0);

INSERT INTO character_factions (character_id,faction_id,rank) VALUES
 (2,1,'Leader'),(6,1,'Lieutenant'),(3,2,'Member'),(3,1,'Infiltrator'),(4,3,'Investigator'),
 (5,3,'Investigator'),(7,4,'Former Member'),(8,4,'Boss'),(14,5,'Leader'),(15,5,'Member'),
 (19,6,'Pilot'),(20,6,'Pilot'),(21,6,'Pilot'),(22,6,'Commander'),(23,6,'Director of Operations'),
 (22,7,'Agent'),(25,6,'Inspector'),(25,7,'Spy'),(26,8,'Member'),(27,8,'Member'),(28,8,'Leader'),
 (29,8,'Member'),(30,9,'Leader'),(35,10,'Leader'),(38,11,'Officer'),(40,12,'Member'),
 (41,12,'Member'),(42,12,'Member'),(43,12,'Member'),(46,12,'Member'),(44,13,'Emperor');

INSERT INTO items (id,name,item_type,description) VALUES
 (1,'AGL Federal .45 Long Colt','weapon','Vash''s silver revolver'),
 (2,'The Punisher','weapon','Wolfwood''s cross-shaped weapon'),(3,'Derringer','weapon','Concealed pistol'),
 (4,'Jericho 941','weapon','Spike''s 9mm pistol'),(5,'Swordfish II','vehicle','Spike''s mono-racer ship'),
 (6,'Bebop','vehicle','The crew''s spaceship'),(7,'Glock 30','weapon','Faye''s pistol'),
 (8,'Red Motorcycle','vehicle','Kaneda''s iconic bike'),(9,'Katana','weapon','Single-edged sword'),
 (10,'Sakabato','weapon','Kenshin''s reverse-blade sword'),(11,'Mugenjin','weapon','Shishio''s katana'),
 (12,'Zanbato','weapon','Sanosuke''s giant sword'),
 (13,'Beretta 92FS "Sword Cutlass"','weapon','Revy''s twin pistols'),
 (14,'Power Pole (Nyoibo)','weapon','Goku''s extending staff'),
 (15,'Flying Nimbus (Kinto-un)','vehicle','Goku''s flying cloud'),
 (16,'Dragon Radar','gadget','Bulma''s Dragon Ball locator'),
 (17,'Dragon Balls','artifact','Seven wish-granting orbs'),(18,'Scouter','gadget','Power-level reader');

INSERT INTO character_items (character_id,item_id,quantity,notes) VALUES
 (1,1,1,'Custom Plant-tech revolver'),(3,2,1,'Conceals machine gun and rockets'),
 (4,3,50,'Hidden in her cloak'),(7,4,1,NULL),(7,5,1,'Mono-racer'),(9,6,1,'Captains the ship'),
 (10,7,1,NULL),(14,8,1,'Most famous bike in anime'),(8,9,1,'Vicious''s blade'),
 (33,10,1,'Vows never to kill'),(35,11,1,NULL),(36,12,1,NULL),(26,13,2,'Dual-wielded'),
 (40,14,1,'Gift from Grandpa Gohan'),(40,15,1,'Only the pure of heart may ride'),(47,16,1,NULL),
 (40,17,7,'Collects all seven'),(44,18,1,NULL);

INSERT INTO tropes (id,name,description) VALUES
 (1,'The Gunslinger','Master of firearms'),(2,'Reluctant Hero','Avoids the call to action'),
 (3,'Tragic Villain','Antagonist with sympathetic backstory'),(4,'The Stoic','Rarely shows emotion'),
 (5,'Cool Big Bro','Older mentor figure'),(6,'Pacifist','Refuses to kill'),
 (7,'The Rival','Defined by competition with the hero'),(8,'Fallen Hero','Once good, now an antagonist'),
 (9,'Genki Girl','Energetic and upbeat'),(10,'The Atoner','Seeks redemption for past sins'),
 (11,'Anti-Villain','Villain with honorable traits'),(12,'Glass Cannon','Powerful but fragile');

INSERT INTO character_tropes (character_id,trope_id) VALUES
 (1,1),(1,2),(1,6),(2,3),(2,8),(3,1),(3,10),(7,1),(7,4),(8,7),(8,8),(9,5),(15,3),(15,7),
 (19,2),(19,4),(22,3),(26,1),(33,6),(33,10),(33,2),(35,3),(35,11),(40,2),(41,7),(41,8),
 (44,3),(5,9),(11,9);

INSERT INTO voice_actor_roles (voice_actor_id,character_id,dub) VALUES
 (1,1,'Japanese'),(3,7,'Japanese'),(17,7,'English'),(4,10,'Japanese'),(4,20,'Japanese'),
 (6,8,'Japanese'),(6,45,'Japanese'),(10,40,'Japanese'),(10,43,'Japanese'),
 (13,16,'Japanese'),(13,30,'Japanese');

INSERT INTO episodes (id,anime_id,episode_number,title,air_date) VALUES
 (1,2,1,'Asteroid Blues','1998-04-03'),(2,2,2,'Stray Dog Strut','1998-04-24'),
 (3,2,3,'Honky Tonk Women','1998-05-01'),(4,1,1,'The $$60,000,000,000 Man','1998-04-01'),
 (5,1,2,'Truth of Mistake','1998-04-08'),(6,4,1,'Angel Attack','1995-10-04'),
 (7,4,2,'The Beast','1995-10-11'),(8,4,3,'A Transfer','1995-10-18'),
 (9,7,1,'The New Threat','1989-04-26'),(10,7,2,'Reunions','1989-05-03'),
 (11,5,1,'The Black Lagoon','2006-04-09'),(12,6,1,'The Handsome Swordsman of Legend','1996-01-10');
`;

/**
 * Column names per table, in DDL declaration order. Used for autocomplete and
 * the schema panel. Kept consistent with SCHEMA_SQL (enforced by a test).
 */
export const SCHEMA = {
  studios: ['id', 'name', 'country', 'founded_year'],
  voice_actors: ['id', 'name', 'language'],
  anime: ['id', 'title', 'studio_id', 'release_year', 'media_type', 'episode_count'],
  episodes: ['id', 'anime_id', 'episode_number', 'title', 'air_date'],
  characters: [
    'id', 'name', 'anime_id', 'role', 'is_human', 'rival_id', 'mentor_id', 'voice_actor_id',
  ],
  factions: ['id', 'name', 'anime_id', 'is_criminal'],
  character_factions: ['character_id', 'faction_id', 'rank'],
  items: ['id', 'name', 'item_type', 'description'],
  character_items: ['character_id', 'item_id', 'quantity', 'notes'],
  tropes: ['id', 'name', 'description'],
  character_tropes: ['character_id', 'trope_id'],
  genres: ['id', 'name'],
  anime_genres: ['anime_id', 'genre_id'],
  voice_actor_roles: ['voice_actor_id', 'character_id', 'dub'],
};

/**
 * Foreign-key descriptors for every FK in the DDL: { fromTable, fromCol,
 * toTable, toCol }. Used by the schema panel and FK highlighting. Kept
 * consistent with SCHEMA_SQL (enforced by a test).
 */
export const RELATIONSHIPS = [
  { fromTable: 'anime', fromCol: 'studio_id', toTable: 'studios', toCol: 'id' },
  { fromTable: 'episodes', fromCol: 'anime_id', toTable: 'anime', toCol: 'id' },
  { fromTable: 'characters', fromCol: 'anime_id', toTable: 'anime', toCol: 'id' },
  { fromTable: 'characters', fromCol: 'rival_id', toTable: 'characters', toCol: 'id' },
  { fromTable: 'characters', fromCol: 'mentor_id', toTable: 'characters', toCol: 'id' },
  { fromTable: 'characters', fromCol: 'voice_actor_id', toTable: 'voice_actors', toCol: 'id' },
  { fromTable: 'factions', fromCol: 'anime_id', toTable: 'anime', toCol: 'id' },
  { fromTable: 'character_factions', fromCol: 'character_id', toTable: 'characters', toCol: 'id' },
  { fromTable: 'character_factions', fromCol: 'faction_id', toTable: 'factions', toCol: 'id' },
  { fromTable: 'character_items', fromCol: 'character_id', toTable: 'characters', toCol: 'id' },
  { fromTable: 'character_items', fromCol: 'item_id', toTable: 'items', toCol: 'id' },
  { fromTable: 'character_tropes', fromCol: 'character_id', toTable: 'characters', toCol: 'id' },
  { fromTable: 'character_tropes', fromCol: 'trope_id', toTable: 'tropes', toCol: 'id' },
  { fromTable: 'anime_genres', fromCol: 'anime_id', toTable: 'anime', toCol: 'id' },
  { fromTable: 'anime_genres', fromCol: 'genre_id', toTable: 'genres', toCol: 'id' },
  { fromTable: 'voice_actor_roles', fromCol: 'voice_actor_id', toTable: 'voice_actors', toCol: 'id' },
  { fromTable: 'voice_actor_roles', fromCol: 'character_id', toTable: 'characters', toCol: 'id' },
];
