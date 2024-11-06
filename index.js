const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const app = express();
const port = 4000;

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const corsOptions = {
  origin: '*'
};

// Importing seed functions and routes
const seedUser = require('./seeds/seedUser');
const trustedEntity = require('./seeds/trustedEntity');
const seedOffer = require('./seeds/seedOffer')
const account = require('./routes/accountRoutes');
const transaction = require('./routes/transaction');
const createTLTransfer = require('./routes/createTLTransfer');
const user = require('./routes/user');
const offer = require('./routes/offer');
const admin = require('./routes/admin');
const loan = require('./routes/loan')
const auth = require('./routes/auth')

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const initializeData = async () => {
  try {
    await trustedEntity();
    await delay(2000);
    await seedUser();
    await delay(2000);
    await seedOffer();
  } catch (error) {
    console.error('Error during seeding:', error);
  }
};

initializeData();

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to the platform!');
  console.log(req);
});

app.use('/auth', auth)
app.use('/account', account);
app.use('/transaction', transaction);
app.use('/trustline', createTLTransfer);
app.use('/user', user);
app.use('/offer', offer);
app.use('/admin', admin);
app.use('/loan', loan)

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
