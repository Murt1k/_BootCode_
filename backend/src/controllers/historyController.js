const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const createHistoryItem = asyncHandler(async (req, res) => {
  const { queryText, responseText } = req.body;

  const item = await prisma.queryHistory.create({
    data: {
      userId: req.user.id,
      queryText,
      responseText: responseText || null
    }
  });

  res.status(201).json(item);
});

const getHistory = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.queryHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.queryHistory.count({
      where: { userId: req.user.id }
    })
  ]);

  res.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    }
  });
});

const getHistoryItem = asyncHandler(async (req, res) => {
  const item = await prisma.queryHistory.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id
    }
  });

  if (!item) {
    throw new ApiError(404, "History item not found");
  }

  res.json(item);
});

const deleteHistoryItem = asyncHandler(async (req, res) => {
  const item = await prisma.queryHistory.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id
    }
  });

  if (!item) {
    throw new ApiError(404, "History item not found");
  }

  await prisma.queryHistory.delete({ where: { id: item.id } });

  res.status(204).send();
});

module.exports = {
  createHistoryItem,
  getHistory,
  getHistoryItem,
  deleteHistoryItem
};
