export interface NewsletterSignup {
    id: number;
    email: string;
    status: 'active' | 'unsubscribed';
    source: string;
    metadata?: any;
    subscribed_at: string;
    unsubscribed_at?: string;
    created_at: string;
    updated_at: string;
}

export interface NewsletterStats {
    total: number;
    active: number;
    unsubscribed: number;
    todaySignups: number;
    weeklySignups: number;
    monthlySignups: number;
}

export interface NewsletterListResponse {
    success: boolean;
    data: {
        signups: NewsletterSignup[];
        total: number;
        page: number;
        limit: number;
    };
}

export interface NewsletterStatsResponse {
    success: boolean;
    data: NewsletterStats;
}