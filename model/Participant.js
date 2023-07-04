import mongoose from "mongoose"
const { Schema } = mongoose

const ParticipantSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        banner: {
            type: String,
            default: null
        },
        description: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
)

export default mongoose.model('participants', ParticipantSchema)