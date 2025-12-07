import { apiService } from './api';
import { SalesReport, RevenueReport, TopProductsReport, ReportFilters } from '@/types/reports';

class ReportsService {
  private readonly BASE_URL = '/admin/reports';

  async getSalesReport(filters: ReportFilters): Promise<SalesReport> {
    return apiService.get<SalesReport>(`${this.BASE_URL}/sales`, filters);
  }

  async getRevenueReport(filters: ReportFilters): Promise<RevenueReport> {
    return apiService.get<RevenueReport>(`${this.BASE_URL}/revenue`, filters);
  }

  async getTopProductsReport(filters: ReportFilters): Promise<TopProductsReport> {
    return apiService.get<TopProductsReport>(`${this.BASE_URL}/products`, filters);
  }

  async exportSalesReportCSV(filters: ReportFilters): Promise<Blob> {
    const response = await apiService.getAxiosInstance().get(
      `${this.BASE_URL}/sales/export`,
      {
        params: filters,
        responseType: 'blob',
      }
    );
    return response.data;
  }

  async exportRevenueReportCSV(filters: ReportFilters): Promise<Blob> {
    const response = await apiService.getAxiosInstance().get(
      `${this.BASE_URL}/revenue/export`,
      {
        params: filters,
        responseType: 'blob',
      }
    );
    return response.data;
  }

  async exportProductsReportCSV(filters: ReportFilters): Promise<Blob> {
    const response = await apiService.getAxiosInstance().get(
      `${this.BASE_URL}/products/export`,
      {
        params: filters,
        responseType: 'blob',
      }
    );
    return response.data;
  }
}

export const reportsService = new ReportsService();
