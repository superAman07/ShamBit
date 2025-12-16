export interface NewsletterSignup {
    id: number;
    email: string;
    status: 'active' | 'unsubscribed';
    source: string;
    metadata?: any;
    subscribed_at: Date;
    unsubscribed_at?: Date;
    created_at: Date;
    updated_at: Date;
}

export interface CreateNewsletterSignupRequest {
    email: string;
    source?: string;
    metadata?: any;
}

export interface NewsletterSignupResponse {
    success: boolean;
    message: string;
    data?: NewsletterSignup;
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