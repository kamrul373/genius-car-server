const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DBUSER}:${process.env.DBPASS}@cluster0.lbqhd62.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verfiyToekn(req, res, next) {
    const headersAuth = req.headers.authorizationtoken;
    if (!headersAuth) {
        return res.status(401).send("Unauthorized access");
    }
    const token = headersAuth.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (error, decoded) {
        if (error) {
            return res.status(403).send("Unauthorized access");
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        // Token api
        app.post("/jwt", (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN, {
                expiresIn: "1h"
            });

            res.send({ accessToken });
        })


        // DB
        const services = client.db("genius-car").collection("services");
        const orders = client.db("genius-car").collection("orders");
        // getting services
        app.get("/services", async (req, res) => {
            const query = {}
            const cursor = services.find();
            const serviceList = await cursor.toArray();
            res.send(serviceList);
        });
        // getting single service
        app.get("/services/:id", async (req, res) => {
            const serviceId = req.params.id;
            const query = { _id: ObjectId(serviceId) }
            const seelectedService = await services.findOne(query);

            res.send(seelectedService);
        });
        // inserting new order
        app.post("/order", verfiyToekn, async (req, res) => {
            const order = req.body;
            console.log(order);
            const result = await orders.insertOne(order);
            res.send(result);
        })
        // getting order
        app.get("/order", verfiyToekn, async (req, res) => {
            const decoded = req.decoded;

            if (decoded.email !== req.query.email) {
                return res.status(402).send("access denied");
            }

            let query = {}
            if (req.query.email) {
                query = {
                    "customer.email": req.query.email
                }
            }
            //console.log(query);
            const cursor = orders.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });
        // updating order status 
        app.patch("/order/:id", verfiyToekn, async (req, res) => {
            const orderId = req.params.id;
            const status = req.body.status;
            const query = { _id: ObjectId(orderId) }
            const updateDoc = {
                $set: {
                    status: status
                }
            }
            const result = await orders.updateOne(query, updateDoc);

            res.send(result);
        })
        // deleting order 
        app.delete("/order/:id", verfiyToekn, async (req, res) => {
            const orderId = req.params.id;
            const query = { _id: ObjectId(orderId) }
            const result = await orders.deleteOne(query);
            res.send(result);
        })
    } finally {

    }
}

run().catch(error => console.log(error))


app.get("/", (req, res) => {
    res.send("Genius car server is running");
});

app.listen(port, () => {
    console.log("Genius car server running at ", port)
})