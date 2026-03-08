import { calculateRiskScore, getRiskGradeColorClass, type RiskScore as RiskScoreType } from "../utils/riskScore";
import type { ContractAnalysis } from "../analysis/contractAnalyzer";

interface RiskScoreProps {
  analysis: ContractAnalysis;
  label?: string;
}

export function RiskScore({ analysis, label }: RiskScoreProps) {
  const riskScore: RiskScoreType = calculateRiskScore(analysis);
  const colorClass = getRiskGradeColorClass(riskScore.grade);

  return (
    <div className={`risk-score ${colorClass}`}>
      <div className="risk-score-grade">
        <span className="risk-grade-letter">{riskScore.grade}</span>
        {label && <span className="risk-score-label">{label}</span>}
      </div>
      <p className="risk-score-descriptor">{riskScore.descriptor}</p>
    </div>
  );
}
