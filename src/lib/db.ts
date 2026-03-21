import type { D1Database } from './d1-adapter';
import type {
  Politician,
  Entity,
  Contribution,
  Lobbying,
  LobbyingIssue,
  Contract,
  Issue,
  StateData,
  RankingEntry,
  NationalStat,
} from './types';
import { persistToDisk, loadFromDisk, warmFromDisk } from './disk-cache';

// --- Query-level cache ---
const queryCache = new Map<string, unknown>();

export function getQueryCacheSize(): number {
  return queryCache.size;
}

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = queryCache.get(key);
  if (hit !== undefined) return Promise.resolve(hit as T);
  return fn().then(v => { queryCache.set(key, v); return v; });
}

// --- National Stats (SHARED) ---
export function getStats(db: D1Database): Promise<NationalStat[]> {
  return cached('stats', async () => {
    const r = await db.prepare('SELECT key, value FROM national_stats').all<NationalStat>();
    return r.results;
  });
}

export function getStat(db: D1Database, key: string): Promise<string | null> {
  return cached(`stat:${key}`, async () => {
    const r = await db.prepare('SELECT value FROM national_stats WHERE key = ?1').bind(key).first<{ value: string }>();
    return r?.value ?? null;
  });
}

// --- Politicians (listing = SHARED, per-entity = direct) ---
export function getPoliticianList(db: D1Database, chamber?: string, party?: string, state?: string): Promise<Politician[]> {
  let sql = 'SELECT * FROM politicians WHERE total_received > 0';
  const params: unknown[] = [];
  let paramIdx = 1;

  if (chamber) {
    sql += ` AND office = ?${paramIdx}`;
    params.push(chamber);
    paramIdx++;
  }
  if (party) {
    sql += ` AND party = ?${paramIdx}`;
    params.push(party);
    paramIdx++;
  }
  if (state) {
    sql += ` AND state = ?${paramIdx}`;
    params.push(state);
    paramIdx++;
  }
  sql += ' ORDER BY total_received DESC LIMIT 500';

  const cacheKey = `politicians:${chamber || 'all'}:${party || 'all'}:${state || 'all'}`;
  return cached(cacheKey, async () => {
    const stmt = db.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const r = await bound.all<Politician>();
    return r.results;
  });
}

export async function getPolitician(db: D1Database, fecId: string): Promise<Politician | null> {
  const r = await db.prepare('SELECT * FROM politicians WHERE fec_id = ?1').bind(fecId).first<Politician>();
  return r;
}

export async function getPoliticianDonors(db: D1Database, fecId: string, limit: number = 50): Promise<Array<Entity & { contribution_amount: number }>> {
  const r = await db.prepare(`
    SELECT e.*, c.amount as contribution_amount
    FROM contributions c
    JOIN entities e ON e.id = c.entity_id
    WHERE c.politician_fec_id = ?1
    ORDER BY c.amount DESC
    LIMIT ?2
  `).bind(fecId, limit).all<Entity & { contribution_amount: number }>();
  return r.results;
}

// --- Entities (listing = SHARED, per-entity = direct) ---
export function getEntityList(db: D1Database, type?: string, sortBy: string = 'total_influence'): Promise<Entity[]> {
  const allowedSorts = ['total_influence', 'total_contributions', 'total_lobbying', 'total_contracts', 'name'];
  const col = allowedSorts.includes(sortBy) ? sortBy : 'total_influence';
  const dir = col === 'name' ? 'ASC' : 'DESC';

  let sql = `SELECT * FROM entities WHERE total_influence > 0`;
  const params: unknown[] = [];
  let paramIdx = 1;

  if (type) {
    sql += ` AND type = ?${paramIdx}`;
    params.push(type);
    paramIdx++;
  }
  sql += ` ORDER BY ${col} ${dir} LIMIT 500`;

  const cacheKey = `entities:${type || 'all'}:${col}`;
  return cached(cacheKey, async () => {
    const stmt = db.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const r = await bound.all<Entity>();
    return r.results;
  });
}

export async function getEntity(db: D1Database, id: number): Promise<Entity | null> {
  const r = await db.prepare('SELECT * FROM entities WHERE id = ?1').bind(id).first<Entity>();
  return r;
}

export async function getEntityPoliticians(db: D1Database, entityId: number, limit: number = 50): Promise<Array<Politician & { contribution_amount: number }>> {
  const r = await db.prepare(`
    SELECT p.*, c.amount as contribution_amount
    FROM contributions c
    JOIN politicians p ON p.fec_id = c.politician_fec_id
    WHERE c.entity_id = ?1
    ORDER BY c.amount DESC
    LIMIT ?2
  `).bind(entityId, limit).all<Politician & { contribution_amount: number }>();
  return r.results;
}

export async function getEntityLobbying(db: D1Database, entityId: number): Promise<Lobbying[]> {
  const r = await db.prepare(`
    SELECT * FROM lobbying WHERE entity_id = ?1 ORDER BY year DESC
  `).bind(entityId).all<Lobbying>();
  return r.results;
}

export async function getEntityLobbyingIssues(db: D1Database, entityId: number): Promise<LobbyingIssue[]> {
  const r = await db.prepare(`
    SELECT * FROM lobbying_issues WHERE entity_id = ?1 ORDER BY filing_count DESC
  `).bind(entityId).all<LobbyingIssue>();
  return r.results;
}

export async function getEntityContracts(db: D1Database, entityId: number): Promise<Contract[]> {
  const r = await db.prepare(`
    SELECT * FROM contracts WHERE entity_id = ?1 ORDER BY total_value DESC
  `).bind(entityId).all<Contract>();
  return r.results;
}

// --- Issues (listing = SHARED, per-entity = direct) ---
export function getIssueList(db: D1Database): Promise<Issue[]> {
  return cached('issues:list', async () => {
    const r = await db.prepare('SELECT * FROM issues ORDER BY total_spending DESC').all<Issue>();
    return r.results;
  });
}

export async function getIssue(db: D1Database, code: string): Promise<Issue | null> {
  const r = await db.prepare('SELECT * FROM issues WHERE code = ?1').bind(code).first<Issue>();
  return r;
}

export async function getIssueTopSpenders(db: D1Database, code: string, limit: number = 50): Promise<Array<Entity & { issue_filing_count: number }>> {
  const r = await db.prepare(`
    SELECT e.*, li.filing_count as issue_filing_count
    FROM lobbying_issues li
    JOIN entities e ON e.id = li.entity_id
    WHERE li.issue_code = ?1
    ORDER BY e.total_lobbying DESC
    LIMIT ?2
  `).bind(code, limit).all<Entity & { issue_filing_count: number }>();
  return r.results;
}

// --- States (listing = SHARED, per-entity = direct) ---
export function getStateList(db: D1Database): Promise<StateData[]> {
  return cached('states:list', async () => {
    const r = await db.prepare('SELECT * FROM states ORDER BY name COLLATE NOCASE').all<StateData>();
    return r.results;
  });
}

export async function getState(db: D1Database, abbr: string): Promise<StateData | null> {
  const r = await db.prepare('SELECT * FROM states WHERE abbr = ?1').bind(abbr).first<StateData>();
  return r;
}

export async function getStatePoliticians(db: D1Database, abbr: string): Promise<Politician[]> {
  const r = await db.prepare(`
    SELECT * FROM politicians WHERE state = ?1 AND total_received > 0
    ORDER BY total_received DESC
  `).bind(abbr).all<Politician>();
  return r.results;
}

export async function getStateTopEntities(db: D1Database, abbr: string, limit: number = 20): Promise<Entity[]> {
  const r = await db.prepare(`
    SELECT * FROM entities WHERE headquarters_state = ?1
    ORDER BY total_influence DESC
    LIMIT ?2
  `).bind(abbr, limit).all<Entity>();
  return r.results;
}

// --- Rankings (SHARED) ---
export function getRankings(db: D1Database, category: string): Promise<RankingEntry[]> {
  return cached(`rankings:${category}`, async () => {
    const r = await db.prepare(`
      SELECT * FROM rankings WHERE category = ?1 ORDER BY rank ASC
    `).bind(category).all<RankingEntry>();
    return r.results;
  });
}

export function getRankingCategories(db: D1Database): Promise<string[]> {
  return cached('rankings:categories', async () => {
    const r = await db.prepare('SELECT DISTINCT category FROM rankings ORDER BY category COLLATE NOCASE').all<{ category: string }>();
    return r.results.map(row => row.category);
  });
}

// --- Search (direct — unbounded per-query) ---
export async function searchAll(db: D1Database, query: string): Promise<{ politicians: Politician[]; entities: Entity[] }> {
  const pattern = `%${query}%`;
  const [politicians, entities] = await Promise.all([
    db.prepare(`
      SELECT * FROM politicians WHERE name LIKE ?1
      ORDER BY total_received DESC LIMIT 25
    `).bind(pattern).all<Politician>(),
    db.prepare(`
      SELECT * FROM entities WHERE name LIKE ?1 OR canonical_name LIKE ?1
      ORDER BY total_influence DESC LIMIT 25
    `).bind(pattern).all<Entity>(),
  ]);
  return { politicians: politicians.results, entities: entities.results };
}

// --- Slug helpers for sitemaps (SHARED) ---
export function getAllPoliticianIds(db: D1Database): Promise<Array<{ fec_id: string }>> {
  return cached('slugs:politicians', async () => {
    const r = await db.prepare('SELECT fec_id FROM politicians WHERE total_received > 0 ORDER BY total_received DESC').all<{ fec_id: string }>();
    return r.results;
  });
}

export function getAllEntityIds(db: D1Database): Promise<Array<{ id: number }>> {
  return cached('slugs:entities', async () => {
    const r = await db.prepare('SELECT id FROM entities WHERE total_influence > 0 ORDER BY total_influence DESC').all<{ id: number }>();
    return r.results;
  });
}

export function getAllIssueCodes(db: D1Database): Promise<Array<{ code: string }>> {
  return cached('slugs:issues', async () => {
    const r = await db.prepare('SELECT code FROM issues ORDER BY total_spending DESC').all<{ code: string }>();
    return r.results;
  });
}

export function getAllStateAbbrs(db: D1Database): Promise<Array<{ abbr: string }>> {
  return cached('slugs:states', async () => {
    const r = await db.prepare('SELECT abbr FROM states ORDER BY abbr').all<{ abbr: string }>();
    return r.results;
  });
}

// --- Cache Warming (SHARED functions only) ---
export async function warmQueryCache(env: Record<string, D1Database>, batchSize: number = 10, pauseMs: number = 500): Promise<void> {
  const db = env.DB;
  if (!db) return;

  console.log('[cache] Starting query cache warming...');
  const start = Date.now();

  // Priority 1: Homepage data
  await getStats(db);
  await getIssueList(db);

  // Priority 2: State list + ranking categories
  await getStateList(db);
  const categories = await getRankingCategories(db);
  for (const cat of categories) {
    await getRankings(db, cat);
  }

  // Priority 3: Top politicians and entities
  await getPoliticianList(db);
  await getEntityList(db);

  // Priority 4: Sitemap slugs
  await getAllPoliticianIds(db);
  await getAllEntityIds(db);
  await getAllIssueCodes(db);
  await getAllStateAbbrs(db);

  const elapsed = Date.now() - start;
  console.log(`[cache] Warming complete: ${queryCache.size} entries in ${elapsed}ms`);
}
