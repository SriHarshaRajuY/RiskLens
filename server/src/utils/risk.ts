import { clamp, maxDrawdown, mean, percentile, round, standardDeviation } from "./math.js";

export type RiskMetrics = {
  dailyReturns: number[];
  volatility: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  valueAtRisk95: number;
  concentrationRisk: number;
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High";
};

export function calculateDailyReturns(values: number[]): number[] {
  const returns: number[] = [];
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1] ?? 0;
    const current = values[index] ?? 0;
    returns.push(previous === 0 ? 0 : (current - previous) / previous);
  }
  return returns;
}

export function calculateRiskMetrics(values: number[], allocationPercents: number[], riskFreeRate = 0): RiskMetrics {
  const dailyReturns = calculateDailyReturns(values);
  const dailyVolatility = standardDeviation(dailyReturns);
  const annualizedVolatility = dailyVolatility * Math.sqrt(252);
  const avgReturn = mean(dailyReturns);
  const sharpeRatio = dailyVolatility === 0 ? 0 : (avgReturn - riskFreeRate / 252) / dailyVolatility;
  const drawdown = maxDrawdown(values);
  const var95 = Math.abs(Math.min(percentile(dailyReturns, 5), 0));
  const concentrationRisk = Math.max(...allocationPercents, 0) / 100;
  const riskScore = calculateRiskScore({
    annualizedVolatility,
    maxDrawdown: drawdown,
    valueAtRisk95: var95,
    concentrationRisk
  });

  return {
    dailyReturns: dailyReturns.map((value) => round(value, 6)),
    volatility: round(dailyVolatility, 6),
    annualizedVolatility: round(annualizedVolatility, 6),
    sharpeRatio: round(sharpeRatio, 4),
    maxDrawdown: round(drawdown, 6),
    valueAtRisk95: round(var95, 6),
    concentrationRisk: round(concentrationRisk, 6),
    riskScore,
    riskLevel: riskScore <= 30 ? "Low" : riskScore <= 60 ? "Medium" : "High"
  };
}

export function calculateRiskScore(input: {
  annualizedVolatility: number;
  maxDrawdown: number;
  valueAtRisk95: number;
  concentrationRisk: number;
}): number {
  const volatilityScore = clamp(input.annualizedVolatility / 0.45, 0, 1);
  const drawdownScore = clamp(input.maxDrawdown / 0.35, 0, 1);
  const concentrationScore = clamp(input.concentrationRisk / 0.6, 0, 1);
  const varScore = clamp(input.valueAtRisk95 / 0.08, 0, 1);

  return round(
    30 * volatilityScore +
      30 * drawdownScore +
      20 * concentrationScore +
      20 * varScore,
    0
  );
}
