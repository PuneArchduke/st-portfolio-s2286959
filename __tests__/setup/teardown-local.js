const mongoose = require('mongoose');

module.exports = async () => {
  if (global.__SERVER__) {
    await new Promise(resolve => global.__SERVER__.close(resolve));
  }
  
  await mongoose.connection.close();
  
  if (global.__MONGOSERVER__) {
    await global.__MONGOSERVER__.stop();
  }
};