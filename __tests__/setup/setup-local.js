const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const axios = require('axios');

let mongoServer;
let server;

module.exports = async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect mongoose
  await mongoose.connect(mongoUri);
  
  // Start the Express server
  process.env.DB_ENDPOINT = mongoUri;
  process.env.PORT = 3000;
  process.env.BASE_URL = 'http://localhost';
  process.env.API_SECRET = 'ThisIsAnAPISecret';
  
  const express = require('express');
  const app = express();
  app.use(express.json());
  
  require('../../endpoints/users')(app);
  require('../../endpoints/orders')(app);
  
  app.get("/", async (req, res) => {
    try{
      return res.status(200).json({"message": "OK"});
    } catch(err) {
      console.log(err);
      return res.status(400).json({"message": "Bad Request."});
    }
  });
  
  server = app.listen(3000);
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Register test users
  const { prepare } = require('./test-helper');
  
  await axios.post(prepare("/register"), {
    "name": "Admin",
    "role": "Admin",
    "email": "test@test.com",
    "password": "12345",
    "address": "Somewhere 10"
  });
  
  await axios.post(prepare("/register"), {
    "name": "Admin2",
    "role": "Admin",
    "email": "test2@test.com",
    "password": "12345",
    "address": "Somewhere 10"
  });
  
  await axios.post(prepare("/register"), {
    "name": "User",
    "role": "User",
    "email": "testuser@test.com",
    "password": "12345",
    "address": "Somewhere 10"
  });
  
  await axios.post(prepare("/register"), {
    "name": "User ToDelete",
    "role": "User",
    "email": "testusertodelete@test.com",
    "password": "12345",
    "address": "Somewhere 10"
  });
  
  global.__MONGOSERVER__ = mongoServer;
  global.__SERVER__ = server;
};