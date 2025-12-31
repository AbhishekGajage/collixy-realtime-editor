const mongoose = require('mongoose');

const snippetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  language: {
    type: String,
    required: [true, 'Please select a language'],
    enum: [
      'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
      'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala',
      'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml',
      'markdown', 'sql', 'graphql', 'shell', 'dockerfile', 'makefile'
    ]
  },
  code: {
    type: String,
    required: [true, 'Please add code']
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for search
snippetSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Snippet', snippetSchema);