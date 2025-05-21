import mongoose from "mongoose";

const courseProgressSchema = new mongoose.Schema({
    userId: {type: String, require: true},
    courseId: {type: String, required: true},
    completed: {type: Boolean, defautl: false},
    lectureCompleted:[]
}, {minimize: false});

export const CourseProgress = mongoose.model('CourseProgress', courseProgressSchema)

