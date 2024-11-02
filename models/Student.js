const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    rollNo: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phone: {
        type: String,
        required: true,
    },
    semester: {
        type: Number,
        required: true,
    },
    branch: {
        type: String,
        required: true,
    },
    enrolledCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    creditLimit: {
        type: Number,
        default: 25,
    }
});

module.exports = mongoose.model('Student', studentSchema);
