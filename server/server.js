require('dotenv').config();
const app = require('./app');
const port = process.env.PORT || 5000;
const connectDB = require('./config/db')

connectDB();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port,"0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});

