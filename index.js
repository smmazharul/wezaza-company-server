const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;



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
        const landCatagoryCollection = client.db('wezaza_company').collection('landCatagory');
        const expenseListCollection = client.db('wezaza_company').collection('expenselist');
        const depositCollection = client.db('wezaza_company').collection('depositamount');
        const usersCollection = client.db('wezaza_company').collection('users');
        const salesCollections = client.db('wezaza_company').collection('salesCollection');
        const chemicalProductsCollection = client.db('wezaza_company').collection('chemicalProducts');
        
       
        
        app.get('/expense', async (req, res) => {
            const query = {}
            const cursor = expenseCollection.find(query);
            const expenses = await cursor.toArray();
            res.send(expenses)
        });


        app.get('/landCatagory', async (req, res) => {
            const query = {}
            const cursor = landCatagoryCollection.find(query);
            const landCatagory = await cursor.toArray();
            res.send(landCatagory)
        });

         app.get('/landCatagory/:id', async(req, res) =>{
        const id = req.params.id;
          const query = { _id: ObjectId(id)};
          const landCatagory = await landCatagoryCollection.findOne(query);
          return res.send(landCatagory);
        
      })
     
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

        //update user
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

      // update my expense
      app.put('/dashboard/myexpense/:id', async (req, res) => {
        const id = req.params.id;
        const updateExpense = req.body;
        const filter = { _id: ObjectId(id)};
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            itemName: updateExpense.itemName,
            specialNote: updateExpense.specialNote,
            usnitCost: updateExpense.usnitCost,
            quantity: updateExpense.quantity,
          }
        };
        const result = await expenseListCollection.updateOne(filter, updateDoc, options);
        res.send({ result });
      })

      // get all user expense 
      app.get('/expenseall',async(req,res)=>{
        const query = {}
            const cursor = expenseListCollection.find(query);
            const expenseall = await cursor.toArray();
            res.send(expenseall)
      })

      // get all sales details 
      app.get('/sales',async(req,res)=>{
        const query = {}
            const cursor = salesCollections.find(query);
            const allSales = await cursor.toArray();
            res.send(allSales)
      })
      // get all sales details 
      app.get('/chemicalProducts',async(req,res)=>{
        const query = {}
            const cursor = chemicalProductsCollection.find(query);
            const allChemicalProducts = await cursor.toArray();
            res.send(allChemicalProducts)
      })
      app.get('/chemicalProducts/:id', async(req, res) =>{
        const id = req.params.id;
          const query = { _id: ObjectId(id)};
          const chemicalProductslist = await chemicalProductsCollection.findOne(query);
          return res.send(chemicalProductslist);
        
      })


     
    // get user expense list  who has login 
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

      // myexpense delete
      app.delete('/expenselist/:id', async(req, res) =>{
        const id = req.params.id;
        const query = {_id: ObjectId(id)};
        const result = await expenseListCollection.deleteOne(query);
        res.send(result);
    })




      // get user deposit amount who has login 
       app.get('/depositamount', verifyJWT,  async(req, res) =>{
        const email = req.query.empoyeeEmail;
        const decodedEmail=req.decoded.email;
        if (email === decodedEmail) {
          const query = { empoyeeEmail: email };
          const depositamount = await depositCollection.find(query).toArray();
          return res.send(depositamount);
        }
        else {
          return res.status(403).send({ message: 'forbidden access' });
        }
      })
      
      // get specific user expense  data for admin 
       app.get('/expenselist/expense', async(req, res) =>{
        const email = req.query.empoyeeEmail;
          const query = { empoyeeEmail: email };
          const expenselist = await expenseListCollection.find(query).toArray();
          return res.send(expenselist);
        
      })


      // expense post 

        app.post('/expenselist', async (req, res) => {
            const expenselist = req.body;
            const result = expenseListCollection.insertOne(expenselist);
            res.send(result)
        })

        // deposit money post 
        app.post('/depositamount', async (req, res) => {
            const depositamount = req.body;
            const result = depositCollection.insertOne(depositamount);
            res.send(result)
        })
        // chemical Product list  post 
        app.post('/chemicalProducts', async (req, res) => {
            const chemicalProducts = req.body;
            const result = chemicalProductsCollection.insertOne(chemicalProducts);
            res.send(result)
        })

        //  sales money post 
        app.post('/sales', async (req, res) => {
            const sales = req.body;
            const result = salesCollections.insertOne(sales);
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