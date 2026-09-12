// src/config/database.js - UPDATED
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.NODE_ENV === 'test' 
      ? process.env.MONGODB_TEST_URI 
      : process.env.MONGODB_URI;

    console.log('🔗 Connecting to MongoDB...');
    console.log('📝 URI:', mongoURI ? mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') : 'Not set');
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      console.log('💡 Add this to your .env file:');
      console.log('MONGODB_URI=mongodb://localhost:27017/collixy');
      return;
    }

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Test the connection
    await mongoose.connection.db.admin().ping();
    console.log('✅ MongoDB connection test successful');
    
    // Handle MongoDB connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('👋 MongoDB connection closed through app termination');
      process.exit(0);
    });
    
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    console.error('🔍 Error details:', error);
    
    if (error.name === 'MongooseServerSelectionError') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Is MongoDB running? Start it with: mongod');
      console.log('2. Check MongoDB service status');
      console.log('3. Try: sudo systemctl start mongod (Linux)');
      console.log('4. Try: brew services start mongodb-community (Mac)');
      console.log('5. Check Windows Services for MongoDB');
    }
    
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;