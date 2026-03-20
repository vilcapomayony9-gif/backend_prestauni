import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        //await mongoose.connect("mongodb://localhost:27017/sistemadb");
        await mongoose.connect(process.env.MONGO_URL);
        console.log("CONECTADO A MONGODB");
    } catch (err) {
        console.error("error en conexion", err);
        process.exit(1);
    }
};
