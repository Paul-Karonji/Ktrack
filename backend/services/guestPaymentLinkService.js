const crypto = require('crypto');
const { pool } = require('../config/database');

class GuestPaymentLinkService {
    getBaseUrl() {
        return (process.env.CLIENT_URL || 'https://ktrack.vercel.app').replace(/\/+$/, '');
    }

    getSecret() {
        if (!process.env.GUEST_PAYMENT_LINK_SECRET) {
            throw new Error('GUEST_PAYMENT_LINK_SECRET is not configured.');
        }

        return process.env.GUEST_PAYMENT_LINK_SECRET;
    }

    safeEqual(left, right) {
        if (typeof left !== 'string' || typeof right !== 'string') return false;
        if (left.length !== right.length) return false;
        return crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
    }

    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    buildToken(linkId) {
        const signature = crypto
            .createHmac('sha256', this.getSecret())
            .update(`guest-payment-link:${linkId}`)
            .digest('hex');

        return `${linkId}.${signature}`;
    }

    getPublicUrl(token) {
        return `${this.getBaseUrl()}/guest/pay/${encodeURIComponent(token)}`;
    }

    getPublicUrlForLink(linkId) {
        const token = this.buildToken(linkId);
        return {
            token,
            publicUrl: this.getPublicUrl(token)
        };
    }

    parseToken(token) {
        if (typeof token !== 'string') return null;
        const [idPart, signature] = token.split('.');
        const id = Number(idPart);

        if (!Number.isInteger(id) || id <= 0 || !signature) {
            return null;
        }

        return { id, signature };
    }

    async findById(id, executor = pool) {
        const [rows] = await executor.execute(
            `SELECT gpl.*,
                    gc.name AS guest_name,
                    gc.email AS guest_email,
                    gc.phone AS guest_phone,
                    gc.upgraded_to_user_id
             FROM guest_payment_links gpl
             INNER JOIN guest_clients gc ON gc.id = gpl.guest_client_id
             WHERE gpl.id = ?
             LIMIT 1`,
            [id]
        );

        return rows[0] || null;
    }

    async findActiveByTarget({ scope, guestClientId, taskId = null }, executor = pool) {
        const [rows] = await executor.execute(
            `SELECT gpl.*,
                    gc.name AS guest_name,
                    gc.email AS guest_email,
                    gc.phone AS guest_phone,
                    gc.upgraded_to_user_id
             FROM guest_payment_links gpl
             INNER JOIN guest_clients gc ON gc.id = gpl.guest_client_id
             WHERE gpl.scope = ?
               AND gpl.guest_client_id = ?
               AND ((? IS NULL AND gpl.task_id IS NULL) OR gpl.task_id = ?)
               AND gpl.status = 'active'
             ORDER BY gpl.id DESC
             LIMIT 1`,
            [scope, guestClientId, taskId, taskId]
        );

        return rows[0] || null;
    }

    async createOrReuseLink({ scope, guestClientId, taskId = null, createdBy = null, executor = pool }) {
        const existing = await this.findActiveByTarget({ scope, guestClientId, taskId }, executor);
        if (existing) {
            const { token, publicUrl } = this.getPublicUrlForLink(existing.id);
            return {
                link: existing,
                token,
                publicUrl,
                reused: true
            };
        }

        const now = new Date();
        const placeholderHash = crypto.randomBytes(32).toString('hex');

        const [result] = await executor.execute(
            `INSERT INTO guest_payment_links
                (scope, guest_client_id, task_id, token_hash, status, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
            [scope, guestClientId, taskId, placeholderHash, createdBy, now, now]
        );

        const token = this.buildToken(result.insertId);
        const tokenHash = this.hashToken(token);

        await executor.execute(
            `UPDATE guest_payment_links
             SET token_hash = ?, updated_at = ?
             WHERE id = ?`,
            [tokenHash, now, result.insertId]
        );

        const link = await this.findById(result.insertId, executor);
        return {
            link,
            token,
            publicUrl: this.getPublicUrl(token),
            reused: false
        };
    }

    async resolveToken(token, executor = pool) {
        const parsed = this.parseToken(token);
        if (!parsed) return null;

        const link = await this.findById(parsed.id, executor);
        if (!link) return null;

        const expectedToken = this.buildToken(link.id);
        if (!this.safeEqual(token, expectedToken)) {
            return null;
        }

        if (!this.safeEqual(link.token_hash || '', this.hashToken(token))) {
            return null;
        }

        return {
            link,
            token,
            publicUrl: this.getPublicUrl(token)
        };
    }

    async touchLink(id, executor = pool) {
        await executor.execute(
            `UPDATE guest_payment_links
             SET last_used_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [id]
        );
    }

    async revokeLink(id, executor = pool) {
        await executor.execute(
            `UPDATE guest_payment_links
             SET status = 'revoked',
                 revoked_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?
               AND status = 'active'`,
            [id]
        );

        return this.findById(id, executor);
    }

    async settleLink(id, executor = pool) {
        await executor.execute(
            `UPDATE guest_payment_links
             SET status = 'settled',
                 settled_at = COALESCE(settled_at, CURRENT_TIMESTAMP),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?
               AND status = 'active'`,
            [id]
        );

        return this.findById(id, executor);
    }
}

module.exports = new GuestPaymentLinkService();
