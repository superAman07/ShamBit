import { getDatabase } from '@shambit/database';
import { NewsletterSignup, CreateNewsletterSignupRequest } from '../types/newsletter.types';

export class NewsletterService {
    /**
     * Create a new newsletter signup
     */
    static async createSignup(data: CreateNewsletterSignupRequest): Promise<NewsletterSignup> {
        const db = getDatabase();
        
        // Check if email already exists
        const existingSignup = await db('newsletter_signups')
            .where('email', data.email)
            .first();

        if (existingSignup) {
            // If exists but unsubscribed, reactivate
            if (existingSignup.status === 'unsubscribed') {
                const [updated] = await db('newsletter_signups')
                    .where('email', data.email)
                    .update({
                        status: 'active',
                        subscribed_at: db.fn.now(),
                        unsubscribed_at: null,
                        updated_at: db.fn.now(),
                        source: data.source || 'website',
                        metadata: data.metadata || null
                    })
                    .returning('*');
                return updated;
            } else {
                // Already subscribed
                throw new Error('Email is already subscribed to newsletter');
            }
        }

        // Create new signup
        const [signup] = await db('newsletter_signups')
            .insert({
                email: data.email,
                status: 'active',
                source: data.source || 'website',
                metadata: data.metadata || null,
                subscribed_at: db.fn.now(),
                created_at: db.fn.now(),
                updated_at: db.fn.now()
            })
            .returning('*');

        return signup;
    }

    /**
     * Get all newsletter signups with pagination
     */
    static async getSignups(page: number = 1, limit: number = 50, status?: string): Promise<{
        signups: NewsletterSignup[];
        total: number;
        page: number;
        limit: number;
    }> {
        const db = getDatabase();
        const offset = (page - 1) * limit;
        
        let query = db('newsletter_signups');
        
        if (status) {
            query = query.where('status', status);
        }

        const [signups, totalResult] = await Promise.all([
            query
                .clone()
                .orderBy('created_at', 'desc')
                .limit(limit)
                .offset(offset),
            query.clone().count('* as count').first()
        ]);

        const total = parseInt(totalResult?.count as string) || 0;

        return {
            signups,
            total,
            page,
            limit
        };
    }

    /**
     * Unsubscribe an email
     */
    static async unsubscribe(email: string): Promise<NewsletterSignup> {
        const db = getDatabase();
        
        const [updated] = await db('newsletter_signups')
            .where('email', email)
            .update({
                status: 'unsubscribed',
                unsubscribed_at: db.fn.now(),
                updated_at: db.fn.now()
            })
            .returning('*');

        if (!updated) {
            throw new Error('Email not found in newsletter signups');
        }

        return updated;
    }

    /**
     * Get newsletter statistics
     */
    static async getStats(): Promise<{
        total: number;
        active: number;
        unsubscribed: number;
        todaySignups: number;
        weeklySignups: number;
        monthlySignups: number;
    }> {
        const db = getDatabase();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [
            totalResult,
            activeResult,
            unsubscribedResult,
            todayResult,
            weeklyResult,
            monthlyResult
        ] = await Promise.all([
            db('newsletter_signups').count('* as count').first(),
            db('newsletter_signups').where('status', 'active').count('* as count').first(),
            db('newsletter_signups').where('status', 'unsubscribed').count('* as count').first(),
            db('newsletter_signups').where('created_at', '>=', today).count('* as count').first(),
            db('newsletter_signups').where('created_at', '>=', weekAgo).count('* as count').first(),
            db('newsletter_signups').where('created_at', '>=', monthAgo).count('* as count').first()
        ]);

        return {
            total: parseInt(totalResult?.count as string) || 0,
            active: parseInt(activeResult?.count as string) || 0,
            unsubscribed: parseInt(unsubscribedResult?.count as string) || 0,
            todaySignups: parseInt(todayResult?.count as string) || 0,
            weeklySignups: parseInt(weeklyResult?.count as string) || 0,
            monthlySignups: parseInt(monthlyResult?.count as string) || 0
        };
    }

    /**
     * Delete a newsletter signup (admin only)
     */
    static async deleteSignup(id: number): Promise<void> {
        const db = getDatabase();
        
        const deleted = await db('newsletter_signups')
            .where('id', id)
            .del();

        if (!deleted) {
            throw new Error('Newsletter signup not found');
        }
    }

    /**
     * Get all newsletter signups for export (no pagination)
     */
    static async getAllSignupsForExport(status?: string): Promise<NewsletterSignup[]> {
        const db = getDatabase();
        
        let query = db('newsletter_signups');
        
        if (status) {
            query = query.where('status', status);
        }

        return query.orderBy('created_at', 'desc');
    }
}