const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

function varifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized Access" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECERET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden" });
    }
    console.log(decoded);

    req.decoded = decoded;
    next();
  });
}

app.get("/", (req, res) => {
  res.send("running tool composer server");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2ojwr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const toolscollection = client.db("toolcomposer").collection("tools");
    const usercollection = client.db("toolcomposer").collection("user");

    app.get("/tools", async (req, res) => {
      const query = {};
      const cursor = toolscollection.find(query);
      const tools = await cursor.toArray();

      res.send(tools);
    });

    app.get("/users", async (req, res) => {
      const query = {};
      const cursor = usercollection.find(query);
      const user = await cursor.toArray();

      console.log(user);
      res.send(user);
    });

    app.get("/tools/:id", varifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const tool = await toolscollection.findOne(query);

      res.send(tool);
    });

    app.get("/users/:email", varifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usercollection.findOne(query);

      res.send(user);
    });

    app.post("/additems", async (req, res) => {
      const doc = req.body;
      const result = await toolscollection.insertOne(doc);
      res.send(result);
    });

    //delete
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usercollection.deleteOne(query);

      app.send(result);
    });
    app.delete("/tools/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await toolscollection.deleteOne(query);

      app.send(result);
    });

    //put method

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usercollection.updateOne(filter, updateDoc, options);

      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECERET,
        {
          expiresIn: "1h",
        }
      );
      res.send({ result, token });
    });
  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log("Listening to port " + port);
});
