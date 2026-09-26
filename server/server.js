require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const authRoutes = require('./routes/auth.routes')
const connectDB = require('./config/db')

connectDB();
app.use(express.json())


app.get('/', (req, res) => {
  res.send('Hello World!');
});


app.use('/api/auths', authRoutes);


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

