/** F0-06 — MechanicMatcher. Regelbasert i F3-02; Quick/manuell i Spor A. */
export interface MatchRequest {
  tenantId: string;
  serviceId: string;
  /** Ferdigheter tjenesten krever. */
  requiredSkills: string[];
  /** Ønsket tidsvindu. */
  from: Date;
  to: Date;
  vehicleId?: string;
}

export interface MatchCandidate {
  mechanicId: string;
  /** 0–1. Høyere = bedre treff. */
  score: number;
  reasons: string[];
}

export interface MechanicMatcher {
  readonly name: string;
  match(request: MatchRequest): Promise<MatchCandidate[]>;
}
