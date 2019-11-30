const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const userRoutes = require('./src/controllers/user.routes');

app.use('/users', userRoutes);

module.exports = app;