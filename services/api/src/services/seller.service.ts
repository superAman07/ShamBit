import { getDatabase } from '@shambit/database';
import { 
  SellerRegistrationData, 
  Seller, 
  SellerFilters, 
  SellerListResponse, 
  SellerStatistics 
} from '../types/seller.types';

class SellerService {
  /**
   * Register a new seller
   */
  async registerSeller(data: SellerRegistrationData): Promise<{ id: string }> {
    const db = getDatabase();
    const [result] = await db('sellers').insert({
      business_name: data.businessName,
      business_type: data.businessType,
      gstin: data.gstin || null,
      owner_name: data.ownerName,
      phone: data.phone,
      email: data.email,
      city: data.city,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');
    
    return { id: result.id };
  }

  /**
   * Get sellers with filters and pagination
   */
  async getSellers(filters: SellerFilters): Promise<SellerListResponse> {
    const db = getDatabase();
    
    // Build base query for filters
    const buildBaseQuery = () => {
      let baseQuery = db('sellers');
      
      // Apply filters
      if (filters.status) {
        baseQuery = baseQuery.where('status', filters.status);
      }
      
      if (filters.search) {
        baseQuery = baseQuery.where(function(this: any) {
          this.where('business_name', 'ilike', `%${filters.search}%`)
              .orWhere('owner_name', 'ilike', `%${filters.search}%`)
              .orWhere('email', 'ilike', `%${filters.search}%`)
              .orWhere('phone', 'like', `%${filters.search}%`);
        });
      }
      
      return baseQuery;
    };
    
    // Get total count
    const [{ count }] = await buildBaseQuery().count('* as count');
    const total = parseInt(count as string);
    
    // Get paginated results
    const offset = (filters.page - 1) * filters.pageSize;
    const sellers = await buildBaseQuery()
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(filters.pageSize)
      .offset(offset);
    
    return {
      sellers: sellers.map(this.mapSellerFromDb),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.ceil(total / filters.pageSize)
    };
  }

  /**
   * Get seller by ID
   */
  async getSellerById(id: string): Promise<Seller | null> {
    const db = getDatabase();
    const seller = await db('sellers').where('id', id).first();
    
    if (!seller) {
      return null;
    }
    
    return this.mapSellerFromDb(seller);
  }

  /**
   * Update seller status
   */
  async updateSellerStatus(
    id: string, 
    status: 'approved' | 'rejected' | 'suspended', 
    notes?: string
  ): Promise<Seller> {
    const updateData: any = {
      status,
      updated_at: new Date()
    };
    
    if (notes) {
      updateData.verification_notes = notes;
    }
    
    if (status === 'approved') {
      updateData.approved_at = new Date();
    }
    
    const db = getDatabase();
    await db('sellers').where('id', id).update(updateData);
    
    const updatedSeller = await this.getSellerById(id);
    if (!updatedSeller) {
      throw new Error('Seller not found after update');
    }
    
    return updatedSeller;
  }

  /**
   * Get seller statistics
   */
  async getSellerStatistics(): Promise<SellerStatistics> {
    const db = getDatabase();
    // Get total counts by status
    const statusCounts = await db('sellers')
      .select('status')
      .count('* as count')
      .groupBy('status');
    
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      suspended: 0
    };
    
    statusCounts.forEach((row: any) => {
      const count = parseInt(row.count as string);
      stats.total += count;
      stats[row.status as keyof typeof stats] = count;
    });
    
    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [{ count: recentCount }] = await db('sellers')
      .where('created_at', '>=', thirtyDaysAgo)
      .count('* as count');
    
    // Get top cities
    const topCities = await db('sellers')
      .select('city')
      .count('* as count')
      .groupBy('city')
      .orderBy('count', 'desc')
      .limit(10);
    
    // Get business type distribution
    const businessTypeDistribution = await db('sellers')
      .select('business_type as type')
      .count('* as count')
      .groupBy('business_type')
      .orderBy('count', 'desc');
    
    return {
      ...stats,
      recentRegistrations: parseInt(recentCount as string),
      topCities: topCities.map((row: any) => ({
        city: row.city,
        count: parseInt(row.count as string)
      })),
      businessTypeDistribution: businessTypeDistribution.map((row: any) => ({
        type: row.type,
        count: parseInt(row.count as string)
      }))
    };
  }

  /**
   * Map database row to Seller object
   */
  private mapSellerFromDb(row: any): Seller {
    return {
      id: row.id,
      businessName: row.business_name,
      businessType: row.business_type,
      gstin: row.gstin,
      ownerName: row.owner_name,
      phone: row.phone,
      email: row.email,
      city: row.city,
      status: row.status,
      verificationNotes: row.verification_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by
    };
  }
}

export const sellerService = new SellerService();