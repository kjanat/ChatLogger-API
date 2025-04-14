const mongoose = require('mongoose');

// Global teardown to ensure all connections are closed
module.exports = async () => {
  // Close mongoose connection if it's still open
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    // console.log('MongoDB connection closed by global teardown');
  }
  
  // Handle any other cleanup that might be needed
  // Clear any global timeouts, intervals, or event listeners
  
  // Give time for any remaining connections to properly close
  await new Promise(resolve => setTimeout(resolve, 500));
};
