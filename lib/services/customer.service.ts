import prisma from '@/lib/prisma';
import crypto from 'crypto';

export interface CustomerDTO {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: Record<string, any> | null;
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  name: string;
  email: string;
  phone?: string;
  address?: Record<string, any>;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string;
  phone?: string | null;
  address?: Record<string, any> | null;
  ordersCountIncrement?: number;
  totalSpentIncrement?: number;
}

export class CustomerService {
  /**
   * CREATE: Create a customer within a tenant
   */
  static async createCustomer(tenantId: string, input: CreateCustomerInput): Promise<CustomerDTO> {
    if (!tenantId) {
      throw new Error('Tenant ID es requerido');
    }
    if (!input.email || !input.email.includes('@')) {
      throw new Error('Email de cliente inválido');
    }
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('El nombre de cliente es obligatorio');
    }

    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();

    // Check if customer already exists for this tenant
    const existing = await (prisma as any).customer.findUnique({
      where: {
        tenantId_email: { tenantId, email }
      }
    });

    if (existing) {
      throw new Error(`Ya existe un cliente registrado con el email ${email} en este comercio`);
    }

    const customerId = `cust_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    const created = await (prisma as any).customer.create({
      data: {
        id: customerId,
        tenantId,
        name,
        email,
        phone: input.phone?.trim() || null,
        address: input.address || null,
        ordersCount: 0,
        totalSpent: 0
      }
    });

    return {
      id: created.id,
      tenantId: created.tenantId,
      name: created.name,
      email: created.email,
      phone: created.phone,
      address: created.address,
      ordersCount: created.ordersCount,
      totalSpent: created.totalSpent,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    };
  }

  /**
   * FIND OR CREATE: Used by checkout flow to link buyer to tenant customer record
   */
  static async findOrCreateCustomer(
    tenantId: string,
    data: {
      name: string;
      email: string;
      phone?: string;
      address?: Record<string, any>;
      incrementSpent?: number;
    }
  ): Promise<CustomerDTO> {
    if (!tenantId || !data.email) {
      throw new Error('Tenant ID y email son obligatorios');
    }

    const email = data.email.trim().toLowerCase();
    const name = data.name.trim() || 'Cliente';
    const spentToAdd = Number(data.incrementSpent) || 0;

    let customer = await (prisma as any).customer.findUnique({
      where: {
        tenantId_email: { tenantId, email }
      }
    });

    if (customer) {
      customer = await (prisma as any).customer.update({
        where: { id: customer.id },
        data: {
          name: name || customer.name,
          phone: data.phone?.trim() || customer.phone,
          address: data.address || customer.address,
          ordersCount: { increment: 1 },
          totalSpent: { increment: spentToAdd }
        }
      });
    } else {
      const customerId = `cust_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      customer = await (prisma as any).customer.create({
        data: {
          id: customerId,
          tenantId,
          name,
          email,
          phone: data.phone?.trim() || null,
          address: data.address || null,
          ordersCount: 1,
          totalSpent: spentToAdd
        }
      });
    }

    return {
      id: customer.id,
      tenantId: customer.tenantId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      ordersCount: customer.ordersCount,
      totalSpent: customer.totalSpent,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString()
    };
  }

  /**
   * READ: Get single customer by ID or Email with strict tenant scoping
   */
  static async getCustomer(tenantId: string, idOrEmail: string): Promise<CustomerDTO | null> {
    if (!tenantId || !idOrEmail) return null;

    const isEmail = idOrEmail.includes('@');
    const customer = await (prisma as any).customer.findFirst({
      where: {
        tenantId,
        ...(isEmail
          ? { email: idOrEmail.trim().toLowerCase() }
          : { id: idOrEmail }
        )
      }
    });

    if (!customer) return null;

    return {
      id: customer.id,
      tenantId: customer.tenantId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      ordersCount: customer.ordersCount,
      totalSpent: customer.totalSpent,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString()
    };
  }

  /**
   * LIST: List customers for a tenant
   */
  static async listCustomers(
    tenantId: string,
    options?: {
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ customers: CustomerDTO[]; total: number }> {
    if (!tenantId) {
      return { customers: [], total: 0 };
    }

    const whereClause: any = { tenantId };

    if (options?.search) {
      const q = options.search.trim().toLowerCase();
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } }
      ];
    }

    const [items, total] = await Promise.all([
      (prisma as any).customer.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 100,
        skip: options?.offset || 0
      }),
      (prisma as any).customer.count({ where: whereClause })
    ]);

    return {
      customers: items.map((c: any) => ({
        id: c.id,
        tenantId: c.tenantId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        ordersCount: c.ordersCount,
        totalSpent: c.totalSpent,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString()
      })),
      total
    };
  }

  /**
   * UPDATE: Update a customer
   */
  static async updateCustomer(
    tenantId: string,
    id: string,
    updates: UpdateCustomerInput
  ): Promise<CustomerDTO> {
    if (!tenantId || !id) {
      throw new Error('Tenant ID e ID de cliente son requeridos');
    }

    const existing = await (prisma as any).customer.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      throw new Error('Cliente no encontrado o no pertenece a este comercio');
    }

    const data: any = {};

    if (updates.name !== undefined) {
      data.name = updates.name.trim();
    }

    if (updates.email !== undefined) {
      const email = updates.email.trim().toLowerCase();
      if (!email.includes('@')) {
        throw new Error('Email inválido');
      }
      const conflict = await (prisma as any).customer.findFirst({
        where: { tenantId, email, id: { not: id } }
      });
      if (conflict) {
        throw new Error(`El email ${email} ya está registrado para otro cliente en esta tienda`);
      }
      data.email = email;
    }

    if (updates.phone !== undefined) {
      data.phone = updates.phone ? updates.phone.trim() : null;
    }

    if (updates.address !== undefined) {
      data.address = updates.address;
    }

    if (updates.ordersCountIncrement) {
      data.ordersCount = { increment: updates.ordersCountIncrement };
    }

    if (updates.totalSpentIncrement) {
      data.totalSpent = { increment: updates.totalSpentIncrement };
    }

    const updated = await (prisma as any).customer.update({
      where: { id },
      data
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      ordersCount: updated.ordersCount,
      totalSpent: updated.totalSpent,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    };
  }
}
