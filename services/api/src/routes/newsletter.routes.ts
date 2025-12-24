import { Router, Request, Response } from 'express';
import { NewsletterService } from '../services/newsletter.service';
import { validate, sanitizeInput } from '../middleware/validation';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route POST /api/newsletter/signup
 * @desc Subscribe to newsletter
 * @access Public
 */
router.post('/signup', [
    sanitizeInput,
    validate({
        body: [
            { field: 'email', required: true, type: 'email' },
            { field: 'source', type: 'string' },
            { field: 'metadata', type: 'object' }
        ]
    })
], async (req: Request, res: Response) => {
    try {
        const { email, source, metadata } = req.body;
        
        const signup = await NewsletterService.createSignup({
            email,
            source: source || 'website',
            metadata: {
                ...metadata,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                referrer: req.get('Referer')
            }
        });

        res.status(201).json({
            success: true,
            message: 'Successfully subscribed to newsletter!',
            data: {
                id: signup.id,
                email: signup.email,
                subscribed_at: signup.subscribed_at
            }
        });
    } catch (error: any) {
        if (error.message === 'Email is already subscribed to newsletter') {
            return res.status(409).json({
                success: false,
                message: 'This email is already subscribed to our newsletter.'
            });
        }

        console.error('Newsletter signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to subscribe to newsletter. Please try again.'
        });
    }
});

/**
 * @route POST /api/newsletter/unsubscribe
 * @desc Unsubscribe from newsletter
 * @access Public
 */
router.post('/unsubscribe', [
    sanitizeInput,
    validate({
        body: [
            { field: 'email', required: true, type: 'email' }
        ]
    })
], async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        
        await NewsletterService.unsubscribe(email);

        res.json({
            success: true,
            message: 'Successfully unsubscribed from newsletter.'
        });
    } catch (error: any) {
        if (error.message === 'Email not found in newsletter signups') {
            return res.status(404).json({
                success: false,
                message: 'Email not found in our newsletter list.'
            });
        }

        console.error('Newsletter unsubscribe error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unsubscribe. Please try again.'
        });
    }
});

/**
 * @route GET /api/newsletter/signups
 * @desc Get all newsletter signups (Admin only)
 * @access Private/Admin
 */
router.get('/signups', [
    authenticate,
    validate({
        query: [
            { field: 'page', type: 'string' },
            { field: 'limit', type: 'string' },
            { field: 'status', type: 'string', enum: ['active', 'unsubscribed'] }
        ]
    })
], async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
        const status = req.query.status as string;

        const result = await NewsletterService.getSignups(page, limit, status);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Get newsletter signups error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch newsletter signups.'
        });
    }
});

/**
 * @route GET /api/newsletter/stats
 * @desc Get newsletter statistics
 * @access Public (for dashboard display)
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const stats = await NewsletterService.getStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get newsletter stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch newsletter statistics.'
        });
    }
});

/**
 * @route DELETE /api/newsletter/signups/:id
 * @desc Delete a newsletter signup (Admin only)
 * @access Private/Admin
 */
router.delete('/signups/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid signup ID.'
            });
        }

        await NewsletterService.deleteSignup(id);

        res.json({
            success: true,
            message: 'Newsletter signup deleted successfully.'
        });
    } catch (error: any) {
        if (error.message === 'Newsletter signup not found') {
            return res.status(404).json({
                success: false,
                message: 'Newsletter signup not found.'
            });
        }

        console.error('Delete newsletter signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete newsletter signup.'
        });
    }
});

/**
 * @route GET /api/newsletter/export
 * @desc Export newsletter signups to CSV (Admin only)
 * @access Private/Admin
 */
router.get('/export', [
    authenticate,
    validate({
        query: [
            { field: 'status', type: 'string', enum: ['active', 'unsubscribed'] }
        ]
    })
], async (req: Request, res: Response) => {
    try {
        const status = req.query.status as string;
        const signups = await NewsletterService.getAllSignupsForExport(status);

        // Create CSV content
        const csvHeader = 'Email,Status,Source,Subscribed Date,Unsubscribed Date\n';
        const csvRows = signups.map(signup => {
            const subscribedDate = new Date(signup.subscribed_at).toISOString().split('T')[0];
            const unsubscribedDate = signup.unsubscribed_at 
                ? new Date(signup.unsubscribed_at).toISOString().split('T')[0] 
                : '';
            
            return `"${signup.email}","${signup.status}","${signup.source}","${subscribedDate}","${unsubscribedDate}"`;
        }).join('\n');

        const csvContent = csvHeader + csvRows;

        // Set headers for file download
        const filename = `newsletter-signups-${status || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        res.send(csvContent);
    } catch (error) {
        console.error('Export newsletter signups error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export newsletter signups.'
        });
    }
});

export default router;