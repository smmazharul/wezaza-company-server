const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');

require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');



app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wl6clts.mongodb.net/?retryWrites=true&w=majority`;



const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
    try {
        await client.connect();
        const expenseCollection = client.db('wezaza_company').collection('expense');
        const expenseListCollection = client.db('wezaza_company').collection('expenselist');
        const usersCollection = client.db('wezaza_company').collection('users');
        
       
        
        app.get('/expense', async (req, res) => {
            const query = {}
            const cursor = expenseCollection.find(query);
            const expenses = await cursor.toArray();
            res.send(expenses)
        });
         /* 
        * ApI Naming Convention
       *app.get('/expense') get all expense in this collection
       *app.get('/expense:id') get specific expense 
       *app.post('/expense') add a new expense
       *app.patch('/expense/:id') updating one 
       *app.delete('/expense/:id') delete one 
        */
        app.get('/user', verifyJWT, async(req,res)=>{
          const users=await usersCollection.find().toArray();
          res.send(users)
        })

        app.get('/admin/:email', async(req, res) =>{
          const email = req.params.email;
          const user = await usersCollection.findOne({email: email});
          const isAdmin = user.role === 'admin';
          res.send({admin: isAdmin})
        })


        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
          const email = req.params.email;
          const requester = req.decoded.email;
          const requesterAccount = await usersCollection.findOne({ email: requester });
          if (requesterAccount.role === 'admin') {
            const filter = { email: email };
            const updateDoc = {
              $set: { role: 'admin' },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
          }
          else{
            res.status(403).send({message: 'forbidden'});
          }
    
        })

       app.put('/user/:email', async (req, res) => {
        const email = req.params.email;
        const user = req.body;
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
          $set: user,
        };
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
        res.send({ result,token });
      })

      app.get('/expenseall',async(req,res)=>{
        const query = {}
            const cursor = expenseListCollection.find(query);
            const expenseall = await cursor.toArray();
            res.send(expenseall)
      })

     

       app.get('/expenselist', verifyJWT,  async(req, res) =>{
        const email = req.query.empoyeeEmail;
        const decodedEmail=req.decoded.email;
        if (email === decodedEmail) {
          const query = { empoyeeEmail: email };
          const expenselist = await expenseListCollection.find(query).toArray();
          return res.send(expenselist);
        }
        else {
          return res.status(403).send({ message: 'forbidden access' });
        }
      })
      
       app.get('/expenselist/expense', async(req, res) =>{
        const email = req.query.empoyeeEmail;
          const query = { empoyeeEmail: email };
          const expenselist = await expenseListCollection.find(query).toArray();
          return res.send(expenselist);
        
      })



        app.post('/expenselist', async (req, res) => {
            const expenselist = req.body;
            const result = expenseListCollection.insertOne(expenselist);
            res.send(result)
        })

       
    } finally {
        
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Hello from wezaza company!')
})

app.listen(port, () => {
  console.log(`wezaza company listening on port ${port}`)
})