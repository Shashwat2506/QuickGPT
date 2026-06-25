import axios from "axios";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import imagekit from "../configs/imageKit.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Text-based AI Chat Message Controller
export const textMessageController = async (req, res) => {
    try {
        const userId = req.user._id

        // Check credits
        if (req.user.credits < 1) {
            return res.json({ success: false, message: "You don't have enough credits to use this feature" })
        }

        const { chatId, prompt } = req.body
        const chat = await Chat.findOne({ userId, _id: chatId })

        if (!chat) {
            return res.json({ success: false, message: "Chat not found" })
        }

        chat.messages.push({
            role: "user",
            content: prompt,
            timestamp: Date.now(),
            isImage: false
        })

        await chat.save()
        console.log("Prompt:", prompt)

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        console.log("Gemini Success")

        const reply = {
            role: "assistant",
            content: responseText,
            timestamp: Date.now(),
            isImage: false
        }

        chat.messages.push(reply)
        await chat.save()
        await User.updateOne({ _id: userId }, { $inc: { credits: -1 } })
        res.json({ success: true, reply })

    } catch (error) {
        console.error("GEMINI ERROR:", error.message)
        res.json({ success: false, message: error.message })
    }
}

// Image Generation Message Controller
export const imageMessageController = async (req, res) => {
    try {
        const userId = req.user._id;

        // Check credits
        if (req.user.credits < 2) {
            return res.json({ success: false, message: "You don't have enough credits to use this feature" })
        }

        const { prompt, chatId, isPublished } = req.body
        const chat = await Chat.findOne({ userId, _id: chatId })

        if (!chat) {
            return res.json({ success: false, message: "Chat not found" })
        }

        chat.messages.push({
            role: "user",
            content: prompt,
            timestamp: Date.now(),
            isImage: false
        });

        const encodedPrompt = encodeURIComponent(prompt)
        const generatedImageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT}/ik-genimg-prompt-${encodedPrompt}/quickgpt/${Date.now()}.png?tr=w-800,h-800`;

        const aiImageResponse = await axios.get(generatedImageUrl, { responseType: "arraybuffer" })

        const base64Image = `data:image/png;base64,${Buffer.from(aiImageResponse.data, "binary").toString('base64')}`;

        const uploadResponse = await imagekit.upload({
            file: base64Image,
            fileName: `${Date.now()}.png`,
            folder: "quickgpt"
        })

        const reply = {
            role: 'assistant',
            content: uploadResponse.url,
            timestamp: Date.now(),
            isImage: true,
            isPublished
        }

        chat.messages.push(reply)
        await chat.save()
        await User.updateOne({ _id: userId }, { $inc: { credits: -2 } })
        res.json({ success: true, reply })

    } catch (error) {
        console.error("IMAGE ERROR:", error.message)
        res.json({ success: false, message: error.message });
    }
}