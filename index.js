const express = require('express');
const cors = require('cors');
const app = express();
 require('dotenv').config()
 const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
 const port = process.env.PORT || 5000;
 


 app.use(cors({
  origin: [
      'http://localhost:5173',
   
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());





 const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
 const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.app0kso.mongodb.net/?retryWrites=true&w=majority`;



 
 // Create a MongoClient with a MongoClientOptions object to set the Stable API version
 const client = new MongoClient(uri, {
   serverApi: {
     version: ServerApiVersion.v1,
     strict: true,
     deprecationErrors: true,
   }
 });


 // middlewares 
const logger = (req, res, next) => {
  console.log('log: info', req.method, req.url);
  next();
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log('token in the middleware', token);
  // no token available 
  if (!token) {
      return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
      }
      req.user = decoded;
      next();
  })
}

 
 async function run() {
   try {
     // Connect the client to the server	(optional starting in v4.7)
     await client.connect();


    const itemCollection = client.db('restaurant').collection('items');
    const itemCartCollection = client.db('restaurant').collection('cart');

            // auth related api
            app.post('/jwt', logger, async (req, res) => {
              const user = req.body;
              console.log('user for token', user);
              const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
  
              res.cookie('token', token, {
                  httpOnly: true,
                  secure: true,
                  sameSite: 'none'
              })
                  .send({ success: true });
          })
  
          app.post('/logout', async (req, res) => {
              const user = req.body;
              console.log('logging out', user);
              res.clearCookie('token', { maxAge: 0 }).send({ success: true })
          })
  

     app.get('/items', async (req, res) =>{

      try {
        const result = await itemCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.send(error.message);
      }
        
     })


     
    // get cart items
    app.get("/itemsCart", logger, verifyToken, async (req, res) => {
      
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: 'forbidden access' })
    }
        // console.log(req.query.email)
        let query = {};
        if(req.query?.email){
            query = {email:req.query.email}
        }
        // console.log(query)
       const result = await itemCartCollection.find(query).toArray();

        res.send(result)
     
    });

    // app.get('/itemsCart/:email', async (req, res) => {
    //   const result = await itemCartCollection.find({
    //     email: req.params.email
    //   }).toArray();
    //   console.log(result)
    //   res.send(result)
    // })

    // get single items
    app.get("/items/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const query = {
          _id: new ObjectId(id),
        };
        const result = await itemCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res.status(400).send("item not found");
      }
    });


    // new item added
    app.post("/items", async (req, res) => {
      const newItems = req.body;
      try {
        const result = await itemCollection.insertOne(newItems);
        res.send(result);
      } catch (error) {
        res.send("items not found");
      }
    });


      // add to cart
      app.post("/itemsCart", async (req, res) => {
        const newItem = req.body;
     
        try {
          const result = await itemCartCollection.insertOne(newItem);
          res.send(result);
        } catch (error) {
          res.send("items not found");
        }
      });



      // update items
      app.put("/items/:id", async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id)};
        const options = { upsert: true };
        const updateItem = req.body;
        const product = {
          $set: {
            food_name: updateItem.food_name,
            price: updateItem.price,
            description: updateItem.description,
            img: updateItem.img,
            category: updateItem.category,
            made_by: updateItem.made_by,
            food_origin: updateItem.food_origin,
            quantity: updateItem.quantity,
                     
          },
          
        };
         
        const result = await itemCollection.updateOne(
          filter,
          product,
          options
        );
        res.send(result);
      });



      // delete a item 
      app.delete("/items/:id", async (req, res) => {
        const id = req.params.id;
        const query = {
          _id: new ObjectId(id),
        };
        try {
          const result = await itemCollection.deleteOne(query);
          res.send(result);
        } catch (error) {
          res.send("items not found");
        }
      });
  
      app.delete("/itemsCart/:id", async (req, res) => {
        const id = req.params.id;
        // console.log(id);
        const query = {_id:new ObjectId(id) };
  
        const result = await itemCartCollection.deleteOne(query);
        // console.log(result);
        res.send(result);
      });
    




     // Send a ping to confirm a successful connection
     await client.db("admin").command({ ping: 1 });
     console.log("Pinged your deployment. You successfully connected to MongoDB!");
   } finally {
     // Ensures that the client will close when you finish/error
    //  await client.close();
   }
 }
 run().catch(console.dir);
 








 app.get('/', (req,res)=>{
    res.send('welcome to server');
 } )



 app.listen(port, ()=>{
    console.log(`listening on ${port}`)
 })