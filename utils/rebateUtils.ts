import { BillData } from '../types';

interface RebateOption {
  name: string;
  amount: string;
  description: string;
  reason: string;
}

// Rebate data from the PDF
const REBATES = {
  // Home Energy Assessments
  inHomeAuditFull: { name: 'In-Home Audit (electric heating and central A/C)', amount: '$350', description: 'Comprehensive energy assessment for homes with electric heating and central A/C' },
  inHomeAuditPartial: { name: 'In-Home Audit (electric heating or central A/C)', amount: '$200', description: 'Energy assessment for homes with either electric heating or central A/C' },
  virtualAudit: { name: 'Virtual Home Energy Assessment', amount: 'Free', description: 'Free virtual assessment with energy savings kit' },
  
  // Insulation and Air Sealing
  atticInsulationElectric: { name: 'Attic Insulation (electric heat)', amount: '$500', description: '75% of cost up to $500 for homes with electric heat' },
  atticInsulationNonElectric: { name: 'Attic Insulation (non-electric heat)', amount: '$200', description: '75% of cost up to $200 for homes with non-electric heat and central A/C' },
  basementInsulationElectric: { name: 'Basement Wall Insulation (electric heat)', amount: '$500', description: '75% of cost up to $500 for homes with electric heat' },
  basementInsulationNonElectric: { name: 'Basement Wall Insulation (non-electric heat)', amount: '$200', description: '75% of cost up to $200 for homes with non-electric heat and central A/C' },
  airSealing: { name: 'Air Sealing', amount: '$200', description: 'Based on air infiltration reduction' },
  
  // Efficient Equipment
  smartThermostatSelf: { name: 'Smart Thermostat (self-installed)', amount: '$50', description: 'ENERGY STAR certified smart thermostat' },
  smartThermostatContractor: { name: 'Smart Thermostat (Trade Ally installed)', amount: '$100', description: 'ENERGY STAR certified, installed by Trade Ally' },
  heatPumpWaterHeater: { name: 'Heat Pump Water Heater', amount: '$400', description: 'UEF ≥ 3.3' },
  airSourceHeatPump1: { name: 'Air-Source Heat Pump (Standard)', amount: '$350', description: 'SEER2 ≥ 15.2, EER2 ≥ 11.7, HSPF2 ≥ 7.8' },
  airSourceHeatPump2: { name: 'Air-Source Heat Pump (Premium)', amount: '$450', description: 'SEER2 ≥ 16.3, EER2 ≥ 12.9, HSPF2 ≥ 8.2' },
  miniSplitHeatPump: { name: 'Mini-Split Heat Pump', amount: '$400', description: 'Per outdoor unit, SEER2 ≥ 15.2' },
  centralAC1: { name: 'Central A/C (Standard)', amount: '$200', description: 'SEER2 ≥ 15.2, EER2 ≥ 12' },
  centralAC2: { name: 'Central A/C (Premium)', amount: '$300', description: 'SEER2 ≥ 16.3, EER2 ≥ 12.9' },
  
  // Appliances
  refrigerator: { name: 'ENERGY STAR Refrigerator', amount: '$50', description: 'ENERGY STAR certified refrigerator' },
  dehumidifier: { name: 'ENERGY STAR Dehumidifier', amount: '$25', description: 'ENERGY STAR certified dehumidifier' },
  roomAC: { name: 'ENERGY STAR Room A/C', amount: '$15', description: 'ENERGY STAR certified room air conditioner' },
};

export const getBestRebate = (data: BillData): RebateOption => {
  const usage = data.monthlyComparison.usageCurrent;
  const tempCurrent = data.monthlyComparison.tempCurrent;
  const amountDue = data.amountDue;
  
  // Analyze usage patterns to recommend best rebate
  // High usage + high temp = cooling issue -> recommend AC/Heat Pump
  // High usage + low temp = heating issue -> recommend Heat Pump/Insulation
  // Moderate usage = recommend smart thermostat or audit
  
  if (usage > 1000 && tempCurrent > 70) {
    // High usage in warm weather - cooling efficiency needed
    return {
      name: REBATES.airSourceHeatPump2.name,
      amount: REBATES.airSourceHeatPump2.amount,
      description: REBATES.airSourceHeatPump2.description,
      reason: 'Your high energy usage during warm months suggests upgrading to a premium heat pump could significantly reduce cooling costs.'
    };
  } else if (usage > 1000 && tempCurrent < 50) {
    // High usage in cold weather - heating efficiency needed
    return {
      name: REBATES.airSourceHeatPump2.name,
      amount: REBATES.airSourceHeatPump2.amount,
      description: REBATES.airSourceHeatPump2.description,
      reason: 'Your high energy usage during cold months suggests a premium heat pump could reduce heating costs while providing efficient cooling in summer.'
    };
  } else if (usage > 800) {
    // Moderate-high usage - recommend comprehensive audit
    return {
      name: REBATES.inHomeAuditFull.name,
      amount: REBATES.inHomeAuditFull.amount,
      description: REBATES.inHomeAuditFull.description,
      reason: 'A comprehensive home energy audit can identify the best opportunities to reduce your energy costs.'
    };
  } else if (amountDue > 150) {
    // High bill amount - recommend smart thermostat
    return {
      name: REBATES.smartThermostatContractor.name,
      amount: REBATES.smartThermostatContractor.amount,
      description: REBATES.smartThermostatContractor.description,
      reason: 'A smart thermostat can help optimize your HVAC usage and reduce costs automatically.'
    };
  } else {
    // Lower usage - recommend virtual audit or smaller upgrades
    return {
      name: REBATES.virtualAudit.name,
      amount: REBATES.virtualAudit.amount,
      description: REBATES.virtualAudit.description,
      reason: 'Start with a free virtual energy assessment to identify personalized savings opportunities.'
    };
  }
};

export const getHouseholdTip = (data: BillData): string => {
  const usage = data.monthlyComparison.usageCurrent;
  const tempCurrent = data.monthlyComparison.tempCurrent;
  const address = data.serviceAddress.toLowerCase();
  
  // Infer household characteristics from usage and location
  let tip = '';
  
  // Check if address suggests older area (common patterns)
  const isLikelyOlderArea = address.includes('street') || address.includes('ave') || 
                           address.includes('old') || address.includes('main');
  
  if (usage > 1000) {
    if (isLikelyOlderArea) {
      tip = 'Older homes often have less insulation and air leaks. Consider an energy audit to identify where you\'re losing energy. Air sealing and insulation upgrades can reduce heating and cooling costs by up to 30%.';
    } else {
      tip = 'Your home may benefit from upgraded insulation and air sealing. These improvements can reduce energy costs year-round by keeping conditioned air inside.';
    }
  } else if (usage > 600) {
    tip = 'For moderate energy usage, focus on sealing drafts around windows and doors. Weatherstripping and caulking are cost-effective ways to improve efficiency.';
  } else {
    tip = 'Your home appears to be relatively energy-efficient. Maintain this by scheduling regular HVAC maintenance and replacing air filters monthly.';
  }
  
  // Add seasonal advice
  if (tempCurrent > 70) {
    tip += ' During summer, use window coverings to block direct sunlight and reduce cooling needs.';
  } else if (tempCurrent < 50) {
    tip += ' During winter, ensure your heating system is properly maintained and consider a programmable thermostat to optimize usage.';
  }
  
  return tip;
};

