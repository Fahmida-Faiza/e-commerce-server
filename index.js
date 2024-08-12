const express = require("express");
const cors = require("cors");

const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: ["http://localhost:5173"

    ],
    credentials: true
  })
);
app.use(express.json());


app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uujiemq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});



//////jwt/////////

//midlewares
const logger = (req, res,next) =>{
  console.log('log:info',req.method, req.url);
  next()
}
const verifyToken=(req,res,next)=>{
  const token = req?.cookies?.token;
  // console.log('token in the middleware' , token)
  //token pai nai 
  if(!token){
    return res.status(401).send({message: 'unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(err, decoded)=>{
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next()
  })
  

}




// //////////






















async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carDoctor").collection("services");
    // const bookingCollection = client.db('carDoctor').collection("");
    const cartCollection = client.db("carDoctor").collection("cart");
    ///////////////jwt///////////
    //auth related api token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });
    //logout user axios e

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logges out ", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });
    // //////////////

    //get all data load json mongodb thikh e
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    ///////////////////cart//////////////
    // 1. add to cart
    app.post("/cart", async (req, res) => {
      const newCart = req.body;
      console.log(newCart);

      const result = await cartCollection.insertOne(newCart);
      res.send(result);
    });

    // ////////jwt

    //query(jar data chaitysi) bookings
    app.get("/cart",logger,verifyToken, async (req, res) => {
      console.log(req.query.email);
      // console.log('cook cookies', req.cookies)
      console.log("token owner info", req.user);
      if (req.user.email !== req.query.email) {
        return res.send.status(403).send({ message: "forbidden access" });
      }

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }

      const result = await cartCollection.find(query).toArray();

      res.send(result);
    });

    // /////////

    // 2. show the added product to the cart page
    app.get("/cart", async (req, res) => {
      const cursor = cartCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // 3. cart card delete
    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // /////////////////////////////

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("doctor is running");
});
app.listen(port, () => {
  console.log(`Car doctor server is running port ${port}`);
});
