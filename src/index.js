import express from 'express'
import cors from 'cors'
import dayjs from 'dayjs'
import dotenv from 'dotenv'
import joi from 'joi'
import { MongoClient, ObjectId} from 'mongodb'

//Valiations

const ParticipantsSchema = joi.object({
    name: joi.string().min(1).required()
})

const messagesSchema = joi.object({
    to: joi.string().min(1).max(50).required(),
    text: joi.string().min(3).required(),
    type: "private_message"
})

const statusSchema = joi.object({
    User:joi.string().min(1).required()
})

//Congig

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db

await mongoClient.connect()
db = mongoClient.db("bate_papo_UOL")

//Routes

app.post("/participants", (req, res)=>{


})

app.get("/participants", (req,res)=>{


})

app.post("/messages", (req, res)=>{


})

app.get("/messages", (req,res)=>{

    
})

app.post("/status", (req, res)=>{



})






app.listen(5000)
