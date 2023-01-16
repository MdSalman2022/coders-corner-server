const express = require('express');
const cors = require('cors');

const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000


app.use(express.json())
app.use(cors())


app.get('/', async (req, res) => {
    res.send('coders-corner portal server is running')
})

// MONGODB  
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cwkrobe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        //for all category and its item
        const blogCollection = client.db('CodersCorner').collection('blogCollection')
        const writerCollection = client.db('CodersCorner').collection('writerCollection')
        const topicCollection = client.db('CodersCorner').collection('topicCollection')


        app.get('/blogs', async (req, res) => {
            const query = {}
            const result = await blogCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/writers', async (req, res) => {
            const query = {}
            const result = await writerCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/writers/:id', async (req, res) => {
            const id = req.params.id
            const query = { writerId: id }
            const result = await writerCollection.findOne(query)
            res.send(result)
        })
        app.get('/topics', async (req, res) => {
            const query = {}
            const result = await topicCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/content/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await blogCollection.findOne(query)
            res.send(result)
        })

        app.post('/insert', async (req, res) => {
            const user = new Date();
            const result = await blogCollection.insertOne({ user })
            res.send(result)
        })

        app.post('/blogs', async (req, res) => {
            const user = req.body;
            const result = await blogCollection.insertOne(user)
            res.send(result)
        })




    } catch (error) {
        console.log(error);
    }
}


run().catch(console.log)





app.listen(port, () => console.log(`coders-corner portal is running on ${port}`))