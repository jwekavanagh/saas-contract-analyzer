import type { ContractAnalysis } from "../analysis/contractAnalyzer";
import type { Severity } from "../analysis/severityConfig";

export type RiskGrade = "A" | "B" | "C" | "D" | "F";

export interface RiskScore {
  grade: RiskGrade;
  descriptor: string;
}

/**
 * Calculates a risk score (A-F) based on severity counts.
 * 
 * Scoring logic (recalibrated):
 * - A: Zero high/medium issues (clean contract)
 * - B: 1-2 medium issues, no high issues (reasonable contract with minor issues)
 * - C: 1 high issue (with 0-1 medium), or 3 mediums (moderate risk)
 * - D: 2-3 high issues, or 1 high + 2+ mediums (high risk)
 * - F: 4+ high issues, or 3+ highs + any mediums (very high risk)
 */
export function calculateRiskScore(analysis: ContractAnalysis): RiskScore {
  const highCount = analysis.issues.filter((i) => i.severity === "high").length;
  const mediumCount = analysis.issues.filter((i) => i.severity === "medium").length;

  // A: Zero high/medium issues
  if (highCount === 0 && mediumCount === 0) {
    return {
      grade: "A",
      descriptor: "Low risk. Standard terms."
    };
  }

  // B: 1-2 mediums, no high (reasonable contract with minor issues)
  if (highCount === 0 && mediumCount >= 1 && mediumCount <= 2) {
    return {
      grade: "B",
      descriptor: "Low to moderate risk. Some issues worth negotiating, nothing alarming."
    };
  }

  // C: One high (with 0-1 medium), or 3 mediums
  if (highCount === 1 && mediumCount <= 1) {
    return {
      grade: "C",
      descriptor: "Moderate risk. One significant issue requires attention."
    };
  }
  if (highCount === 0 && mediumCount === 3) {
    return {
      grade: "C",
      descriptor: "Moderate risk. Several issues need review."
    };
  }

  // D: 2-3 highs, or 1 high + 2+ mediums, or 4+ mediums
  if (highCount >= 2 && highCount <= 3 && mediumCount === 0) {
    return {
      grade: "D",
      descriptor: "High risk. Multiple significant issues require negotiation."
    };
  }
  if (highCount === 1 && mediumCount >= 2) {
    return {
      grade: "D",
      descriptor: "High risk. Multiple issues require negotiation before signing."
    };
  }
  if (highCount === 2 && mediumCount >= 1) {
    return {
      grade: "D",
      descriptor: "High risk. Multiple significant issues require negotiation."
    };
  }
  if (highCount === 0 && mediumCount >= 4) {
    return {
      grade: "D",
      descriptor: "High risk. Many issues require negotiation before signing."
    };
  }

  // F: 4+ highs, or 3+ highs + any mediums
  if (highCount >= 4) {
    return {
      grade: "F",
      descriptor: "Very high risk. Many critical issues. Do not sign without major revisions."
    };
  }
  if (highCount >= 3 && mediumCount >= 1) {
    return {
      grade: "F",
      descriptor: "Very high risk. Multiple critical issues. Do not sign without major revisions."
    };
  }

  // Default fallback
  return {
    grade: "C",
    descriptor: "Moderate risk. Review recommended."
  };
}

/**
 * Gets the color class for a risk grade
 */
export function getRiskGradeColorClass(grade: RiskGrade): string {
  switch (grade) {
    case "A":
    case "B":
      return "risk-grade--good";
    case "C":
      return "risk-grade--warning";
    case "D":
    case "F":
      return "risk-grade--danger";
    default:
      return "risk-grade--warning";
  }
}
