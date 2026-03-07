// ============================================================
// Schyrim Core Types — Factions
// ============================================================

export interface FactionState {
    reputations: Record<string, number>; // faction ID → reputation (-100 to +100)
    ranks: Record<string, string>;        // faction ID → current rank ID
}

export interface FactionDefinition {
    id: string;
    name: string;
    description: string;
    ranks: FactionRank[];
    hostileBelow: number;       // reputation below this = hostile
    alliedAbove: number;        // reputation above this = allied
    defaultReputation: number;  // starting reputation
    allies?: string[];          // faction IDs
    enemies?: string[];         // faction IDs
}

export interface FactionRank {
    id: string;
    name: string;
    reputationThreshold: number;
    benefits?: string[];        // descriptions of rank benefits
    vendorAccess?: string[];    // vendor IDs unlocked at this rank
    questAccess?: string[];     // quest IDs unlocked at this rank
}
