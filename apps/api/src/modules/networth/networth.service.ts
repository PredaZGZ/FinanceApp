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

    async createAsset(data: CreateAssetBody) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Create Asset
            const insertAssetQuery = `
        INSERT INTO networth_assets (name, description, category, "originalCost", "originalCurrency", notes, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `;
            const assetRes = await client.query(insertAssetQuery, [
                data.name,
                data.description || null,
                data.category || null,
                data.originalCost,
                data.originalCurrency,
                data.notes || null
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

    async getAssets(filters: GetAssetsQuery) {
        const { page, limit, sortBy, sortOrder, q, category, isSold, minValue, maxValue } = filters;
        const offset = (page - 1) * limit;

        const queryParams: any[] = [];
        let paramIndex = 1;

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
      WHERE 1=1
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

    async getAssetById(id: string) {
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
      WHERE a.id = $1
    `;
        const result = await pool.query(query, [id]);
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

    async updateAsset(id: string, data: UpdateAssetBody) {
        // Full replacement of asset fields, but keeping history.
        // If user wants to update value, they should use addValuation.
        // Here we update descriptive fields and sold status.
        const query = `
      UPDATE networth_assets
      SET name = $1, description = $2, category = $3, "originalCost" = $4, "originalCurrency" = $5, notes = $6, "isSold" = $7, "soldAt" = $8, "updatedAt" = NOW()
      WHERE id = $9
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
            id
        ];

        const result = await pool.query(query, params);
        return result.rows[0];
    }

    async patchAsset(id: string, data: PatchAssetBody) {
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

        if (updates.length === 0) return this.getAssetById(id);

        updates.push(`"updatedAt" = NOW()`);
        values.push(id);
        const query = `UPDATE networth_assets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    async deleteAsset(id: string) {
        // Hard delete with cascade (defined in migration)
        const query = `DELETE FROM networth_assets WHERE id = $1 RETURNING id`;
        const result = await pool.query(query, [id]);
        return result.rows.length > 0;
    }

    async addValuation(assetId: string, data: CreateValuationBody) {
        // Check if asset exists
        const assetCheck = await pool.query('SELECT "isSold" FROM networth_assets WHERE id = $1', [assetId]);
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

    async getValuations(assetId: string, query: GetValuationsQuery) {
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

    async getSummary() {
        // Current Net Worth: Sum of latest value of UNSOLD assets.
        // If an asset has no valuation, it contributes 0 (or original cost? Prompt says "0 o excluir"). I'll use 0.

        // Complex query to get latest valuation per asset and aggregate
        const query = `
      WITH LatestValuations AS (
        SELECT DISTINCT ON ("assetId") "assetId", value
        FROM networth_asset_valuations
        ORDER BY "assetId", "valuedAt" DESC, "createdAt" DESC
      )
      SELECT
        COALESCE(SUM(v.value), 0) as "totalCurrentNetWorth",
        COUNT(CASE WHEN a."isSold" = FALSE THEN 1 END) as "countActive",
        COUNT(CASE WHEN a."isSold" = TRUE THEN 1 END) as "countSold",
        json_agg(json_build_object(
           'category', a.category, 
           'value', COALESCE(v.value, 0)
        )) as breakdown_data
      FROM networth_assets a
      LEFT JOIN LatestValuations v ON a.id = v."assetId"
      WHERE a."isSold" = FALSE
    `;

        // Breakdown needs to be grouped. The above query aggregates everything, so breakdown_data would be a list of all items. 
        // We want grouped by category.
        // Let's do a separate query or nested structure.

        // Better approach:

        const summaryQuery = `
      WITH LatestValuations AS (
          SELECT DISTINCT ON ("assetId") "assetId", value
          FROM networth_asset_valuations
          ORDER BY "assetId", "valuedAt" DESC, "createdAt" DESC
      )
      SELECT 
          COALESCE(SUM(v.value), 0) as "totalCurrentNetWorth",
          COUNT(*) as "countActive"
      FROM networth_assets a
      LEFT JOIN LatestValuations v ON a.id = v."assetId"
      WHERE a."isSold" = FALSE
    `;

        const countSoldQuery = `SELECT COUNT(*) as "countSold" FROM networth_assets WHERE "isSold" = TRUE`;

        const breakdownQuery = `
      WITH LatestValuations AS (
          SELECT DISTINCT ON ("assetId") "assetId", value
          FROM networth_asset_valuations
          ORDER BY "assetId", "valuedAt" DESC, "createdAt" DESC
      )
      SELECT 
          a.category,
          COALESCE(SUM(v.value), 0) as "totalValue",
          COUNT(*) as count
      FROM networth_assets a
      LEFT JOIN LatestValuations v ON a.id = v."assetId"
      WHERE a."isSold" = FALSE
      GROUP BY a.category
    `;

        const [summaryRes, soldRes, breakdownRes] = await Promise.all([
            pool.query(summaryQuery),
            pool.query(countSoldQuery),
            pool.query(breakdownQuery)
        ]);

        const summary = summaryRes.rows[0];
        const sold = soldRes.rows[0];

        return {
            totalCurrentNetWorth: parseFloat(summary.totalCurrentNetWorth),
            countActive: parseInt(summary.countActive, 10),
            countSold: parseInt(sold.countSold, 10),
            breakdownByCategory: breakdownRes.rows.map(row => ({
                category: row.category || 'Uncategorized',
                totalValue: parseFloat(row.totalValue),
                count: parseInt(row.count, 10)
            }))
        };
    }
}

export const netWorthService = new NetWorthService();
