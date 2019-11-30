const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const userRoutes = require('./src/controllers/user.routes');
const characterRoutes = require('./src/controllers/character.routes');

app.use('/users', userRoutes);
app.use('/characters', characterRoutes);

module.exports = app;