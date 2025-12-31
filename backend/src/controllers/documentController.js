const Document = require('../models/Document');
const Room = require('../models/Room');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

// @desc    Create a new document
// @route   POST /api/documents
// @access  Private
exports.createDocument = async (req, res, next) => {
  try {
    const { title, language, isPublic, settings } = req.body;
    
    // Generate unique room ID
    const roomId = uuidv4().replace(/-/g, '').substring(0, 12);
    
    const document = await Document.create({
      title: title || 'Untitled Document',
      language: language || 'javascript',
      owner: req.user.id,
      isPublic: isPublic || false,
      roomId,
      collaborators: [{
        user: req.user.id,
        role: 'admin'
      }],
      settings: settings || {}
    });

    // Update user's documents array
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { documents: document._id } }
    );

    res.status(201).json({
      success: true,
      message: 'Document created successfully',
      document
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all user documents with pagination
// @route   GET /api/documents
// @access  Private
exports.getUserDocuments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || '-updatedAt';

    // Build query
    const query = {
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id }
      ]
    };

    // Add search if provided
    if (search) {
      query.$or[0].title = { $regex: search, $options: 'i' };
      query.$or[1].title = { $regex: search, $options: 'i' };
    }

    const documents = await Document.find(query)
      .populate('owner', 'username email avatar')
      .populate('collaborators.user', 'username email avatar')
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    const total = await Document.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      count: documents.length,
      total,
      totalPages,
      currentPage: page,
      documents
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single document with room info
// @route   GET /api/documents/:id
// @access  Private
exports.getDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('owner', 'username email avatar')
      .populate('collaborators.user', 'username email avatar')
      .populate('history.modifiedBy', 'username');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check permissions
    const canAccess = 
      document.owner._id.toString() === req.user.id ||
      document.collaborators.some(c => c.user._id.toString() === req.user.id) ||
      document.isPublic;

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this document'
      });
    }

    // Get room info if exists
    let roomInfo = null;
    if (document.roomId) {
      roomInfo = await Room.findOne({ roomId: document.roomId })
        .populate('activeUsers.userId', 'username avatar');
    }

    res.json({
      success: true,
      document: {
        ...document.toObject(),
        roomInfo
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update document content or metadata
// @route   PUT /api/documents/:id
// @access  Private
exports.updateDocument = async (req, res, next) => {
  try {
    const { content, title, language, settings, isPublic } = req.body;
    
    let document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check permissions
    const isOwner = document.owner.toString() === req.user.id;
    const isAdmin = document.collaborators.some(
      c => c.user.toString() === req.user.id && c.role === 'admin'
    );
    const isEditor = document.collaborators.some(
      c => c.user.toString() === req.user.id && c.role === 'editor'
    );

    // Only owner or admin can change title, settings, or privacy
    if ((title || settings || isPublic !== undefined) && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only owner or admin can update document metadata'
      });
    }

    // Only editors, admins, or owner can edit content
    if (content && !isOwner && !isAdmin && !isEditor) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this document'
      });
    }

    // Update fields
    if (title !== undefined) document.title = title;
    if (language !== undefined) document.language = language;
    if (isPublic !== undefined) document.isPublic = isPublic;
    if (settings !== undefined) {
      document.settings = { ...document.settings, ...settings };
    }

    // Handle content update (will trigger history save in pre-save hook)
    if (content !== undefined) {
      document.content = content;
    }

    await document.save();

    // Update room activity if exists
    if (document.roomId) {
      await Room.findOneAndUpdate(
        { roomId: document.roomId },
        { lastActivity: Date.now() }
      );
    }

    res.json({
      success: true,
      message: 'Document updated successfully',
      document
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check ownership
    if (document.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the owner can delete this document'
      });
    }

    // Remove from user's documents array
    await User.findByIdAndUpdate(
      document.owner,
      { $pull: { documents: document._id } }
    );

    // Delete associated room if exists
    if (document.roomId) {
      await Room.findOneAndDelete({ roomId: document.roomId });
    }

    await document.deleteOne();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add collaborator to document
// @route   POST /api/documents/:id/collaborators
// @access  Private
exports.addCollaborator = async (req, res, next) => {
  try {
    const { userId, role = 'editor' } = req.body;
    
    const document = await Document.findById(req.params.id);
    const userToAdd = await User.findById(userId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check ownership or admin rights
    const isOwner = document.owner.toString() === req.user.id;
    const isAdmin = document.collaborators.some(
      c => c.user.toString() === req.user.id && c.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only owner or admins can add collaborators'
      });
    }

    // Check if user is already a collaborator
    const isAlreadyCollaborator = document.collaborators.some(
      c => c.user.toString() === userId
    );

    if (isAlreadyCollaborator) {
      return res.status(400).json({
        success: false,
        message: 'User is already a collaborator'
      });
    }

    // Cannot add owner as collaborator
    if (userId === document.owner.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Document owner is automatically a collaborator'
      });
    }

    document.collaborators.push({
      user: userId,
      role
    });

    await document.save();

    res.json({
      success: true,
      message: 'Collaborator added successfully',
      collaborator: {
        user: userToAdd,
        role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove collaborator from document
// @route   DELETE /api/documents/:id/collaborators/:userId
// @access  Private
exports.removeCollaborator = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check ownership or admin rights
    const isOwner = document.owner.toString() === req.user.id;
    const isAdmin = document.collaborators.some(
      c => c.user.toString() === req.user.id && c.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only owner or admins can remove collaborators'
      });
    }

    // Cannot remove self if owner
    if (req.params.userId === document.owner.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove document owner'
      });
    }

    // Check if collaborator exists
    const collaboratorIndex = document.collaborators.findIndex(
      c => c.user.toString() === req.params.userId
    );

    if (collaboratorIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Collaborator not found'
      });
    }

    // Remove collaborator
    document.collaborators.splice(collaboratorIndex, 1);
    await document.save();

    res.json({
      success: true,
      message: 'Collaborator removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update collaborator role
// @route   PUT /api/documents/:id/collaborators/:userId
// @access  Private
exports.updateCollaboratorRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    
    if (!['viewer', 'editor', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be viewer, editor, or admin'
      });
    }

    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Only owner can update roles
    if (document.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the owner can update collaborator roles'
      });
    }

    // Cannot update owner's role
    if (req.params.userId === document.owner.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change owner role'
      });
    }

    // Find and update collaborator
    const collaborator = document.collaborators.find(
      c => c.user.toString() === req.params.userId
    );

    if (!collaborator) {
      return res.status(404).json({
        success: false,
        message: 'Collaborator not found'
      });
    }

    collaborator.role = role;
    await document.save();

    res.json({
      success: true,
      message: 'Collaborator role updated successfully',
      collaborator
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get document history
// @route   GET /api/documents/:id/history
// @access  Private
exports.getDocumentHistory = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id)
      .select('history')
      .populate('history.modifiedBy', 'username avatar');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check permissions
    const canAccess = 
      document.owner.toString() === req.user.id ||
      document.collaborators.some(c => c.user.toString() === req.user.id);

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access document history'
      });
    }

    res.json({
      success: true,
      history: document.history.reverse() // Show newest first
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore document to a previous version
// @route   POST /api/documents/:id/restore/:version
// @access  Private
exports.restoreDocumentVersion = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check permissions
    const isOwner = document.owner.toString() === req.user.id;
    const isAdmin = document.collaborators.some(
      c => c.user.toString() === req.user.id && c.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only owner or admins can restore versions'
      });
    }

    const version = parseInt(req.params.version);
    const historyEntry = document.history.find(h => h.version === version);

    if (!historyEntry) {
      return res.status(404).json({
        success: false,
        message: 'Version not found in history'
      });
    }

    // Save current content to history before restoring
    document.history.push({
      content: document.content,
      modifiedBy: req.user.id,
      version: document.version,
      changeType: 'edit'
    });

    // Restore content
    document.content = historyEntry.content;
    document.version += 1;
    document.lastModified = Date.now();

    await document.save();

    res.json({
      success: true,
      message: 'Document restored to previous version',
      document: {
        content: document.content,
        version: document.version,
        lastModified: document.lastModified
      }
    });
  } catch (error) {
    next(error);
  }
};