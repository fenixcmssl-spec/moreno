import { SaaSPlan, PlanEntitlements } from '@/types';
import { INITIAL_PLANS } from '@/lib/initialData';

export class PlanService {
  private static plans: SaaSPlan[] = [...INITIAL_PLANS];

  static getAll(): SaaSPlan[] {
    return this.plans;
  }

  static getByApplication(applicationId: string): SaaSPlan[] {
    return this.plans.filter(p => p.applicationId === applicationId || !p.applicationId);
  }

  static getById(id: string): SaaSPlan | undefined {
    return this.plans.find(p => p.id === id);
  }

  static create(planData: Omit<SaaSPlan, 'id'>): SaaSPlan {
    const newPlan: SaaSPlan = {
      ...planData,
      id: `plan_${Date.now()}`
    };
    this.plans.push(newPlan);
    return newPlan;
  }

  static update(id: string, updates: Partial<SaaSPlan>): SaaSPlan | null {
    const idx = this.plans.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.plans[idx] = { ...this.plans[idx], ...updates };
    return this.plans[idx];
  }

  static updateEntitlements(id: string, entitlements: PlanEntitlements): SaaSPlan | null {
    const plan = this.getById(id);
    if (!plan) return null;
    plan.entitlements = { ...plan.entitlements, ...entitlements };
    return plan;
  }
}
