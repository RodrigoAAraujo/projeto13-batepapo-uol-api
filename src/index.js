import express from 'express'
import cors from 'cors'
import dayjs from 'dayjs'
import dotenv from 'dotenv'
import joi from 'joi'
import { MongoClient, ObjectId} from 'mongodb'

//Valiations

const participantsSchema = joi.object({
    name: joi.string().min(1).required()
})

const messagesSchema = joi.object({
    to: joi.string().min(1).required(),
    text: joi.string().min(5).required(),
    type: joi.alternatives().try(joi.string().equal("message"), joi.string().equal("private_message"))
})

const statusSchema = joi.object({
    User:joi.string().min(3).required()
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

app.post("/participants", async (req, res)=>{
    const body = req.body

    const validation = participantsSchema.validate(body, {abortEarly: false})

    if(validation.error){
        res.status(409).send("Nome é obrigatório e maior que 3 caracteres")
        return
    }

    try{
        const participantsCollection =  await db.collection("participants").find({name: body.name}).toArray()
        if(participantsCollection.length > 0){
            res.status(409).send("Esse nome já está sendo usado")
            return
        }

        await db.collection("participants").insertOne({
            name : body.name, 
            lastStatus: Date.now()
        })

        await db.collection("messages").insertOne({
            from: body.name, 
            to: 'Todos', 
            text: 'entra na sala...', 
            type: 'status', 
            time: dayjs(Date.now()).format("HH:mm:ss")
        })

        res.sendStatus(201)

    }catch(err){
        res.status(500).send({message: err.message})
        return
    }
    
})

app.get("/participants", async (req,res)=>{
    try{
        const participants = await db.collection("participants").find({}).toArray()

        res.status(200).send(participants)

    }catch(err){
        res.status(500).send({message: err.message})
        return
    }
})

app.post("/messages", async (req, res)=>{
    const body = req.body
    const {user} = req.headers

    const validation = messagesSchema.validate(body, {abortEarly: false})

    if(validation.error){
        res.sendStatus(422)
        return
    }

    try{
        const participantExist = await db.collection("participants").find({name: user}).toArray()

        if(participantExist.length == 0){
            res.status(422).send("O usuário que enviou não está cadastrado.")
            return 
        }

        await db.collection("messages").insertOne({
           to: body.to,
           from: user,
           text: body.text,
           type: body.type,
           time: dayjs(Date.now()).format("HH:mm:ss")
        })

        res.sendStatus(201)
    }catch{
        res.status(500).send({message: err.message})
        return
    }

})

app.get("/messages", async (req,res)=>{
    try{
        const messages = await db.collection("messages").find({}).toArray()

        res.status(200).send(messages)
    }catch(err){
        res.status(500).send({message: err.message})
        return
    }
    
})

app.post("/status", (req, res)=>{



})






app.listen(5000)
