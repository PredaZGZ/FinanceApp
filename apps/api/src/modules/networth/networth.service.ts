import pool from '../../common/db/client';
import type {
    CreateAssetBody,
    UpdateAssetBody,
    PatchAssetBody,
    GetAssetsQuery,
    CreateValuationBody,
    GetValuationsQuery
} from './networth.schema';

export class NetWorthService {

    async createAsset(userId: string, data: CreateAssetBody) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Create Asset
            const insertAssetQuery = `
        INSERT INTO networth_assets (name, description, category, "originalCost", "originalCurrency", notes, "userId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `;
            const assetRes = await client.query(insertAssetQuery, [
                data.name,
                data.description || null,
                data.category || null,
                data.originalCost,
                data.originalCurrency,
                data.notes || null,
                userId
            ]);
            const asset = assetRes.rows[0];

            let latestValuation = null;

            // Create Initial Valuation if provided
            if (data.initialValuationValue !== undefined) {
                const insertValuationQuery = `
          INSERT INTO networth_asset_valuations ("assetId", "valuedAt", value, currency, source)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
                const valuedAt = data.initialValuationDate ? new Date(data.initialValuationDate) : new Date();
                const valRes = await client.query(insertValuationQuery, [
                    asset.id,
                    valuedAt,
                    data.initialValuationValue,
                    data.originalCurrency, // Default to same currency
                    'Initial'
                ]);
                latestValuation = valRes.rows[0];
            }

            await client.query('COMMIT');
            return { ...asset, latestValuation };
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async getAssets(userId: string, filters: GetAssetsQuery) {
        const { page, limit, sortBy, sortOrder, q, category, isSold, minValue, maxValue } = filters;
        const offset = (page - 1) * limit;

        const queryParams: any[] = [userId];
        let paramIndex = 2; // Start from 2, $1 is userId

        // Base query with latest valuation join
        // We use a LATERAL JOIN or Subquery to get the latest valuation
        let query = `
      WITH LatestValuations AS (
        SELECT DISTINCT ON ("assetId") *
        FROM networth_asset_valuations
        ORDER BY "assetId", "valuedAt" DESC, "createdAt" DESC
      )
      SELECT 
        a.*,
        v.value as "currentValue",
        v."valuedAt" as "lastValuationDate",
        v.currency as "valuationCurrency",
        count(*) OVER() as full_count
      FROM networth_assets a
      LEFT JOIN LatestValuations v ON a.id = v."assetId"
      WHERE a."userId" = $1
    `;

        if (q) {
            query += ` AND (a.name ILIKE $${paramIndex} OR a.description ILIKE $${paramIndex})`;
            queryParams.push(`%${q}%`);
            paramIndex++;
        }

        if (category) {
            query += ` AND a.category = $${paramIndex++}`;
            queryParams.push(category);
        }

        if (isSold !== undefined) {
            query += ` AND a."isSold" = $${paramIndex++}`;
            queryParams.push(isSold);
        }

        if (minValue !== undefined) {
            // If no valuation, treat as 0? Or exclude? The prompt says "handle it". I'll assume null checks are needed.
            query += ` AND COALESCE(v.value, 0) >= $${paramIndex++}`;
            queryParams.push(minValue);
        }

        if (maxValue !== undefined) {
            query += ` AND COALESCE(v.value, 0) <= $${paramIndex++}`;
            queryParams.push(maxValue);
        }

        // Sorting
        // Mapping sortBy to actual columns
        let sortColumn = 'a."createdAt"';
        if (sortBy === 'name') sortColumn = 'a.name';
        if (sortBy === 'originalCost') sortColumn = 'a."originalCost"';
        if (sortBy === 'currentValue') sortColumn = 'v.value'; // Sort by joined value
        if (sortBy === 'updatedAt') sortColumn = 'a."updatedAt"';

        // Handle NULLS LAST for currentValue sorting to keep clean results
        query += ` ORDER BY ${sortColumn} ${sortOrder === 'asc' ? 'ASC' : 'DESC'} NULLS LAST LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        queryParams.push(limit, offset);

        const result = await pool.query(query, queryParams);
        const rows = result.rows;
        const totalCount = rows.length > 0 ? parseInt(rows[0].full_count, 10) : 0;

        const assets = rows.map(({ full_count, ...rest }) => ({
            ...rest,
            currentValue: rest.currentValue ? parseFloat(rest.currentValue) : null,
            originalCost: parseFloat(rest.originalCost),
        }));

        return {
            data: assets,
            meta: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    }

    async getAssetById(userId: string, id: string) {
        // Get asset and latest valuation
        const query = `
      SELECT 
        a.*,
        (SELECT row_to_json(v_row) FROM (
           SELECT * FROM networth_asset_valuations 
           WHERE "assetId" = a.id 
           ORDER BY "valuedAt" DESC, "createdAt" DESC 
           LIMIT 1
        ) v_row) as "latestValuation"
      FROM networth_assets a
      WHERE a.id = $1 AND a."userId" = $2
    `;
        const result = await pool.query(query, [id, userId]);
        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            ...row,
            originalCost: parseFloat(row.originalCost),
            latestValuation: row.latestValuation ? {
                ...row.latestValuation,
                value: parseFloat(row.latestValuation.value)
            } : null
        };
    }

    async updateAsset(userId: string, id: string, data: UpdateAssetBody) {
        // Full replacement of asset fields, but keeping history.
        // If user wants to update value, they should use addValuation.
        // Here we update descriptive fields and sold status.
        const query = `
      UPDATE networth_assets
      SET name = $1, description = $2, category = $3, "originalCost" = $4, "originalCurrency" = $5, notes = $6, "isSold" = $7, "soldAt" = $8, "updatedAt" = NOW()
      WHERE id = $9 AND "userId" = $10
      RETURNING *
    `;
        const params = [
            data.name,
            data.description || null,
            data.category || null,
            data.originalCost,
            data.originalCurrency || 'EUR', // Fallback
            data.notes || null,
            data.isSold ?? false,
            data.soldAt || null,
            id,
            userId
        ];

        const result = await pool.query(query, params);
        return result.rows[0];
    }

    async patchAsset(userId: string, id: string, data: PatchAssetBody) {
        // Build dynamic update query
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(data.name); }
        if (data.description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(data.description); }
        if (data.category !== undefined) { updates.push(`category = $${paramIndex++}`); values.push(data.category); }
        if (data.originalCost !== undefined) { updates.push(`"originalCost" = $${paramIndex++}`); values.push(data.originalCost); }
        if (data.originalCurrency !== undefined) { updates.push(`"originalCurrency" = $${paramIndex++}`); values.push(data.originalCurrency); }
        if (data.notes !== undefined) { updates.push(`notes = $${paramIndex++}`); values.push(data.notes); }
        if (data.isSold !== undefined) { updates.push(`"isSold" = $${paramIndex++}`); values.push(data.isSold); }
        if (data.soldAt !== undefined) { updates.push(`"soldAt" = $${paramIndex++}`); values.push(data.soldAt); }

        if (updates.length === 0) return this.getAssetById(userId, id);

        updates.push(`"updatedAt" = NOW()`);

        // Add ID and UserID for WHERE
        values.push(id);
        const idIndex = paramIndex++;
        values.push(userId);
        const userIdIndex = paramIndex++;

        const query = `UPDATE networth_assets SET ${updates.join(', ')} WHERE id = $${idIndex} AND "userId" = $${userIdIndex} RETURNING *`;

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    async deleteAsset(userId: string, id: string) {
        // Hard delete with cascade (defined in migration)
        const query = `DELETE FROM networth_assets WHERE id = $1 AND "userId" = $2 RETURNING id`;
        const result = await pool.query(query, [id, userId]);
        return result.rows.length > 0;
    }

    async addValuation(userId: string, assetId: string, data: CreateValuationBody) {
        // Check if asset exists and belongs to user
        const assetCheck = await pool.query('SELECT "isSold" FROM networth_assets WHERE id = $1 AND "userId" = $2', [assetId, userId]);
        if (assetCheck.rows.length === 0) throw new Error('Asset not found');
        if (assetCheck.rows[0].isSold) throw new Error('Cannot add valuation to a sold asset');

        const query = `
      INSERT INTO networth_asset_valuations ("assetId", "valuedAt", value, currency, source, "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
        const valuedAt = data.valuedAt ? new Date(data.valuedAt) : new Date();
        const result = await pool.query(query, [
            assetId,
            valuedAt,
            data.value,
            data.currency || 'EUR',
            data.source || 'Manual'
        ]);

        return {
            ...result.rows[0],
            value: parseFloat(result.rows[0].value)
        };
    }

    async getValuations(userId: string, assetId: string, query: GetValuationsQuery) {
        // Verify ownership
        const assetCheck = await pool.query('SELECT 1 FROM networth_assets WHERE id = $1 AND "userId" = $2', [assetId, userId]);
        if (assetCheck.rows.length === 0) throw new Error('Asset not found');

        const { page, limit, from, to } = query;
        const offset = (page - 1) * limit;
        const params: any[] = [assetId];
        let paramIndex = 2;
        let sql = `
      SELECT *, count(*) OVER() as full_count 
      FROM networth_asset_valuations 
      WHERE "assetId" = $1
    `;

        if (from) {
            sql += ` AND "valuedAt" >= $${paramIndex++}`;
            params.push(from);
        }
        if (to) {
            sql += ` AND "valuedAt" <= $${paramIndex++}`;
            params.push(to);
        }

        sql += ` ORDER BY "valuedAt" DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await pool.query(sql, params);
        const rows = result.rows;
        const totalCount = rows.length > 0 ? parseInt(rows[0].full_count, 10) : 0;

        const valuations = rows.map(({ full_count, ...rest }) => ({
            ...rest,
            value: parseFloat(rest.value)
        }));

        return {
            data: valuations,
            meta: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        };
    }

    async getSummary(userId: string) {
        // Current Net Worth: Sum of latest value of UNSOLD assets.
        // We filter assets by userId

        const summaryQuery = `
      WITH LatestValuations AS (
          SELECT DISTINCT ON ("assetId") "assetId", value, COALESCE(currency, 'EUR') AS currency
          FROM networth_asset_valuations
          ORDER BY "assetId", "valuedAt" DESC, "createdAt" DESC
      )
      SELECT 
          COALESCE(SUM(v.value) FILTER (WHERE v.currency = 'EUR'), 0) as "totalCurrentNetWorth",
          COUNT(*) as "countActive"
      FROM networth_assets a
      LEFT JOIN LatestValuations v ON a.id = v."assetId"
      WHERE a."isSold" = FALSE AND a."userId" = $1
    `;

        const countSoldQuery = `SELECT COUNT(*) as "countSold" FROM networth_assets WHERE "isSold" = TRUE AND "userId" = $1`;

        const breakdownQuery = `
      WITH LatestValuations AS (
          SELECT DISTINCT ON ("assetId") "assetId", value, COALESCE(currency, 'EUR') AS currency
          FROM networth_asset_valuations
          ORDER BY "assetId", "valuedAt" DESC, "createdAt" DESC
      )
      SELECT 
          a.category,
          v.currency,
          COALESCE(SUM(v.value), 0) as "totalValue",
          COUNT(*) as count
      FROM networth_assets a
      LEFT JOIN LatestValuations v ON a.id = v."assetId"
      WHERE a."isSold" = FALSE AND a."userId" = $1
      GROUP BY a.category, v.currency
    `;

        const totalsByCurrencyQuery = `
          WITH LatestValuations AS (
            SELECT DISTINCT ON ("assetId") "assetId", value, COALESCE(currency, 'EUR') AS currency
            FROM networth_asset_valuations
            ORDER BY "assetId", "valuedAt" DESC, "createdAt" DESC
          )
          SELECT v.currency, COALESCE(SUM(v.value), 0) AS value
          FROM networth_assets a
          JOIN LatestValuations v ON a.id = v."assetId"
          WHERE a."isSold" = FALSE AND a."userId" = $1
          GROUP BY v.currency
        `;

        const [summaryRes, soldRes, breakdownRes, totalsByCurrencyRes] = await Promise.all([
            pool.query(summaryQuery, [userId]),
            pool.query(countSoldQuery, [userId]),
            pool.query(breakdownQuery, [userId]),
            pool.query(totalsByCurrencyQuery, [userId])
        ]);

        const summary = summaryRes.rows[0];
        const sold = soldRes.rows[0];

        return {
            totalCurrentNetWorth: parseFloat(summary.totalCurrentNetWorth),
            countActive: parseInt(summary.countActive, 10),
            countSold: parseInt(sold.countSold, 10),
            currency: 'EUR',
            totalsByCurrency: Object.fromEntries(
                totalsByCurrencyRes.rows.map(row => [row.currency, parseFloat(row.value)])
            ),
            breakdownByCategory: breakdownRes.rows.map(row => ({
                category: row.category || 'Uncategorized',
                currency: row.currency || 'EUR',
                totalValue: parseFloat(row.totalValue),
                count: parseInt(row.count, 10)
            }))
        };
    }
}

export const netWorthService = new NetWorthService();
