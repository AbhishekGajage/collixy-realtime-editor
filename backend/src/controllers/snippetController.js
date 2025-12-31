const Snippet = require('../models/Snippet');

// @desc    Get user snippets
// @route   GET /api/snippets
// @access  Private
exports.getSnippets = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const language = req.query.language || '';
    const sortBy = req.query.sort || 'createdAt';
    const order = req.query.order === 'asc' ? 1 : -1;

    // Build query
    const query = { owner: req.user.id };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    if (language) {
      query.language = language;
    }

    const snippets = await Snippet.find(query)
      .sort({ [sortBy]: order })
      .skip(skip)
      .limit(limit);

    const total = await Snippet.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      count: snippets.length,
      total,
      totalPages,
      currentPage: page,
      snippets
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create snippet
// @route   POST /api/snippets
// @access  Private
exports.createSnippet = async (req, res, next) => {
  try {
    const { title, description, language, code, tags, isPublic } = req.body;

    const snippet = await Snippet.create({
      title,
      description,
      language,
      code,
      tags: tags || [],
      isPublic: isPublic || false,
      owner: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Snippet created successfully',
      snippet
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single snippet
// @route   GET /api/snippets/:id
// @access  Private
exports.getSnippet = async (req, res, next) => {
  try {
    const snippet = await Snippet.findById(req.params.id);

    if (!snippet) {
      return res.status(404).json({
        success: false,
        message: 'Snippet not found'
      });
    }

    // Check permissions
    const canAccess = 
      snippet.owner.toString() === req.user.id ||
      snippet.isPublic;

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this snippet'
      });
    }

    res.json({
      success: true,
      snippet
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update snippet
// @route   PUT /api/snippets/:id
// @access  Private
exports.updateSnippet = async (req, res, next) => {
  try {
    const snippet = await Snippet.findById(req.params.id);

    if (!snippet) {
      return res.status(404).json({
        success: false,
        message: 'Snippet not found'
      });
    }

    // Check ownership
    if (snippet.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this snippet'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        snippet[key] = req.body[key];
      }
    });

    await snippet.save();

    res.json({
      success: true,
      message: 'Snippet updated successfully',
      snippet
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete snippet
// @route   DELETE /api/snippets/:id
// @access  Private
exports.deleteSnippet = async (req, res, next) => {
  try {
    const snippet = await Snippet.findById(req.params.id);

    if (!snippet) {
      return res.status(404).json({
        success: false,
        message: 'Snippet not found'
      });
    }

    // Check ownership
    if (snippet.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this snippet'
      });
    }

    await snippet.deleteOne();

    res.json({
      success: true,
      message: 'Snippet deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public snippets
// @route   GET /api/snippets/public
// @access  Public
exports.getPublicSnippets = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const language = req.query.language || '';

    // Build query
    const query = { isPublic: true };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    if (language) {
      query.language = language;
    }

    const snippets = await Snippet.find(query)
      .populate('owner', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Snippet.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      count: snippets.length,
      total,
      totalPages,
      currentPage: page,
      snippets
    });
  } catch (error) {
    next(error);
  }
};