const paginateResults = (model, query, options = {}) => {
    return async (req, res, next) => {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const skip = (page - 1) * limit;

            const results = await model.find(query)
                .sort(options.sort || { createdAt: -1 })
                .limit(limit)
                .skip(skip);

            const total = await model.countDocuments(query);

            req.paginatedResults = {
                results,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                totalItems: total,
            };

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = paginateResults;
