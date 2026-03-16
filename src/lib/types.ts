export interface Politician {
  fec_id: string;
  name: string;
  party: string | null;
  state: string | null;
  district: string | null;
  office: string | null;
  incumbent: number;
  total_received: number;
  cycle: number;
}

export interface Entity {
  id: number;
  name: string;
  canonical_name: string;
  type: string | null;
  fec_committee_id: string | null;
  total_contributions: number;
  total_lobbying: number;
  total_contracts: number;
  total_influence: number;
  employee_count: number | null;
  headquarters_state: string | null;
}

export interface Contribution {
  entity_id: number;
  politician_fec_id: string;
  amount: number;
  cycle: number;
}

export interface Lobbying {
  entity_id: number;
  year: number;
  total_amount: number;
  filing_count: number;
  lobbyist_count: number;
}

export interface LobbyingIssue {
  entity_id: number;
  issue_code: string;
  issue_name: string;
  filing_count: number;
}

export interface Contract {
  entity_id: number;
  agency: string;
  total_value: number;
  contract_count: number;
  fiscal_year: number;
}

export interface Issue {
  code: string;
  name: string;
  total_spending: number;
  entity_count: number;
}

export interface StateData {
  abbr: string;
  name: string;
  politician_count: number;
  total_contributions_received: number;
  total_lobbying_spent: number;
  total_contracts_awarded: number;
  top_recipient_politician: string | null;
  top_contributor_entity: string | null;
}

export interface RankingEntry {
  category: string;
  rank: number;
  entity_type: string | null;
  entity_id: string | null;
  name: string | null;
  value: number | null;
  detail: string | null;
}

export interface NationalStat {
  key: string;
  value: string;
}
