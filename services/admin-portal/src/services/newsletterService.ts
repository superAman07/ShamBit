import { apiService } from './api';
import { NewsletterListResponse, NewsletterStatsResponse } from '../types/newsletter';

export const newsletterService = {
    /**
     * Get newsletter signups with pagination and filtering
     */
    getSignups: async (params: {
        page?: number;
        limit?: number;
        status?: 'active' | 'unsubscribed';
    } = {}): Promise<NewsletterListResponse> => {
        const searchParams = new URLSearchParams();
        
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.status) searchParams.append('status', params.status);

        const response = await apiService.getAxiosInstance().get(`/newsletter/signups?${searchParams.toString()}`);
        return response.data;
    },

    /**
     * Get newsletter statistics
     */
    getStats: async (): Promise<NewsletterStatsResponse> => {
        const response = await apiService.getAxiosInstance().get('/newsletter/stats');
        return response.data;
    },

    /**
     * Delete a newsletter signup
     */
    deleteSignup: async (id: number): Promise<{ success: boolean; message: string }> => {
        const response = await apiService.getAxiosInstance().delete(`/newsletter/signups/${id}`);
        return response.data;
    },

    /**
     * Export newsletter signups to CSV
     */
    exportSignups: async (status?: 'active' | 'unsubscribed'): Promise<Blob> => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        
        const response = await apiService.getAxiosInstance().get(`/newsletter/export?${params.toString()}`, {
            responseType: 'blob'
        });
        return response.data;
    }
};