const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors');
const { jwtVerify, createRemoteJWKSet } = require('jose-cjs');
dotenv.config();
const app = express();
const uri = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json())

const PORT = process.env.PORT;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))
const verify = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send('Unauthorized')
    }
    const token = authHeader.split(' ')[1];
    if(!token){
        return res.status(401).send('Unauthorized')
    }
    try {
        const {payload} = await jwtVerify(token, JWKS)
        next()
    } catch (error) {
        res.status(403).json({message: 'Forbidden'})
        return
    }
}

async function run() {
    try {
        // await client.connect();

        const db = client.db("wanderlust");
        const destinationCollection = db.collection('destinations');
        const bookingCollection = db.collection('bookings');

        app.get('/featured', async(req, res) => {
            const result = await destinationCollection.find().limit(4).toArray();
            res.json(result)
        })

        app.post('/add_destination',verify, async (req, res) => {
            const destinationData = req.body;
            const result = await destinationCollection.insertOne(destinationData);
            res.json(result)
        })

        app.get('/destinations', async (req, res) => {
            const destinations = await destinationCollection.find().toArray();
            res.json(destinations);
        })

        app.get('/destinations/:id',verify, async (req, res) => {
            const { id } = req.params;
            const destination = await destinationCollection.findOne({ _id: new ObjectId(id) })
            res.json(destination)
        })


        app.patch('/destinations/:id',verify, async (req, res) => {
            const { id } = req.params;
            const updatedData = req.body;
            const result = await destinationCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            )
            res.status(200).json({ success: true })
        })


        app.delete('/destinations/:id', verify,async (req, res) => {
            const { id } = req.params;
            const result = await destinationCollection.deleteOne({ _id: new ObjectId(id) })
            res.json(result)
        })


        app.post('/booking', verify,async (req, res) => {
            const bookingData = req.body;
            const result = await bookingCollection.insertOne(bookingData);
            res.json(result)
        })


        app.get('/mybooking/:userId', verify,async (req, res) => {
            const { userId } = req.params;
            const result = await bookingCollection.find({ userId: userId }).toArray();
            res.json(result)
        })


        app.delete('/mybooking/:bookingId', verify,async (req, res) => {
            const { bookingId } = req.params;
            const result = await bookingCollection.deleteOne({ _id: new ObjectId(bookingId) });
            res.json(result);
        })


        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Server is running.');
})

app.listen(PORT, () => {
    console.log(`Server is running on PORT: ${PORT}`)
})