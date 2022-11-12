import express from 'express'
import cors from 'cors'
import dayjs from 'dayjs'
import dotenv from 'dotenv'
import joi from 'joi'
import { MongoClient, ObjectId} from 'mongodb'

//Validations

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
const participantsCollection = db.collection("participants")
const messagesCollection = db.collection("messages")

//Participants Removal 

setInterval(() => removeInactive(), 15000)

async function removeInactive(){
    const now = Date.now()

    try{
        const deletedOnes = await participantsCollection.find({lastStatus: {$lt: (now -10000)}}).toArray()
        await participantsCollection.deleteMany({lastStatus: {$lt: (now -10000)}})
        const deletedOnesNames = deletedOnes.map(d => d.name)

        if (deletedOnesNames.length === 0){
            const SignOutMessages  = deletedOnesNames.map((e) =>{
                const objectToReturn = {
                    from: e, 
                    to: 'Todos', 
                    text: 'sai da sala...', 
                    type: 'status', 
                    time: dayjs(now).format("HH:mm:ss")
                }
                return objectToReturn
            })
    
            await messagesCollection.insertMany(SignOutMessages)
        }

        return

    }catch(err){
        return
    }
}


//Routes

app.post("/participants", async (req, res)=>{
    const body = req.body

    const validation = participantsSchema.validate(body, {abortEarly: false})

    if(validation.error){
        res.status(409).send("Nome é obrigatório e maior que 3 caracteres")
        return
    }

    try{
        const participants =  await participantsCollection.find(
            {name: body.name.toLowerCase()}
        ).toArray()

        if(participants.length > 0){
            res.status(409).send("Esse nome já está sendo usado")
            return
        }

        await participantsCollection.insertOne({
            name : body.name.toLowerCase(), 
            lastStatus: Date.now()
        })

        await messagesCollection.insertOne({
            from: body.name.toLowerCase(), 
            to: 'Todos', 
            text: 'entra na sala...', 
            type: 'status', 
            time: dayjs(Date.now()).format("HH:mm:ss")
        })

        res.sendStatus(201)
        return
    }catch(err){
        res.status(500).send({message: err.message})
        return
    }
    
})

app.get("/participants", async (req,res)=>{
    try{
        const participants = await participantsCollection.find({}).toArray()

        res.status(200).send(participants)
        return
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
        res.status(422).send(validation.error.details.map(detail => detail.message))
        return
    }

    try{
        const participantExist = await participantsCollection.find({name: user.toLowerCase()}).toArray()

        if(participantExist.length == 0){
            res.status(422).send("O usuário que enviou não está cadastrado.")
            return 
        }

        const participantToReceiveExist = await participantsCollection.find({name: body.to.toLowerCase()}).toArray()

        if(participantToReceiveExist.length == 0){
            res.status(422).send("O usuário para quem enviou não existe")
            return 
        }


        if(body.to.toLowerCase() === user.toLowerCase()){
            res.status(422).send("Não pode enviar mensagens para si mesmo")
            return
        }

        await messagesCollection.insertOne({
           to: body.to,
           from: user,
           text: body.text,
           type: body.type,
           time: dayjs(Date.now()).format("HH:mm:ss")
        })

        res.sendStatus(201)
        return
    }catch(err){
        res.status(500).send({message: err.message})
        return
    }

})

app.get("/messages", async (req,res)=>{
    const {limit} = req.query
    const {user} = req.headers

    if(!user){
        res.sendStatus(401)
        return
    }

    try{
        const messages = await messagesCollection.find(
            { $or: [ { type: "message" }, {type: "status"}, { to: user } , {from: user}] }
        ).toArray()

        if(limit){
            res.status(200).send(messages.slice(-Number(limit)))
            return
        }

        res.status(200).send(messages.slice(-100))
        return

    }catch(err){
        res.status(500).send({message: err.message})
        return
    }
})

app.post("/status", async (req, res)=>{
    const {user} = req.headers

    try{        
        const participantExist = await participantsCollection.find({name: user.toLowerCase()}).toArray()

        if(participantExist.length === 0){
            res.sendStatus(404)
            return
        }
        
        participantsCollection.updateOne(participantExist, {$set: {time: Date.now()}})

        res.sendStatus(200)
        return
    }catch(err){
        res.status(500).send({message: err.message})
        return
    }
})


app.listen(5000)
